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
    return { points: pointsConfig.exactScore, exactHit: true, outcomeHit: false };
  }

  if (outcome(predictedScore) === outcome(official)) {
    return { points: pointsConfig.correctOutcome, exactHit: false, outcomeHit: true };
  }

  return { points: 0, exactHit: false, outcomeHit: false };
}

export function computeLeaderboard(db: ProdeDB): LeaderboardRow[] {
  const matchById = new Map(db.matches.map((m) => [m.id, m]));

  const rows = db.users.filter((u) => u.role !== 'admin').map<LeaderboardRow>((user) => {
    const userPredictions = db.predictions.filter((p) => p.userId === user.id);

    let totalPoints = 0;
    let exactHits = 0;
    let outcomeHits = 0;
    let scoredPredictions = 0;

    for (const prediction of userPredictions) {
      const match = matchById.get(prediction.matchId);
      if (!match || !match.officialResult) continue;

      const result = calculatePredictionPoints(prediction, match.officialResult, db.pointsConfig);
      totalPoints += result.points;
      exactHits += result.exactHit ? 1 : 0;
      outcomeHits += result.outcomeHit ? 1 : 0;
      scoredPredictions += 1;
    }

    return {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      userName: user.name,
      photoDataUrl: user.photoDataUrl ?? null,
      totalPoints,
      exactHits,
      outcomeHits,
      scoredPredictions,
      totalPredictions: userPredictions.length,
    };
  });

  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
    if (b.outcomeHits !== a.outcomeHits) return b.outcomeHits - a.outcomeHits;
    return a.userName.localeCompare(b.userName, 'es');
  });

  return rows;
}
