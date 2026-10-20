import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { Resend } from 'resend';
import { render } from '@react-email/components';
import { addDays, format } from 'date-fns';
import { getSupabaseAdminClient, isBackendConfigured } from '../lib/supabaseClient';
import { getUserSchedule } from '../lib/schedule/userSchedule';
import { InMemorySubscriptionAdapter } from '../lib/storage/subscriptionRepository';
import { DigestEmail } from '../emails/DigestEmail';

const isDryRun = process.argv.includes('--dry-run');

export async function runSportsDigestWorker() {
  console.log('='.repeat(60));
  console.log(
    `Starting Sports Digest Worker [Mode: ${isDryRun ? 'DRY RUN' : 'PRODUCTION'}]`,
  );
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail =
    process.env.RESEND_FROM_EMAIL ||
    'Sports Digest <digest@updates.sportsdigest.app>';

  // 1. Discover all active users with subscriptions or profiles
  console.log(
    '\n[Step 1] Querying active subscribers from Supabase...',
  );
  let userList: Array<{ id: string; email: string }> = [];

  if (isBackendConfigured() && !isDryRun) {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email');

      if (error) {
        console.warn('Supabase query error:', error.message);
      } else if (data) {
        userList = data.filter((u) => u.email);
      }
    } catch (err: any) {
      console.error('Supabase configuration error:', err.message);
    }
  }

  let demoAdapter: InMemorySubscriptionAdapter | undefined;

  if (userList.length === 0) {
    if (isDryRun || !isBackendConfigured()) {
      console.log(
        'ℹ️ Using sample dry-run subscriber data for demonstration.',
      );
      userList = [{ id: 'demo_user', email: 'fan@example.com' }];
      demoAdapter = new InMemorySubscriptionAdapter({
        profiles: [
          {
            id: 'demo_user',
            email: 'fan@example.com',
            timezone: 'America/New_York',
          },
        ],
        teams: [
          {
            userId: 'demo_user',
            team: {
              id: 'espn:football:nfl:12',
              name: 'Kansas City Chiefs',
              sport: 'football',
              league: 'NFL',
              logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png',
            },
          },
        ],
      });
    } else {
      console.log('No subscribers found. Exiting worker.');
      return;
    }
  }

  console.log(`Found ${userList.length} user(s) to process.`);

  // 2. Fetch schedule and compile email templates per user via deep UserSchedule module
  console.log(
    '\n[Step 2] Processing user schedules and compiling email templates...',
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

  for (const user of userList) {
    try {
      const schedule = await getUserSchedule(user.id, { daysAhead: 7 }, demoAdapter);

      // Render React Email template to HTML
      const emailElement = DigestEmail({
        userEmail: user.email,
        userTimezone: schedule.userTimezone,
        startDate: startDateStr,
        endDate: endDateStr,
        groupedFixtures: schedule.fixturesByDate,
        dashboardUrl: process.env.NEXT_PUBLIC_APP_URL
          ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
          : 'http://localhost:3000/dashboard',
      });

      const emailHtml = await render(emailElement);
      const matchCount = schedule.fixtures.length;
      const subject = `Your Sports Digest: ${matchCount} game${matchCount === 1 ? '' : 's'} this week (${startDateStr} - ${endDateStr})`;

      emailPayloads.push({
        from: resendFromEmail,
        to: user.email,
        subject,
        html: emailHtml,
      });

      console.log(
        ` -> Prepared digest for ${user.email} (${schedule.userTimezone}): ${matchCount} match(es) across ${schedule.followedTeams.length} team(s)`,
      );
    } catch (err) {
      console.error(`Error compiling digest for user ${user.id}:`, err);
    }
  }

  // 3. Dispatch batch via Resend
  console.log(
    `\n[Step 3] Dispatching ${emailPayloads.length} digest email(s)...`,
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
const isCli = process.argv.some((arg) => arg.includes('digest-worker'));
console.log('Worker loaded, isCli:', isCli);
if (isCli) {
  console.log('Triggering runSportsDigestWorker...');
  runSportsDigestWorker()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal worker error:', err);
      process.exit(1);
    });
}
