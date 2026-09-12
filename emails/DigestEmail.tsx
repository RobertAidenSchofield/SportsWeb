import * as React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Row,
  Column,
  Heading,
  Text,
  Link,
  Hr,
  Img,
} from '@react-email/components';
import { MatchFixture } from '../lib/types';

interface DigestEmailProps {
  userEmail: string;
  userTimezone: string;
  startDate: string;
  endDate: string;
  groupedFixtures: Record<string, MatchFixture[]>;
  dashboardUrl?: string;
}

export const DigestEmail = ({
  userEmail = 'fan@example.com',
  userTimezone = 'America/New_York',
  startDate = 'This Week',
  endDate = '',
  groupedFixtures = {},
  dashboardUrl = 'https://sportsdigest.app/dashboard',
}: DigestEmailProps) => {
  const dates = Object.keys(groupedFixtures);
  const totalGames = Object.values(groupedFixtures).reduce(
    (acc, list) => acc + list.length,
    0,
  );

  return (
    <Html>
      <Head />
      <Preview>{`Your Weekly Sports Schedule (${totalGames} games)`}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerSection}>
            <Text style={logoText}>🏆 SPORTS DIGEST</Text>
            <Heading style={mainHeading}>Your Upcoming Week in Sports</Heading>
            <Text style={subHeading}>
              {startDate} {endDate ? `– ${endDate}` : ''} • All times in{' '}
              {userTimezone}
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Matches by Day */}
          {dates.length === 0 ? (
            <Section style={emptySection}>
              <Text style={emptyText}>
                None of your followed teams have games scheduled for the
                upcoming 7 days.
              </Text>
              <Link href={dashboardUrl} style={button}>
                Follow More Teams
              </Link>
            </Section>
          ) : (
            dates.map((dateKey) => {
              const matches = groupedFixtures[dateKey] || [];
              return (
                <Section key={dateKey} style={dateGroupSection}>
                  <Text style={dateHeader}>🗓 {dateKey.toUpperCase()}</Text>

                  {matches.map((match) => (
                    <Section
                      key={`${match.id}-${match.teamId}`}
                      style={matchCard}
                    >
                      <Row>
                        {/* Match Details */}
                        <Column
                          style={{ width: '65%', verticalAlign: 'middle' }}
                        >
                          <Text style={matchTitle}>
                            {match.teamName}{' '}
                            <span style={{ color: '#9ca3af', fontWeight: 400 }}>
                              {match.isHome ? 'vs' : '@'}
                            </span>{' '}
                            {match.opponentName}
                          </Text>
                          <Text style={matchMeta}>
                            <span style={leagueBadge}>{match.league}</span>
                            {match.venue && ` • ${match.venue}`}
                          </Text>
                        </Column>

                        {/* Kickoff & Broadcast */}
                        <Column
                          style={{
                            width: '35%',
                            textAlign: 'right',
                            verticalAlign: 'middle',
                          }}
                        >
                          <Text style={timeText}>
                            {new Date(match.dateUtc).toLocaleTimeString(
                              'en-US',
                              {
                                hour: 'numeric',
                                minute: '2-digit',
                                timeZone: userTimezone,
                              },
                            )}
                          </Text>
                          {match.broadcast && (
                            <Text style={broadcastBadge}>
                              📺 {match.broadcast}
                            </Text>
                          )}
                        </Column>
                      </Row>
                    </Section>
                  ))}
                </Section>
              );
            })
          )}

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              Sent to <span style={{ color: '#d1d5db' }}>{userEmail}</span>{' '}
              because you subscribed to Sports Digest.
            </Text>
            <Text style={footerText}>
              <Link href={dashboardUrl} style={footerLink}>
                Manage Subscriptions
              </Link>{' '}
              •{' '}
              <Link href={`${dashboardUrl}#timezone`} style={footerLink}>
                Update Timezone
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default DigestEmail;

// Inline CSS Styles for Email Clients
const main: React.CSSProperties = {
  backgroundColor: '#090d16',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  margin: '0',
  padding: '24px 0',
  color: '#ffffff',
};

const container: React.CSSProperties = {
  backgroundColor: '#111827',
  borderRadius: '12px',
  border: '1px solid #1f293d',
  maxWidth: '600px',
  margin: '0 auto',
  padding: '32px 24px',
};

const headerSection: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '20px',
};

const logoText: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '800',
  letterSpacing: '1.5px',
  color: '#10b981',
  margin: '0 0 8px 0',
};

const mainHeading: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#ffffff',
  margin: '0 0 8px 0',
};

const subHeading: React.CSSProperties = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
};

const divider: React.CSSProperties = {
  borderColor: '#1f293d',
  margin: '24px 0',
};

const dateGroupSection: React.CSSProperties = {
  marginBottom: '20px',
};

const dateHeader: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: '700',
  letterSpacing: '0.8px',
  color: '#10b981',
  margin: '0 0 10px 0',
};

const matchCard: React.CSSProperties = {
  backgroundColor: '#1a2234',
  border: '1px solid #28354d',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '8px',
};

const matchTitle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#ffffff',
  margin: '0 0 4px 0',
};

const matchMeta: React.CSSProperties = {
  fontSize: '11px',
  color: '#9ca3af',
  margin: '0',
};

const leagueBadge: React.CSSProperties = {
  color: '#a7f3d0',
  fontWeight: '600',
};

const timeText: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '700',
  color: '#ffffff',
  margin: '0 0 4px 0',
};

const broadcastBadge: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#e5e7eb',
  margin: '0',
};

const emptySection: React.CSSProperties = {
  textAlign: 'center',
  padding: '24px 0',
};

const emptyText: React.CSSProperties = {
  fontSize: '14px',
  color: '#9ca3af',
  marginBottom: '16px',
};

const button: React.CSSProperties = {
  backgroundColor: '#10b981',
  color: '#090d16',
  borderRadius: '6px',
  padding: '10px 20px',
  fontWeight: '700',
  fontSize: '13px',
  textDecoration: 'none',
  display: 'inline-block',
};

const footerSection: React.CSSProperties = {
  textAlign: 'center',
  marginTop: '20px',
};

const footerText: React.CSSProperties = {
  fontSize: '11px',
  color: '#6b7280',
  margin: '4px 0',
};

const footerLink: React.CSSProperties = {
  color: '#10b981',
  textDecoration: 'underline',
};

