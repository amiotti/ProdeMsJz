import { formatDateArgentinaShort } from '@/lib/datetime';
import { calculatePredictionPoints } from '@/lib/prode';
import type { Prediction, ProdeDB, StateResponse } from '@/lib/types';

type ExactBucket = { exacts: number; evals: number };

export type StatsAnalyticsSnapshot = {
  predictionsByGroup: Array<{ groupId: string; groupName: string; count: number }>;
  officialOutcome: { local: number; empate: number; visitante: number };
  goalsHistogram: Record<'0' | '1' | '2' | '3' | '4+', number>;
  totalOfficialGoals: number;
  avgGoals: number;
  scoredPredictions: number;
  exactHits: number;
  outcomeHits: number;
  misses: number;
  exactsByUser: Map<string, ExactBucket>;
  predictionPatternFrequency: Map<string, number>;
  nextMatchId: string | null;
  nextMatchDist: { home: number; draw: number; away: number };
  cumulativeLabels: string[];
  cumulativeByUser: Map<string, number[]>;
};

type StatsCacheEntry = {
  key: string;
  expiresAt: number;
  value: StatsAnalyticsSnapshot;
};

let statsCache: StatsCacheEntry | null = null;

const STATS_CACHE_TTL_MS = 20_000;

function cacheKey(state: StateResponse) {
  return [
    state.summary.users,
    state.summary.predictions,
    state.summary.matchesWithOfficialResult,
    state.db.matches.length,
  ].join('|');
}


function scoreOutcome(pred: { homeGoals: number; awayGoals: number }) {
  if (pred.homeGoals > pred.awayGoals) return 'home' as const;
  if (pred.homeGoals < pred.awayGoals) return 'away' as const;
  return 'draw' as const;
}

export function getStatsAnalytics(state: StateResponse): StatsAnalyticsSnapshot {
  const now = Date.now();
  const key = cacheKey(state);
  if (statsCache && statsCache.key === key && statsCache.expiresAt > now) {
    return statsCache.value;
  }

  const matchById = new Map(state.db.matches.map((m) => [m.id, m] as const));
  const predictionsByGroupMap = new Map<string, number>();
  const officialOutcome = { local: 0, empate: 0, visitante: 0 };
  const goalsHistogram: Record<'0' | '1' | '2' | '3' | '4+', number> = { '0': 0, '1': 0, '2': 0, '3': 0, '4+': 0 };
  const exactsByUser = new Map<string, ExactBucket>();
  const predictionPatternFrequency = new Map<string, number>();
  let totalOfficialGoals = 0;
  let officialCount = 0;
  let scoredPredictions = 0;
  let exactHits = 0;
  let outcomeHits = 0;
  let misses = 0;

  for (const row of state.leaderboard) {
    exactsByUser.set(row.userId, { exacts: 0, evals: 0 });
  }

  for (const match of state.db.matches) {
    if (!match.officialResult) continue;
    officialCount += 1;
    const total = match.officialResult.home + match.officialResult.away;
    totalOfficialGoals += total;
    if (match.officialResult.home > match.officialResult.away) officialOutcome.local += 1;
    else if (match.officialResult.home < match.officialResult.away) officialOutcome.visitante += 1;
    else officialOutcome.empate += 1;
    if (total >= 4) goalsHistogram['4+'] += 1;
    else goalsHistogram[String(total) as '0' | '1' | '2' | '3'] += 1;
  }

  const predsByMatch = new Map<string, Prediction[]>();
  for (const p of state.db.predictions) {
    const patternKey = `${p.matchId}|${p.homeGoals}|${p.awayGoals}`;
    predictionPatternFrequency.set(patternKey, (predictionPatternFrequency.get(patternKey) ?? 0) + 1);

    const match = matchById.get(p.matchId);
    if (match) {
      predictionsByGroupMap.set(match.groupId, (predictionsByGroupMap.get(match.groupId) ?? 0) + 1);
    }

    if (!predsByMatch.has(p.matchId)) predsByMatch.set(p.matchId, []);
    predsByMatch.get(p.matchId)!.push(p);

    if (!match?.officialResult) continue;
    const pts = calculatePredictionPoints(p, match.officialResult, state.db.pointsConfig);
    scoredPredictions += 1;
    if (pts.exactHit) exactHits += 1;
    else if (pts.outcomeHit) outcomeHits += 1;
    else misses += 1;

    const bucket = exactsByUser.get(p.userId);
    if (bucket) {
      bucket.evals += 1;
      if (pts.exactHit) bucket.exacts += 1;
    }
  }

  const nowMs = Date.now();
  const nextMatch = [...state.db.matches]
    .filter((m) => new Date(m.kickoffAt).getTime() > nowMs)
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())[0];

  const nextMatchDist = { home: 0, draw: 0, away: 0 };
  if (nextMatch) {
    for (const p of predsByMatch.get(nextMatch.id) ?? []) {
      const out = scoreOutcome(p);
      if (out === 'home') nextMatchDist.home += 1;
      else if (out === 'away') nextMatchDist.away += 1;
      else nextMatchDist.draw += 1;
    }
  }

  const scoredMatches = [...state.db.matches]
    .filter((m) => m.officialResult)
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
  const cumulativeByUser = new Map<string, number[]>();
  const running = new Map<string, number>();
  for (const u of state.db.users) {
    if (u.role === 'admin') continue;
    cumulativeByUser.set(u.id, []);
    running.set(u.id, 0);
  }
  for (const match of scoredMatches) {
    for (const p of predsByMatch.get(match.id) ?? []) {
      if (!match.officialResult) continue;
      const pts = calculatePredictionPoints(p, match.officialResult, state.db.pointsConfig);
      running.set(p.userId, (running.get(p.userId) ?? 0) + pts.points);
    }
    for (const [uid, arr] of cumulativeByUser.entries()) {
      arr.push(running.get(uid) ?? 0);
    }
  }

  const predictionsByGroup = state.db.groups.map((g) => ({
    groupId: g.id,
    groupName: g.name,
    count: predictionsByGroupMap.get(g.id) ?? 0,
  }));

  const snapshot: StatsAnalyticsSnapshot = {
    predictionsByGroup,
    officialOutcome,
    goalsHistogram,
    totalOfficialGoals,
    avgGoals: officialCount > 0 ? totalOfficialGoals / officialCount : 0,
    scoredPredictions,
    exactHits,
    outcomeHits,
    misses,
    exactsByUser,
    predictionPatternFrequency,
    nextMatchId: nextMatch?.id ?? null,
    nextMatchDist,
    cumulativeLabels: scoredMatches.map((m, i) => `${formatDateArgentinaShort(m.kickoffAt)} · M${i + 1}`),
    cumulativeByUser,
  };

  statsCache = {
    key,
    expiresAt: now + STATS_CACHE_TTL_MS,
    value: snapshot,
  };
  return snapshot;
}




