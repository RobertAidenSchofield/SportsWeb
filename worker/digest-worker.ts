import * as dotenv from 'dotenv';
dotenv.config();

import { Resend } from 'resend';
import { render } from '@react-email/components';
import { formatInTimeZone } from 'date-fns-tz';
import { addDays, format } from 'date-fns';
import { getSupabaseAdminClient } from '../lib/supabaseClient';
import { getUpcomingTeamFixtures } from '../lib/sportsApi';
import { MatchFixture, UserProfile } from '../lib/types';
import { DigestEmail } from '../emails/DigestEmail';

interface UserWithSubscriptions extends UserProfile {
  team_ids: string[];
}

const isDryRun = process.argv.includes('--dry-run');

export async function runSportsDigestWorker() {
  console.log('='.repeat(60));
  console.log(
    `Starting Sports Digest Worker [Mode: ${isDryRun ? 'DRY RUN' : 'PRODUCTION'}]`,
  );
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  let subscriptions: any[] | null = null;
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail =
    process.env.RESEND_FROM_EMAIL ||
    'Sports Digest <digest@updates.sportsdigest.app>';

  // 1. Query all subscriptions and distinct teams
  console.log(
    '\n[Step 1] Querying active subscriptions and users from Supabase...',
  );
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('user_id, team_id, profiles(id, email, timezone)');

    if (error) {
      console.warn('Supabase query error:', error.message);
    } else {
      subscriptions = data;
    }
  } catch (err: any) {
    if (isDryRun) {
      console.log(
        'ℹ️ Supabase not yet configured. Using sample dry-run subscriber data for demonstration.',
      );
      subscriptions = [
        {
          user_id: 'user_sample_1',
          team_id: 'espn:football:nfl:12', // Kansas City Chiefs
          profiles: {
            id: 'user_sample_1',
            email: 'fan@example.com',
            timezone: 'America/New_York',
          },
        },
      ];
    } else {
      console.error('Supabase configuration error:', err.message);
      return;
    }
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('No user subscriptions found. Exiting worker.');
    return;
  }

  // Extract unique team IDs
  const uniqueTeamIds = Array.from(
    new Set(subscriptions.map((s: any) => s.team_id)),
  );
  console.log(
    `Found ${subscriptions.length} active subscription(s) across ${uniqueTeamIds.length} unique team(s).`,
  );

  // Build map of user -> subscribed team IDs
  const usersMap = new Map<string, UserWithSubscriptions>();
  for (const row of subscriptions) {
    const profile = (row as any).profiles;
    if (!profile || !profile.email) continue;

    if (!usersMap.has(profile.id)) {
      usersMap.set(profile.id, {
        id: profile.id,
        email: profile.email,
        timezone: profile.timezone || 'America/New_York',
        team_ids: [],
      });
    }
    usersMap.get(profile.id)!.team_ids.push(row.team_id);
  }

  console.log(`Aggregating digest for ${usersMap.size} unique user(s).`);

  // 2. Fetch upcoming fixtures for all unique teams (next 7 days)
  console.log(
    '\n[Step 2] Fetching upcoming 7-day fixtures for unique teams from sports API...',
  );
  const teamFixturesMap = new Map<string, MatchFixture[]>();

  for (const teamId of uniqueTeamIds) {
    try {
      const fixtures = await getUpcomingTeamFixtures(teamId, 7);
      teamFixturesMap.set(teamId, fixtures);
      console.log(
        ` - Team ${teamId}: found ${fixtures.length} upcoming fixture(s)`,
      );
    } catch (err) {
      console.error(`Error fetching fixtures for ${teamId}:`, err);
      teamFixturesMap.set(teamId, []);
    }
  }

  // 3. For each user, map their subscribed teams to fixtures and group by local date
  console.log(
    '\n[Step 3] Processing schedules and compiling email templates per user...',
  );
  const emailPayloads: Array<{
    from: string;
    to: string;
    subject: string;
    html: string;
  }> = [];

  const now = new Date();
  const weekAhead = addDays(now, 7);
  const startDateStr = format(now, 'MMM d');
  const endDateStr = format(weekAhead, 'MMM d, yyyy');

  for (const user of usersMap.values()) {
    const userFixtures: MatchFixture[] = [];

    // Collect fixtures for this user's teams
    for (const teamId of user.team_ids) {
      const fixtures = teamFixturesMap.get(teamId) || [];
      userFixtures.push(...fixtures);
    }

    // Deduplicate any matches where both teams are followed by the user
    const seenEventIds = new Set<string>();
    const distinctFixtures = userFixtures.filter((f) => {
      if (seenEventIds.has(f.id)) return false;
      seenEventIds.add(f.id);
      return true;
    });

    // Sort by UTC kickoff
    distinctFixtures.sort(
      (a, b) => new Date(a.dateUtc).getTime() - new Date(b.dateUtc).getTime(),
    );

    // Group fixtures by local date in user's timezone
    const groupedFixtures: Record<string, MatchFixture[]> = {};
    for (const fixture of distinctFixtures) {
      try {
        const dateKey = formatInTimeZone(
          new Date(fixture.dateUtc),
          user.timezone,
          'EEEE, MMMM d',
        );
        if (!groupedFixtures[dateKey]) {
          groupedFixtures[dateKey] = [];
        }
        groupedFixtures[dateKey].push(fixture);
      } catch (e) {
        const fallback = 'Upcoming Matches';
        if (!groupedFixtures[fallback]) groupedFixtures[fallback] = [];
        groupedFixtures[fallback].push(fixture);
      }
    }

    // Render React Email template to HTML
    const emailElement = DigestEmail({
      userEmail: user.email,
      userTimezone: user.timezone,
      startDate: startDateStr,
      endDate: endDateStr,
      groupedFixtures,
      dashboardUrl: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
        : 'http://localhost:3000/dashboard',
    });

    const emailHtml = await render(emailElement);

    const gameCount = distinctFixtures.length;
    const subject = `Your Sports Digest: ${gameCount} game${gameCount === 1 ? '' : 's'} this week (${startDateStr} - ${endDateStr})`;

    emailPayloads.push({
      from: resendFromEmail,
      to: user.email,
      subject,
      html: emailHtml,
    });

    console.log(
      ` -> Prepared digest for ${user.email} (${user.timezone}): ${gameCount} match(es) across ${user.team_ids.length} team(s)`,
    );
  }

  // 4. Dispatch batch via Resend
  console.log(
    `\n[Step 4] Dispatching ${emailPayloads.length} digest email(s)...`,
  );

  if (isDryRun || !resendApiKey) {
    if (!resendApiKey) {
      console.warn(
        '⚠️ RESEND_API_KEY is not set. Skipping real email dispatch.',
      );
    }
    console.log(
      `✓ Dry run complete. Successfully built ${emailPayloads.length} digest payload(s).`,
    );
    return;
  }

  const resend = new Resend(resendApiKey);

  // Resend batch endpoint accepts up to 100 emails at a time
  const BATCH_SIZE = 100;
  for (let i = 0; i < emailPayloads.length; i += BATCH_SIZE) {
    const batch = emailPayloads.slice(i, i + BATCH_SIZE);
    try {
      console.log(
        `Sending batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} recipients)...`,
      );
      const { data, error } = await resend.batch.send(batch);
      if (error) {
        console.error('Error sending batch via Resend:', error);
      } else {
        console.log(`✓ Successfully sent batch. Response:`, data);
      }
    } catch (err) {
      console.error('Failed to send Resend batch:', err);
    }
  }

  console.log('\nSports Digest Worker finished successfully.');
}

// Auto-run when invoked via CLI
if (require.main === module || process.argv[1]?.includes('digest-worker')) {
  runSportsDigestWorker()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal worker error:', err);
      process.exit(1);
    });
}

