import type { LeaderboardRow, Prediction, ProdeDB, Score } from '@/lib/types';

const TRIVIA_POINTS_PER_CORRECT = 10;

function outcome(score: Score): number {
  if (score.home > score.away) return 1;
  if (score.home < score.away) return -1;
  return 0;
}

function normalizeTriviaAnswer(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^\d+$/.test(trimmed)) return String(Number(trimmed));
  return trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandTriviaToken(token: string) {
  const aliases: Record<string, string> = {
    alexis: 'macallister',
    'mac': 'macallister',
    'macallister': 'macallister',
    'mac allister': 'macallister',
    dibu: 'martinez',
    damian: 'martinez',
    emi: 'martinez',
    emiliano: 'martinez',
    cr7: 'ronaldo',
    cristiano: 'ronaldo',
    leo: 'messi',
    lionel: 'messi',
  };

  return aliases[token] ?? token;
}

function triviaTokens(value: string) {
  const stopWords = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y']);
  return normalizeTriviaAnswer(value)
    .split(' ')
    .map(expandTriviaToken)
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}

function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + substitutionCost,
      );
    }
    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

function areTriviaTokensClose(a: string, b: string) {
  if (a === b) return true;
  if (a.length >= 5 && b.length >= 5 && (a.includes(b) || b.includes(a))) return true;

  const longerLength = Math.max(a.length, b.length);
  if (longerLength < 5) return false;

  const distance = levenshteinDistance(a, b);
  const allowedDistance = longerLength >= 9 ? 2 : 1;
  return distance <= allowedDistance;
}

function countTriviaTokenMatches(left: string[], right: string[]) {
  const usedRightIndexes = new Set<number>();
  let matches = 0;

  for (const leftToken of left) {
    const matchingIndex = right.findIndex((rightToken, index) => (
      !usedRightIndexes.has(index) && areTriviaTokensClose(leftToken, rightToken)
    ));
    if (matchingIndex >= 0) {
      usedRightIndexes.add(matchingIndex);
      matches += 1;
    }
  }

  return matches;
}

export function isTriviaAnswerMatch(predictionAnswer: string, officialAnswer: string) {
  const predicted = normalizeTriviaAnswer(predictionAnswer);
  const official = normalizeTriviaAnswer(officialAnswer);
  if (!predicted || !official) return false;
  if (/^\d+$/.test(predicted) || /^\d+$/.test(official)) return predicted === official;
  if (predicted === official) return true;

  const predictedTokens = triviaTokens(predicted);
  const officialTokens = triviaTokens(official);
  if (!predictedTokens.length || !officialTokens.length) return false;

  const shorter = predictedTokens.length <= officialTokens.length ? predictedTokens : officialTokens;
  const longer = predictedTokens.length <= officialTokens.length ? officialTokens : predictedTokens;
  const matchedShorterTokens = countTriviaTokenMatches(shorter, longer);

  if (matchedShorterTokens === shorter.length) return true;

  // For player/goalkeeper answers, a distinctive surname with a small typo is enough.
  if (shorter.length === 1 && matchedShorterTokens === 1) return true;
  if (matchedShorterTokens >= 1 && shorter.some((token) => token.length >= 5 && longer.some((candidate) => areTriviaTokensClose(token, candidate)))) {
    return true;
  }

  return false;
}

export function calculatePredictionPoints(
  prediction: Pick<Prediction, 'homeGoals' | 'awayGoals'>,
  official: Score,
  pointsConfig: ProdeDB['pointsConfig'],
) {
  const predictedScore: Score = { home: prediction.homeGoals, away: prediction.awayGoals };

  if (predictedScore.home === official.home && predictedScore.away === official.away) {
    return { points: pointsConfig.exactScore, exactHit: true, outcomeHit: false, sideGoalsHit: false };
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
    if (user.registrationPaymentStatus !== 'approved') continue;
    rowsByUserId.set(user.id, {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      userName: user.name,
      totalPoints: 0,
      exactHits: 0,
      outcomeHits: 0,
      sideGoalsHits: 0,
      incorrectPredictions: 0,
      accuracyRate: 0,
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
    row.sideGoalsHits += result.sideGoalsHit ? 1 : 0;
    row.incorrectPredictions += result.points === 0 ? 1 : 0;
    row.scoredPredictions += 1;
  }

  const triviaResultByQuestionId = new Map(db.triviaResults.map((item) => [item.questionId, item] as const));
  for (const prediction of db.triviaPredictions) {
    const row = rowsByUserId.get(prediction.userId);
    if (!row) continue;
    const official = triviaResultByQuestionId.get(prediction.questionId);
    if (!official) continue;

    if (isTriviaAnswerMatch(prediction.answer, official.answer)) {
      row.totalPoints += TRIVIA_POINTS_PER_CORRECT;
    }
  }

  const rows = [...rowsByUserId.values()].map((row) => ({
    ...row,
    accuracyRate: row.scoredPredictions > 0
      ? Math.round(((row.exactHits + row.outcomeHits) / row.scoredPredictions) * 100)
      : 0,
  }));

  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
    if (b.outcomeHits !== a.outcomeHits) return b.outcomeHits - a.outcomeHits;
    if (b.sideGoalsHits !== a.sideGoalsHits) return b.sideGoalsHits - a.sideGoalsHits;
    return a.userName.localeCompare(b.userName, 'es');
  });

  return rows;
}
