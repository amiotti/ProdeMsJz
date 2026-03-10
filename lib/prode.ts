import type { LeaderboardRow, Prediction, ProdeDB, Score } from '@/lib/types';

function outcome(score: Score): number {
  if (score.home > score.away) return 1;
  if (score.home < score.away) return -1;
  return 0;
}

export function calculatePredictionPoints(
  prediction: Pick<Prediction, 'homeGoals' | 'awayGoals'>,
  official: Score,
  pointsConfig: ProdeDB['pointsConfig'],
) {
  const predictedScore: Score = { home: prediction.homeGoals, away: prediction.awayGoals };

  if (predictedScore.home === official.home && predictedScore.away === official.away) {
    return { points: pointsConfig.exactScore, exactHit: true, outcomeHit: false, sideGoalsHit: true };
  }

  const outcomeHit = outcome(predictedScore) === outcome(official);
  const sideGoalsHit = predictedScore.home === official.home || predictedScore.away === official.away;
  let points = 0;

  if (outcomeHit) {
    points += pointsConfig.correctOutcome;
  }
  if (sideGoalsHit) {
    points += 5;
  }

  return { points, exactHit: false, outcomeHit, sideGoalsHit };
}

export function computeLeaderboard(db: ProdeDB): LeaderboardRow[] {
  const matchById = new Map(db.matches.map((m) => [m.id, m]));
  const rowsByUserId = new Map<string, LeaderboardRow>();

  for (const user of db.users) {
    if (user.role === 'admin') continue;
    rowsByUserId.set(user.id, {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      userName: user.name,
      totalPoints: 0,
      exactHits: 0,
      outcomeHits: 0,
      scoredPredictions: 0,
      totalPredictions: 0,
    });
  }

  for (const prediction of db.predictions) {
    const row = rowsByUserId.get(prediction.userId);
    if (!row) continue;
    row.totalPredictions += 1;

    const match = matchById.get(prediction.matchId);
    if (!match?.officialResult) continue;

    const result = calculatePredictionPoints(prediction, match.officialResult, db.pointsConfig);
    row.totalPoints += result.points;
    row.exactHits += result.exactHit ? 1 : 0;
    row.outcomeHits += result.outcomeHit ? 1 : 0;
    row.scoredPredictions += 1;
  }

  const rows = [...rowsByUserId.values()];

  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
    if (b.outcomeHits !== a.outcomeHits) return b.outcomeHits - a.outcomeHits;
    return a.userName.localeCompare(b.userName, 'es');
  });

  return rows;
}

