import { ExcitementTier } from '../types';

export interface RivalryDef {
  teams: [string, string];
  label: string;
  boost: number;
}

export const NOTABLE_RIVALRIES: RivalryDef[] = [
  // College Football & Basketball
  { teams: ['ohio state', 'michigan'], label: '⚔️ The Game', boost: 25 },
  { teams: ['alabama', 'auburn'], label: '⚔️ Iron Bowl', boost: 25 },
  { teams: ['texas', 'oklahoma'], label: '⚔️ Red River Rivalry', boost: 25 },
  { teams: ['army', 'navy'], label: '⚔️ Army-Navy Game', boost: 25 },
  { teams: ['usc', 'ucla'], label: '⚔️ Battle for LA', boost: 20 },
  {
    teams: ['florida', 'georgia'],
    label: "⚔️ World's Largest Outdoor Cocktail Party",
    boost: 20,
  },
  {
    teams: ['duke', 'north carolina'],
    label: '⚔️ Tobacco Road Rivalry',
    boost: 25,
  },
  {
    teams: ['alabama', 'tennessee'],
    label: '⚔️ Third Saturday in October',
    boost: 20,
  },
  { teams: ['notre dame', 'usc'], label: '⚔️ Jeweled Shillelagh', boost: 20 },
  { teams: ['oregon', 'washington'], label: '⚔️ PNW Rivalry', boost: 18 },
  { teams: ['indiana', 'purdue'], label: '⚔️ Old Oaken Bucket', boost: 18 },
  // NFL
  {
    teams: ['packers', 'bears'],
    label: '⚔️ Historic NFC North Rivalry',
    boost: 18,
  },
  { teams: ['cowboys', 'eagles'], label: '⚔️ NFC East Clash', boost: 18 },
  { teams: ['ravens', 'steelers'], label: '⚔️ AFC North Battle', boost: 18 },
  { teams: ['chiefs', 'bills'], label: '🔥 Modern AFC Showdown', boost: 20 },
  { teams: ['49ers', 'seahawks'], label: '⚔️ NFC West Rivalry', boost: 16 },
  { teams: ['patriots', 'jets'], label: '⚔️ AFC East Rivalry', boost: 16 },
  // NBA
  {
    teams: ['celtics', 'lakers'],
    label: '⚔️ Historic NBA Finals Rivalry',
    boost: 22,
  },
  { teams: ['warriors', 'lakers'], label: '🌟 California Star Clash', boost: 18 },
  {
    teams: ['knicks', 'celtics'],
    label: '⚔️ Atlantic Division Rivalry',
    boost: 16,
  },
  {
    teams: ['bucks', '76ers'],
    label: '⚔️ Eastern Conference Clash',
    boost: 15,
  },
  { teams: ['heat', 'knicks'], label: '⚔️ 90s Eastern Rivalry', boost: 15 },
  // Soccer
  { teams: ['real madrid', 'barcelona'], label: '🔥 El Clásico', boost: 28 },
  { teams: ['arsenal', 'tottenham'], label: '⚔️ North London Derby', boost: 25 },
  {
    teams: ['manchester united', 'manchester city'],
    label: '⚔️ Manchester Derby',
    boost: 25,
  },
  {
    teams: ['liverpool', 'manchester united'],
    label: '⚔️ Northwest Derby',
    boost: 25,
  },
  {
    teams: ['liverpool', 'manchester city'],
    label: '🏆 Title Showdown',
    boost: 22,
  },
  { teams: ['chelsea', 'arsenal'], label: '⚔️ London Derby', boost: 20 },
  // NHL
  {
    teams: ['maple leafs', 'canadiens'],
    label: '⚔️ Historic Canadian Rivalry',
    boost: 20,
  },
  { teams: ['rangers', 'islanders'], label: '⚔️ Battle of New York', boost: 18 },
  { teams: ['bruins', 'canadiens'], label: '⚔️ Original Six Classic', boost: 20 },
  {
    teams: ['penguins', 'capitals'],
    label: '⚔️ Crosby vs Ovechkin Classic',
    boost: 18,
  },
  { teams: ['oilers', 'flames'], label: '⚔️ Battle of Alberta', boost: 20 },
];

