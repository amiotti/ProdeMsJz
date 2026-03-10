import type { Group, Match, ProdeDB } from '@/lib/types';
import { WORLD_CUP_2026_GROUPS, applyOfficialFixtureToGroupMatches, buildKnockoutMatches } from '@/lib/worldcup26';

const PAIRINGS_BY_MATCHDAY: Array<Array<[number, number]>> = [
  [
    [0, 1],
    [2, 3],
  ],
  [
    [0, 2],
    [1, 3],
  ],
  [
    [0, 3],
    [1, 2],
  ],
];

function generateGroupMatches(group: Group): Match[] {
  const matches: Match[] = [];
  let sequence = 1;

  PAIRINGS_BY_MATCHDAY.forEach((round, roundIndex) => {
    round.forEach(([homeIdx, awayIdx]) => {
      matches.push({
        id: `${group.id}-M${roundIndex + 1}-${sequence}`,
        groupId: group.id,
        matchday: roundIndex + 1,
        homeTeam: group.teams[homeIdx],
        awayTeam: group.teams[awayIdx],
        kickoffAt: new Date(Date.UTC(2026, 5, 11, 16, 0, 0)).toISOString(),
        officialResult: null,
      });
      sequence += 1;
    });
  });

  return matches;
}

export function createSeedDb(): ProdeDB {
  const now = new Date().toISOString();

  const groups = WORLD_CUP_2026_GROUPS;
  const groupMatches = applyOfficialFixtureToGroupMatches(groups.flatMap((group) => generateGroupMatches(group)));
  const matches = [...groupMatches, ...buildKnockoutMatches()];

  return {
    version: 4,
    pointsConfig: {
      exactScore: 20,
      correctOutcome: 10,
    },
    groups,
    matches,
    users: [],
    predictions: [],
    updatedAt: now,
  };
}
