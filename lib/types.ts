export type Score = {
  home: number;
  away: number;
};

export type Group = {
  id: string;
  name: string;
  teams: string[];
};

export type Match = {
  id: string;
  groupId: string;
  stage?: string;
  matchday: number;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  venue?: string | null;
  officialResult: Score | null;
};

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  bankInfo: string;
  registrationPaymentStatus?: 'pending' | 'approved' | 'failed';
  registrationPaymentApprovedAt?: string | null;
  registrationPaymentReceipt?: string | null;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt?: string;
};

export type Prediction = {
  id: string;
  userId: string;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  updatedAt: string;
};

export type ProdeDB = {
  version: number;
  pointsConfig: {
    exactScore: number;
    correctOutcome: number;
  };
  groups: Group[];
  matches: Match[];
  users: User[];
  predictions: Prediction[];
  updatedAt: string;
};

export type LeaderboardRow = {
  userId: string;
  firstName: string;
  lastName: string;
  userName: string;
  totalPoints: number;
  exactHits: number;
  outcomeHits: number;
  scoredPredictions: number;
  totalPredictions: number;
};

export type StateResponse = {
  db: ProdeDB;
  leaderboard: LeaderboardRow[];
  viewer: {
    isAuthenticated: boolean;
    user: User | null;
    isAdmin: boolean;
  };
  summary: {
    users: number;
    matches: number;
    matchesWithOfficialResult: number;
    predictions: number;
  };
};