export function checkRivalry(
  teamA: string,
  teamB: string,
): { isRivalry: boolean; label?: string; boost: number } {
  const normA = (teamA || '').toLowerCase();
  const normB = (teamB || '').toLowerCase();
  for (const r of NOTABLE_RIVALRIES) {
    const [t1, t2] = r.teams;
    if (
      (normA.includes(t1) && normB.includes(t2)) ||
      (normA.includes(t2) && normB.includes(t1))
    ) {
      return { isRivalry: true, label: r.label, boost: r.boost };
    }
  }
  return { isRivalry: false, boost: 0 };
}

export function parseWinPct(
  recordSummary?: string,
): { wins: number; losses: number; winPct: number } | null {
  if (!recordSummary) return null;
  const parts = recordSummary.split('-').map(Number);
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const wins = parts[0];
    const losses = parts[1];
    const total = wins + losses;
    if (total > 0) {
      return { wins, losses, winPct: wins / total };
    }
  }
  return null;
}

export interface ExcitementCalculationResult {
  score: number;
  tier: ExcitementTier;
  highlightTags: string[];
  broadcastSummary: string;
  isRivalry: boolean;
  spreadValue?: number;
}

/**
 * Pure calculation module computing the 0-100 Excitement Index and highlight tags.
 */
export function calculateGameExcitement(
  competition: any,
  sport: string,
  league: string,
): ExcitementCalculationResult {
  const leagueLower = (league || '').toLowerCase();
  const sportLower = (sport || '').toLowerCase();

  const isCollege =
    leagueLower.includes('ncaa') ||
    sportLower === 'college-football' ||
    leagueLower === 'mens-college-basketball';
  let score = isCollege ? 30 : 35; // base score
  const highlightTags: string[] = [];

  const competitors = competition?.competitors || [];
  const homeComp =
    competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
  const awayComp =
    competitors.find((c: any) => c.homeAway === 'away') || competitors[1];

  const homeName = homeComp?.team?.displayName || homeComp?.team?.name || '';
  const awayName = awayComp?.team?.displayName || awayComp?.team?.name || '';

  // 1. College Rankings (AP Top 25 / CFP)
  const homeRank = homeComp?.curatedRank?.current;
  const awayRank = awayComp?.curatedRank?.current;
  const isHomeRanked =
    typeof homeRank === 'number' && homeRank >= 1 && homeRank <= 25;
  const isAwayRanked =
    typeof awayRank === 'number' && awayRank >= 1 && awayRank <= 25;

  if (isHomeRanked && isAwayRanked) {
    const minRank = Math.min(homeRank, awayRank);
    const maxRank = Math.max(homeRank, awayRank);
    if (maxRank <= 5) {
      score += 54;
      highlightTags.push(`🔥 #${minRank} vs #${maxRank} Top 5 Showdown`);
    } else if (maxRank <= 10) {
      score += 44;
      highlightTags.push(`🔥 #${minRank} vs #${maxRank} Top 10 Clash`);
    } else {
      score += 34;
      highlightTags.push(`⚔️ #${minRank} vs #${maxRank} Ranked Matchup`);
    }
  } else if (isHomeRanked || isAwayRanked) {
    const rank = (isHomeRanked ? homeRank : awayRank)!;
    if (rank <= 10) {
      score += 16;
      highlightTags.push(`🌟 Top 10: #${rank}`);
    } else {
      score += 10;
      highlightTags.push(`Ranked #${rank}`);
    }
  }

  // 2. Broadcast extraction & National TV boost
  const rawBroadcasts = [
    ...(competition?.broadcasts || []),
    ...(competition?.geoBroadcasts || []),
  ];
  const channelNames: string[] = [];
  for (const b of rawBroadcasts) {
    const names = Array.isArray(b.names)
      ? b.names
      : b.name
        ? [b.name]
        : b.media?.shortName
          ? [b.media.shortName]
          : [];
    for (const n of names) {
      if (typeof n === 'string' && !channelNames.includes(n)) {
        channelNames.push(n);
      }
    }
  }

  const broadcastSummary = channelNames.slice(0, 2).join(', ');
  const upperChannels = channelNames.map((c) => c.toUpperCase());
  const isMajorNational = upperChannels.some((c) =>
    ['ABC', 'ESPN', 'FOX', 'CBS', 'NBC', 'TNT'].includes(c),
  );
  const isStreamingNational = upperChannels.some((c) =>
    [
      'PRIME VIDEO',
      'PEACOCK',
      'USA NET',
      'NFL NET',
      'FS1',
      'TBS',
      'DISNEY+',
      'MAX',
    ].includes(c),
  );

  if (isMajorNational) {
    score += 18;
    highlightTags.push(`📺 ${channelNames[0]} National TV`);
  } else if (isStreamingNational) {
    score += 12;
    highlightTags.push(`📺 ${channelNames[0]}`);
  } else if (channelNames.length > 0) {
    score += 6;
  }

  // 3. Point Spread & Competitiveness
  let spreadValue: number | undefined;
  const oddsObj = competition?.odds?.[0];
  const spreadDetails = oddsObj?.details; // e.g. "OSU -3.5" or "EVEN"
  if (typeof spreadDetails === 'string') {
    if (
      spreadDetails.toUpperCase() === 'EVEN' ||
      spreadDetails.toUpperCase() === 'PK'
    ) {
      spreadValue = 0;
      score += 18;
      highlightTags.push("⚡ Pick'em Tossup");
    } else {
      const match = spreadDetails.match(/[-+]?([0-9]*\.[0-9]+|[0-9]+)/);
      if (match) {
        spreadValue = Math.abs(parseFloat(match[0]));
        if (spreadValue <= 2.5) {
          score += 18;
          highlightTags.push(`⚡ Nailbiter (Spread: ${spreadValue} pts)`);
        } else if (spreadValue <= 4.5) {
          score += 14;
          highlightTags.push(`⚡ Tight Spread (${spreadValue} pts)`);
        } else if (spreadValue <= 7.0) {
          score += 8;
          highlightTags.push('🎯 1-Score Spread');
        }
      }
    }
  }

  // 4. Team Records & Win % (Pro leagues & general performance)
  const homeStats = parseWinPct(homeComp?.records?.[0]?.summary);
  const awayStats = parseWinPct(awayComp?.records?.[0]?.summary);
  if (
    homeStats &&
    awayStats &&
    homeStats.wins + homeStats.losses >= 3 &&
    awayStats.wins + awayStats.losses >= 3
  ) {
    if (homeStats.winPct >= 0.7 && awayStats.winPct >= 0.7) {
      score += 20;
      highlightTags.push(
        `🏆 Heavyweight Clash (${homeComp.records[0].summary} vs ${awayComp.records[0].summary})`,
      );
    } else if (homeStats.winPct >= 0.6 && awayStats.winPct >= 0.6) {
      score += 14;
      highlightTags.push('📈 Top Record Clash');
    }
  }

  // 5. Rivalry & Derby Detection
  const rivalry = checkRivalry(homeName, awayName);
  let isRivalry = rivalry.isRivalry;
  if (rivalry.isRivalry && rivalry.label) {
    score += rivalry.boost;
    highlightTags.unshift(rivalry.label); // Place rivalry tag first
  } else {
    // Check competition notes for tournament or rivalry keywords
    const notesText = (
      competition?.notes?.map((n: any) => n.headline) || []
    )
      .join(' ')
      .toLowerCase();
    if (
      notesText.includes('rivalry') ||
      notesText.includes('derby') ||
      notesText.includes('championship')
    ) {
      score += 15;
      isRivalry = true;
      highlightTags.unshift('⚔️ Rivalry Match');
    }
  }

  const finalScore = Math.max(25, Math.min(100, Math.round(score)));
  let tier: ExcitementTier = 'standard';
  if (finalScore >= 88) tier = 'ultra';
  else if (finalScore >= 76) tier = 'high';
  else if (finalScore >= 65) tier = 'featured';

  return {
    score: finalScore,
    tier,
    highlightTags: highlightTags.slice(0, 3),
    broadcastSummary,
    isRivalry,
    spreadValue,
  };
}
