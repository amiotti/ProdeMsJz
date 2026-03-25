import { randomUUID } from 'node:crypto';

import { hashPassword, verifyPassword, verifySession } from '@/lib/auth';
import { getInstantAdminDb, tx } from '@/lib/instant';
import { computeLeaderboard } from '@/lib/prode';
import { createSeedDb } from '@/lib/seed';
import type {
  ContactMessage,
  ContactMessageStatus,
  LeaderboardRow,
  Match,
  Prediction,
  ProdeDB,
  Score,
  StateResponse,
  TriviaOfficialResult,
  TriviaPrediction,
  TriviaQuestion,
  User,
} from '@/lib/types';

type UserRole = 'admin' | 'user';

type InstantUserDoc = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  bankInfo: string;
  registrationPaymentStatus?: 'pending' | 'approved' | 'failed';
  registrationPaymentApprovedAt?: string | null;
  registrationPaymentReceipt?: string | null;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

type InstantUserPredictionsDoc = {
  id: string;
  userId: string;
  predictions: Record<string, { homeGoals: number; awayGoals: number; updatedAt: string }>;
  updatedAt: string;
};

type InstantUserTriviaPredictionsDoc = {
  id: string;
  userId: string;
  answers: Record<string, { answer: string; updatedAt: string }>;
  updatedAt: string;
};

type InstantOfficialResultDoc = {
  id: string;
  matchId: string;
  home: number;
  away: number;
  updatedAt: string;
};

type InstantOfficialTriviaResultDoc = {
  id: string;
  questionId: string;
  answer: string;
  updatedAt: string;
};

type InstantConfigDoc = {
  id: string;
  key: string;
  exactScore: number;
  correctOutcome: number;
  updatedAt: string;
};

type InstantContactMessageDoc = {
  id: string;
  userId?: string | null;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
  updatedAt: string;
};

type InstantLeaderboardGroupDoc = {
  id: string;
  userId: string;
  name: string;
  userIds: string[];
  createdAt: string;
  updatedAt: string;
};

type InstantLegalAcceptanceDoc = {
  id: string;
  userId: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  declaredAdult: boolean;
  acceptedAt: string;
  ip: string;
};

type InstantQueryResult = {
  prode_users?: InstantUserDoc[];
  prode_user_predictions?: InstantUserPredictionsDoc[];
  prode_user_trivia_predictions?: InstantUserTriviaPredictionsDoc[];
  prode_official_results?: InstantOfficialResultDoc[];
  prode_official_trivia_results?: InstantOfficialTriviaResultDoc[];
  prode_config?: InstantConfigDoc[];
  prode_contact_messages?: InstantContactMessageDoc[];
};

let seedDbCache: ProdeDB | null = null;
let ensureBaseDataInFlight: Promise<void> | null = null;
let ensureBaseDataLastRunAt = 0;
let legacyPredictionsCleanupAttempted = false;
let coreStateCache:
  | {
      expiresAt: number;
      db: ProdeDB;
      leaderboard: LeaderboardRow[];
      summary: StateResponse['summary'];
    }
  | null = null;
const CORE_STATE_TTL_MS = 30_000;
const TRIVIA_POINTS_PER_QUESTION = 10;

const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  { id: 'mvp', prompt: '¿Quién será el jugador MVP del Mundial 2026?', answerType: 'text' },
  { id: 'champion', prompt: '¿Qué selección ganará el Mundial 2026?', answerType: 'text' },
  { id: 'top_scorer', prompt: '¿Quién será el máximo goleador del torneo?', answerType: 'text' },
  { id: 'golden_glove', prompt: '¿Qué arquero ganará el Guante de Oro?', answerType: 'text' },
  { id: 'argentina_goals', prompt: '¿Cuántos goles hará Argentina?', answerType: 'number' },
];

function getTriviaCutoffAt(matches: Match[]): string | null {
  const firstKnockoutMs = matches
    .filter((match) => match.groupId === 'KO')
    .map((match) => new Date(match.kickoffAt).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b)[0];

  if (!Number.isFinite(firstKnockoutMs)) return null;
  return new Date(firstKnockoutMs).toISOString();
}

function isTriviaWindowOpen(matches: Match[], nowMs = Date.now()) {
  const cutoffAt = getTriviaCutoffAt(matches);
  if (!cutoffAt) return false;
  const cutoffMs = new Date(cutoffAt).getTime();
  if (!Number.isFinite(cutoffMs)) return false;
  return nowMs < cutoffMs;
}

function normalizeTriviaAnswer(answer: string, answerType: TriviaQuestion['answerType']) {
  const trimmed = answer.trim();
  if (!trimmed) return '';
  if (answerType === 'number') {
    if (!/^\d+$/.test(trimmed)) return '';
    return String(Number(trimmed));
  }
  return trimmed.slice(0, 120);
}

function nowIso() {
  return new Date().toISOString();
}

function isPredictionWindowOpen(kickoffAt: string, nowMs = Date.now()) {
  const kickoffMs = new Date(kickoffAt).getTime();
  if (!Number.isFinite(kickoffMs)) return false;
  return nowMs < kickoffMs - 60 * 60 * 1000;
}

function getSeedDbTemplate() {
  if (!seedDbCache) {
    seedDbCache = createSeedDb();
  }
  return seedDbCache;
}

function cloneDb(db: ProdeDB): ProdeDB {
  return {
    ...db,
    pointsConfig: { ...db.pointsConfig },
    groups: db.groups.map((g) => ({ ...g, teams: [...g.teams] })),
    matches: db.matches.map((m) => ({
      ...m,
      officialResult: m.officialResult ? { ...m.officialResult } : null,
    })),
    users: db.users.map((u) => ({ ...u })),
    predictions: db.predictions.map((p) => ({ ...p })),
    triviaQuestions: db.triviaQuestions.map((q) => ({ ...q })),
    triviaPredictions: db.triviaPredictions.map((p) => ({ ...p })),
    triviaResults: db.triviaResults.map((r) => ({ ...r })),
  };
}

function invalidateCoreStateCache() {
  coreStateCache = null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sanitizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ').slice(0, 80);
}

function publicUser(doc: InstantUserDoc): User {
  return {
    id: doc.id,
    firstName: doc.firstName,
    lastName: doc.lastName,
    phone: doc.phone,
    bankInfo: doc.bankInfo ?? '-',
    registrationPaymentStatus: doc.registrationPaymentStatus ?? (doc.role === 'admin' ? 'approved' : 'pending'),
    registrationPaymentApprovedAt: doc.registrationPaymentApprovedAt ?? null,
    registrationPaymentReceipt: doc.registrationPaymentReceipt ?? null,
    name: doc.name,
    email: doc.email,
    role: doc.role,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function publicContactMessage(doc: InstantContactMessageDoc): ContactMessage {
  return {
    id: doc.id,
    userId: doc.userId ?? null,
    name: doc.name,
    email: doc.email,
    phone: doc.phone ?? '',
    message: doc.message,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function sanitizePhone(phone: string) {
  return phone.trim().replace(/\s+/g, ' ').slice(0, 32);
}

function sanitizeBankInfo(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 120);
}

function sanitizeContactMessage(value: string) {
  return value.trim().replace(/\r\n/g, '\n').slice(0, 2000);
}

function validateContactMessageInput(input: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  const name = sanitizeName(input.name);
  const email = normalizeEmail(input.email);
  const phone = sanitizePhone(input.phone ?? '');
  const message = sanitizeContactMessage(input.message);

  if (name.length < 2) throw new Error('El nombre es obligatorio');
  if (!email) throw new Error('El email es obligatorio');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('El email no es válido');
  if (phone && !/^[0-9+()\-\s]{6,32}$/.test(phone)) throw new Error('El teléfono no es válido');
  if (message.length < 10) throw new Error('La consulta debe tener al menos 10 caracteres');
}

function validateRegistrationInput(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bankInfo: string;
  password: string;
}) {
  const firstName = sanitizeName(input.firstName);
  const lastName = sanitizeName(input.lastName);
  const email = normalizeEmail(input.email);
  const phone = sanitizePhone(input.phone);
  const bankInfo = sanitizeBankInfo(input.bankInfo);
  if (!firstName) throw new Error('El nombre es obligatorio');
  if (!lastName) throw new Error('El apellido es obligatorio');
  if (!email) throw new Error('El email es obligatorio');
  if (!phone) throw new Error('El telefono es obligatorio');
  if (!bankInfo) throw new Error('El CBU/CVU o Alias es obligatorio');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('El email no es valido');
  if (email.length > 120) throw new Error('El email es demasiado largo');
  if (!/^[0-9+()\-\s./]{6,32}$/.test(phone)) throw new Error('El telefono no es valido');
  if (bankInfo.length < 6) throw new Error('El CBU/CVU o Alias no es valido');
  if (!input.password || input.password.length < 8) throw new Error('La contrasena debe tener al menos 8 caracteres');
  if (input.password.length > 128) throw new Error('La contrasena es demasiado larga');
}

async function queryAllInstant() {
  const db = getInstantAdminDb();
  const data = (await db.query({
    prode_users: {},
    prode_user_predictions: {},
    prode_user_trivia_predictions: {},
    prode_official_results: {},
    prode_official_trivia_results: {},
    prode_config: {},
  })) as InstantQueryResult;
  return {
    users: data.prode_users ?? [],
    userPredictions: data.prode_user_predictions ?? [],
    userTriviaPredictions: data.prode_user_trivia_predictions ?? [],
    officialResults: data.prode_official_results ?? [],
    officialTriviaResults: data.prode_official_trivia_results ?? [],
    config: data.prode_config ?? [],
  };
}

async function queryUsersOnly() {
  const db = getInstantAdminDb();
  const data = (await db.query({ prode_users: {} })) as InstantQueryResult;
  return data.prode_users ?? [];
}

async function queryUserByIdOnly(userId: string) {
  const db = getInstantAdminDb();
  const data = (await db.query({
    prode_users: { $: { where: { id: userId } } },
  })) as InstantQueryResult;
  return (data.prode_users ?? [])[0] ?? null;
}

async function queryUserByEmailOnly(email: string) {
  const db = getInstantAdminDb();
  const data = (await db.query({
    prode_users: { $: { where: { email } } },
  })) as InstantQueryResult;
  return (data.prode_users ?? [])[0] ?? null;
}

async function queryConfigOnly() {
  const db = getInstantAdminDb();
  const data = (await db.query({ prode_config: {} })) as InstantQueryResult;
  return data.prode_config ?? [];
}

async function queryContactMessagesOnly() {
  const db = getInstantAdminDb();
  const data = (await db.query({ prode_contact_messages: {} })) as InstantQueryResult;
  return data.prode_contact_messages ?? [];
}

async function queryNewContactMessagesCountOnly() {
  const db = getInstantAdminDb();
  const data = (await db.query({
    prode_contact_messages: { $: { where: { status: 'new' } } },
  })) as InstantQueryResult;
  return (data.prode_contact_messages ?? []).length;
}

async function queryOfficialResultsOnly() {
  const db = getInstantAdminDb();
  const data = (await db.query({ prode_official_results: {} })) as InstantQueryResult;
  return data.prode_official_results ?? [];
}

async function queryOfficialTriviaResultsOnly() {
  const db = getInstantAdminDb();
  const data = (await db.query({ prode_official_trivia_results: {} })) as InstantQueryResult;
  return data.prode_official_trivia_results ?? [];
}

async function queryUserPredictionsDocByUserOnly(userId: string) {
  const db = getInstantAdminDb();
  const data = (await db.query({
    prode_user_predictions: { $: { where: { userId } } },
  })) as InstantQueryResult;
  return (data.prode_user_predictions ?? [])[0] ?? null;
}

async function queryUserTriviaPredictionsDocByUserOnly(userId: string) {
  const db = getInstantAdminDb();
  const data = (await db.query({
    prode_user_trivia_predictions: { $: { where: { userId } } },
  })) as InstantQueryResult;
  return (data.prode_user_trivia_predictions ?? [])[0] ?? null;
}

async function queryUserLeaderboardGroupsOnly(userId: string) {
  const db = getInstantAdminDb();
  const data = (await db.query({
    prode_user_leaderboard_groups: { $: { where: { userId } } },
  })) as { prode_user_leaderboard_groups?: InstantLeaderboardGroupDoc[] };
  return data.prode_user_leaderboard_groups ?? [];
}

async function queryLegalAcceptancesByUserOnly(userId: string) {
  const db = getInstantAdminDb();
  const data = (await db.query({
    prode_legal_acceptances: { $: { where: { userId } } },
  })) as { prode_legal_acceptances?: InstantLegalAcceptanceDoc[] };
  return data.prode_legal_acceptances ?? [];
}

async function ensureAdminUser() {
  const adminEmail = process.env.PRODE_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.PRODE_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return;

  const users = await queryUsersOnly();
  const existing = users.find((u) => normalizeEmail(u.email) === adminEmail);
  if (existing) {
    if (existing.role === 'admin') return;
    const ts = nowIso();
    await getInstantAdminDb().transact([
      tx.prode_users[existing.id].update({
        role: 'admin',
        registrationPaymentStatus: 'approved',
        registrationPaymentApprovedAt: ts,
        updatedAt: ts,
      }),
    ]);
    invalidateCoreStateCache();
    return;
  }

  const firstName = process.env.PRODE_ADMIN_FIRST_NAME?.trim() || 'Admin';
  const lastName = process.env.PRODE_ADMIN_LAST_NAME?.trim() || 'PRODE';
  const phone = process.env.PRODE_ADMIN_PHONE?.trim() || '-';
  const bankInfo = '-';
  const ts = nowIso();
  const id = randomUUID();
  await getInstantAdminDb().transact([
    tx.prode_users[id].update({
      id,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      email: adminEmail,
      phone,
      bankInfo,
      role: 'admin',
      registrationPaymentStatus: 'approved',
      registrationPaymentApprovedAt: ts,
      passwordHash: hashPassword(adminPassword),
      createdAt: ts,
      updatedAt: ts,
    }),
  ]);
  invalidateCoreStateCache();
}

async function ensureConfigDoc() {
  const seed = getSeedDbTemplate();
  const configDocs = await queryConfigOnly();
  const pointsDoc = configDocs.find((c) => c.key === 'points');
  if (pointsDoc) {
    if (
      pointsDoc.exactScore !== seed.pointsConfig.exactScore ||
      pointsDoc.correctOutcome !== seed.pointsConfig.correctOutcome
    ) {
      const ts = nowIso();
      await getInstantAdminDb().transact([
        tx.prode_config[pointsDoc.id].update({
          exactScore: seed.pointsConfig.exactScore,
          correctOutcome: seed.pointsConfig.correctOutcome,
          updatedAt: ts,
        }),
      ]);
      invalidateCoreStateCache();
    }
    return;
  }
  const ts = nowIso();
  const id = randomUUID();
  await getInstantAdminDb().transact([
    tx.prode_config[id].update({
      id,
      key: 'points',
      exactScore: seed.pointsConfig.exactScore,
      correctOutcome: seed.pointsConfig.correctOutcome,
      updatedAt: ts,
    }),
  ]);
  invalidateCoreStateCache();
}

async function cleanupLegacyPredictions() {
  if (legacyPredictionsCleanupAttempted) return;
  legacyPredictionsCleanupAttempted = true;
  const db = getInstantAdminDb();
  const data = (await db.query({
    prode_predictions: {},
    prode_user_predictions: {},
  })) as {
    prode_predictions?: Array<{
      id: string;
      userId: string;
      matchId: string;
      homeGoals: number;
      awayGoals: number;
      updatedAt: string;
    }>;
    prode_user_predictions?: InstantUserPredictionsDoc[];
  };
  const legacy = data.prode_predictions ?? [];
  if (legacy.length === 0) return;
  const existingUserIds = new Set((data.prode_user_predictions ?? []).map((doc) => doc.userId));
  const predictionsByUser = new Map<
    string,
    Record<string, { homeGoals: number; awayGoals: number; updatedAt: string }>
  >();
  for (const p of legacy) {
    const map = predictionsByUser.get(p.userId) ?? {};
    map[p.matchId] = {
      homeGoals: p.homeGoals,
      awayGoals: p.awayGoals,
      updatedAt: p.updatedAt,
    };
    predictionsByUser.set(p.userId, map);
  }

  const operations: any[] = [];
  for (const [userId, predictions] of predictionsByUser) {
    if (existingUserIds.has(userId)) continue;
    const id = randomUUID();
    operations.push(
      tx.prode_user_predictions[id].update({
        id,
        userId,
        predictions,
        updatedAt: nowIso(),
      }),
    );
  }

  for (const doc of legacy) {
    operations.push(tx.prode_predictions[doc.id].delete());
  }

  if (operations.length > 0) {
    await db.transact(operations);
  }
}

async function ensureBaseData() {
  const now = Date.now();
  if (now - ensureBaseDataLastRunAt < 15_000) return;
  if (ensureBaseDataInFlight) return ensureBaseDataInFlight;

  ensureBaseDataInFlight = (async () => {
    await ensureAdminUser();
    await ensureConfigDoc();
    await cleanupLegacyPredictions();
    ensureBaseDataLastRunAt = Date.now();
  })().finally(() => {
    ensureBaseDataInFlight = null;
  });

  return ensureBaseDataInFlight;
}

function buildStateFromInstantData(data: Awaited<ReturnType<typeof queryAllInstant>>): ProdeDB {
  const seed = getSeedDbTemplate();

  const users = data.users
    .map(publicUser)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const predictions: Prediction[] = [];
  for (const doc of data.userPredictions) {
    for (const [matchId, entry] of Object.entries(doc.predictions ?? {})) {
      predictions.push({
        id: `${doc.id}:${matchId}`,
        userId: doc.userId,
        matchId,
        homeGoals: entry.homeGoals,
        awayGoals: entry.awayGoals,
        updatedAt: entry.updatedAt,
      });
    }
  }

  const triviaPredictions: TriviaPrediction[] = [];
  for (const doc of data.userTriviaPredictions) {
    for (const [questionId, entry] of Object.entries(doc.answers ?? {})) {
      triviaPredictions.push({
        id: `${doc.id}:${questionId}`,
        userId: doc.userId,
        questionId,
        answer: entry.answer,
        updatedAt: entry.updatedAt,
      });
    }
  }

  const officialByMatchId = new Map(data.officialResults.map((r) => [r.matchId, r] as const));
  const officialTriviaByQuestionId = new Map(data.officialTriviaResults.map((r) => [r.questionId, r] as const));

  const pointsDoc = data.config.find((c) => c.key === 'points');

  return {
    ...seed,
    users,
    predictions,
    triviaQuestions: TRIVIA_QUESTIONS.map((question) => ({ ...question })),
    triviaPredictions,
    triviaResults: TRIVIA_QUESTIONS.map((question) => {
      const official = officialTriviaByQuestionId.get(question.id);
      return {
        id: official?.id ?? `official-trivia-${question.id}`,
        questionId: question.id,
        answer: official?.answer ?? '',
        updatedAt: official?.updatedAt ?? '',
      };
    }).filter((item) => item.answer),
    pointsConfig: pointsDoc
      ? { exactScore: pointsDoc.exactScore, correctOutcome: pointsDoc.correctOutcome }
      : seed.pointsConfig,
    matches: seed.matches.map((m) => {
      const r = officialByMatchId.get(m.id);
      return {
        ...m,
        officialResult: r ? ({ home: r.home, away: r.away } satisfies Score) : null,
      };
    }),
    updatedAt: nowIso(),
  };
}

function applyOfficialResultsToSeed(
  officialResults: InstantOfficialResultDoc[],
  officialTriviaResults: InstantOfficialTriviaResultDoc[] = [],
): ProdeDB {
  const seed = getSeedDbTemplate();
  const officialByMatchId = new Map(officialResults.map((r) => [r.matchId, r] as const));
  const officialTriviaByQuestionId = new Map(officialTriviaResults.map((r) => [r.questionId, r] as const));
  return {
    ...seed,
    pointsConfig: { ...seed.pointsConfig },
    groups: seed.groups.map((g) => ({ ...g, teams: [...g.teams] })),
    users: [],
    predictions: [],
    triviaQuestions: TRIVIA_QUESTIONS.map((question) => ({ ...question })),
    triviaPredictions: [],
    triviaResults: TRIVIA_QUESTIONS.map((question) => {
      const official = officialTriviaByQuestionId.get(question.id);
      return {
        id: official?.id ?? `official-trivia-${question.id}`,
        questionId: question.id,
        answer: official?.answer ?? '',
        updatedAt: official?.updatedAt ?? '',
      };
    }).filter((item) => item.answer),
    matches: seed.matches.map((m) => {
      const r = officialByMatchId.get(m.id);
      return {
        ...m,
        officialResult: r ? ({ home: r.home, away: r.away } satisfies Score) : null,
      };
    }),
    updatedAt: nowIso(),
  };
}

async function getCoreStateSnapshot() {
  const now = Date.now();
  if (coreStateCache && coreStateCache.expiresAt > now) {
    return {
      db: cloneDb(coreStateCache.db),
      leaderboard: [...coreStateCache.leaderboard],
      summary: { ...coreStateCache.summary },
    };
  }

  const data = await queryAllInstant();
  const db = buildStateFromInstantData(data);
  const leaderboard = computeLeaderboard(db);
  const summary: StateResponse['summary'] = {
    users: db.users.filter((user) => user.role !== 'admin').length,
    matches: db.matches.length,
    matchesWithOfficialResult: db.matches.filter((m) => m.officialResult).length,
    predictions: db.predictions.length,
  };

  coreStateCache = {
    expiresAt: now + CORE_STATE_TTL_MS,
    db,
    leaderboard,
    summary,
  };

  return {
    db: cloneDb(db),
    leaderboard: [...leaderboard],
    summary: { ...summary },
  };
}

export async function readDb(): Promise<ProdeDB> {
  await ensureBaseData();
  const core = await getCoreStateSnapshot();
  return core.db;
}

export async function writeDb(): Promise<void> {
  throw new Error('writeDb no se usa con InstantDB');
}

export async function createUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bankInfo: string;
  password: string;
  legalAcceptance: {
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
    declaredAdult: boolean;
    ip: string;
  };
}): Promise<User> {
  await ensureBaseData();
  validateRegistrationInput(input);

  const email = normalizeEmail(input.email);
  const existingUser = await queryUserByEmailOnly(email);
  if (existingUser) {
    throw new Error('Ya existe un usuario con ese email');
  }

  const id = randomUUID();
  const ts = nowIso();
  const firstName = sanitizeName(input.firstName);
  const lastName = sanitizeName(input.lastName);
  const phone = sanitizePhone(input.phone);
  const bankInfo = sanitizeBankInfo(input.bankInfo);

  const doc: InstantUserDoc = {
    id,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    email,
    phone,
    bankInfo,
    registrationPaymentStatus: 'pending',
    registrationPaymentApprovedAt: null,
    registrationPaymentReceipt: null,
    role: 'user',
    passwordHash: hashPassword(input.password),
    createdAt: ts,
    updatedAt: ts,
  };

  const legalAcceptanceDoc: InstantLegalAcceptanceDoc = {
    id: randomUUID(),
    userId: id,
    acceptedTerms: Boolean(input.legalAcceptance.acceptedTerms),
    acceptedPrivacy: Boolean(input.legalAcceptance.acceptedPrivacy),
    declaredAdult: Boolean(input.legalAcceptance.declaredAdult),
    acceptedAt: ts,
    ip: (input.legalAcceptance.ip ?? '').slice(0, 120),
  };

  await getInstantAdminDb().transact([
    tx.prode_users[id].update(doc),
    tx.prode_legal_acceptances[legalAcceptanceDoc.id].update(legalAcceptanceDoc),
  ]);
  invalidateCoreStateCache();
  return publicUser(doc);
}

export async function loginUser(input: { email: string; password: string }): Promise<User> {
  await ensureBaseData();
  const email = normalizeEmail(input.email);
  const found = await queryUserByEmailOnly(email);
  if (!found || !verifyPassword(input.password, found.passwordHash)) {
    throw new Error('Email o contraseña incorrectos');
  }
  return publicUser(found);
}

export async function getUserById(userId: string): Promise<User | null> {
  await ensureBaseData();
  const found = await queryUserByIdOnly(userId);
  return found ? publicUser(found) : null;
}

export async function getUserFromSessionToken(token: string | undefined | null): Promise<User | null> {
  const session = verifySession(token);
  if (!session) return null;
  const user = await getUserById(session.userId);
  if (!user) return null;
  if (user.role !== session.role) return null;
  return user;
}

export async function updateUserProfile(
  userId: string,
  input: { firstName?: string; lastName?: string; phone?: string; bankInfo?: string; password?: string },
): Promise<User> {
  await ensureBaseData();
  const users = await queryUsersOnly();
  const current = users.find((u) => u.id === userId);
  if (!current) throw new Error('Usuario no encontrado');

  const firstName = sanitizeName(input.firstName ?? current.firstName);
  const lastName = sanitizeName(input.lastName ?? current.lastName);
  const phone = sanitizePhone(input.phone ?? current.phone);
  const bankInfo = sanitizeBankInfo(input.bankInfo ?? current.bankInfo ?? '-');
  if (!firstName) throw new Error('El nombre es obligatorio');
  if (!lastName) throw new Error('El apellido es obligatorio');
  if (!phone) throw new Error('El tel?fono es obligatorio');
  if (!bankInfo) throw new Error('El CBU/CVU o Alias es obligatorio');
  if (!/^[0-9+()\-\s./]{6,32}$/.test(phone)) throw new Error('El telefono no es valido');

  const patch: Partial<InstantUserDoc> = {
    firstName,
    lastName,
    phone,
    bankInfo,
    name: `${firstName} ${lastName}`.trim(),
    updatedAt: nowIso(),
  };

  if (typeof input.password === 'string' && input.password.length > 0) {
    if (input.password.length < 8) throw new Error('La contrasena debe tener al menos 8 caracteres');
    if (input.password.length > 128) throw new Error('La contrasena es demasiado larga');
    patch.passwordHash = hashPassword(input.password);
  }

  await getInstantAdminDb().transact([tx.prode_users[userId].update(patch)]);
  invalidateCoreStateCache();
  return publicUser({ ...current, ...patch });
}

export async function savePredictions(
  userId: string,
  items: Array<{ matchId: string; homeGoals: number; awayGoals: number }>,
) {
  await ensureBaseData();
  if (!Array.isArray(items)) throw new Error('Formato de predicciones inválido');
  if (items.length > 80) throw new Error('Demasiadas predicciones en una sola solicitud');
  const userDoc = await queryUserByIdOnly(userId);
  const user = userDoc ? publicUser(userDoc) : null;
  if (!user) throw new Error('Usuario no encontrado');
  if (user.role === 'admin') throw new Error('El administrador no puede cargar predicciones');
  if (user.registrationPaymentStatus !== 'approved') {
    throw new Error('Debes tener el pago de inscripción aprobado para cargar predicciones');
  }

  const seed = getSeedDbTemplate();
  const matchById = new Map(seed.matches.map((m) => [m.id, m] as const));
  const existingUserPredictionsDoc = await queryUserPredictionsDocByUserOnly(userId);
  const predictionsMap: Record<string, { homeGoals: number; awayGoals: number; updatedAt: string }> = {
    ...(existingUserPredictionsDoc?.predictions ?? {}),
  };

  const lockedMatches: string[] = [];
  const ts = nowIso();
  const nowMs = Date.now();
  let changed = false;

  for (const item of items) {
    const match = matchById.get(item.matchId);
    if (!match) continue;
    if (!Number.isInteger(item.homeGoals) || item.homeGoals < 0 || item.homeGoals > 30) continue;
    if (!Number.isInteger(item.awayGoals) || item.awayGoals < 0 || item.awayGoals > 30) continue;

    if (!isPredictionWindowOpen(match.kickoffAt, nowMs)) {
      lockedMatches.push(item.matchId);
      continue;
    }
    predictionsMap[item.matchId] = {
      homeGoals: item.homeGoals,
      awayGoals: item.awayGoals,
      updatedAt: ts,
    };
    changed = true;
  }

  if (changed) {
    const id = existingUserPredictionsDoc?.id ?? randomUUID();
    await getInstantAdminDb().transact([
      tx.prode_user_predictions[id].update({
        id,
        userId,
        predictions: predictionsMap,
        updatedAt: ts,
      }),
    ]);
    invalidateCoreStateCache();
  }

  return { lockedMatches };
}

export async function saveTriviaPredictions(
  userId: string,
  items: Array<{ questionId: string; answer: string }>,
) {
  await ensureBaseData();
  if (!Array.isArray(items)) throw new Error('Formato de trivias inválido');
  if (items.length > TRIVIA_QUESTIONS.length) throw new Error('Demasiadas respuestas de trivia en una sola solicitud');

  const userDoc = await queryUserByIdOnly(userId);
  const user = userDoc ? publicUser(userDoc) : null;
  if (!user) throw new Error('Usuario no encontrado');
  if (user.role === 'admin') throw new Error('El administrador no puede cargar trivias');
  if (user.registrationPaymentStatus !== 'approved') {
    throw new Error('Debes tener el pago de inscripción aprobado para cargar trivias');
  }

  const seed = getSeedDbTemplate();
  if (!isTriviaWindowOpen(seed.matches)) {
    throw new Error('La trivia ya está cerrada: debía completarse antes del inicio de la fase de llaves');
  }

  const questionById = new Map(TRIVIA_QUESTIONS.map((question) => [question.id, question] as const));
  const existingUserTriviaDoc = await queryUserTriviaPredictionsDocByUserOnly(userId);
  const answersMap: Record<string, { answer: string; updatedAt: string }> = {
    ...(existingUserTriviaDoc?.answers ?? {}),
  };

  const ts = nowIso();
  let changed = false;
  for (const item of items) {
    const question = questionById.get(item.questionId);
    if (!question) continue;
    const normalized = normalizeTriviaAnswer(item.answer, question.answerType);
    if (!normalized) continue;

    answersMap[item.questionId] = {
      answer: normalized,
      updatedAt: ts,
    };
    changed = true;
  }

  if (changed) {
    const id = existingUserTriviaDoc?.id ?? randomUUID();
    await getInstantAdminDb().transact([
      tx.prode_user_trivia_predictions[id].update({
        id,
        userId,
        answers: answersMap,
        updatedAt: ts,
      }),
    ]);
    invalidateCoreStateCache();
  }
}
export async function saveOfficialResults(
  items: Array<{ matchId: string; home: number; away: number }>,
  clearMatchIds: string[] = [],
) {
  await ensureBaseData();
  if (!Array.isArray(items)) throw new Error('Formato de resultados inv?lido');
  if (!Array.isArray(clearMatchIds)) throw new Error('Formato de limpieza de resultados inv?lido');
  if (items.length > 120) throw new Error('Demasiados resultados en una sola solicitud');
  if (clearMatchIds.length > 120) throw new Error('Demasiadas limpiezas en una sola solicitud');

  const base = getSeedDbTemplate();
  const validMatchIds = new Set(base.matches.map((m) => m.id));
  const current = await queryAllInstant();
  const byMatchId = new Map(current.officialResults.map((r) => [r.matchId, r] as const));
  const updateIds = new Set(items.map((item) => item.matchId));
  const ts = nowIso();
  const operations: any[] = [];

  for (const matchId of clearMatchIds) {
    if (!validMatchIds.has(matchId)) continue;
    if (updateIds.has(matchId)) continue;
    const existing = byMatchId.get(matchId);
    if (!existing) continue;
    operations.push(tx.prode_official_results[existing.id].delete());
  }

  for (const item of items) {
    if (!validMatchIds.has(item.matchId)) continue;
    if (!Number.isInteger(item.home) || item.home < 0 || item.home > 30) continue;
    if (!Number.isInteger(item.away) || item.away < 0 || item.away > 30) continue;

    const existing = byMatchId.get(item.matchId);
    const id = existing?.id ?? randomUUID();
    operations.push(
      tx.prode_official_results[id].update({
        id,
        matchId: item.matchId,
        home: item.home,
        away: item.away,
        updatedAt: ts,
      }),
    );
  }

  if (operations.length > 0) {
    await getInstantAdminDb().transact(operations);
    invalidateCoreStateCache();
  }

  return;
}

export async function saveOfficialTriviaResults(
  items: Array<{ questionId: string; answer: string }>,
  clearQuestionIds: string[] = [],
) {
  await ensureBaseData();
  if (!Array.isArray(items)) throw new Error('Formato de resultados de trivia inv?lido');
  if (!Array.isArray(clearQuestionIds)) throw new Error('Formato de limpieza de trivia inv?lido');
  if (items.length > TRIVIA_QUESTIONS.length) throw new Error('Demasiadas respuestas oficiales de trivia en una sola solicitud');
  if (clearQuestionIds.length > TRIVIA_QUESTIONS.length) throw new Error('Demasiadas limpiezas de trivia en una sola solicitud');

  const validQuestions = new Map(TRIVIA_QUESTIONS.map((question) => [question.id, question] as const));
  const current = await queryAllInstant();
  const byQuestionId = new Map(current.officialTriviaResults.map((result) => [result.questionId, result] as const));
  const updateIds = new Set(items.map((item) => item.questionId));
  const ts = nowIso();
  const operations: any[] = [];

  for (const questionId of clearQuestionIds) {
    if (!validQuestions.has(questionId)) continue;
    if (updateIds.has(questionId)) continue;
    const existing = byQuestionId.get(questionId);
    if (!existing) continue;
    operations.push(tx.prode_official_trivia_results[existing.id].delete());
  }

  for (const item of items) {
    const question = validQuestions.get(item.questionId);
    if (!question) continue;
    const normalized = normalizeTriviaAnswer(item.answer, question.answerType);
    if (!normalized) continue;

    const existing = byQuestionId.get(item.questionId);
    const id = existing?.id ?? randomUUID();
    operations.push(
      tx.prode_official_trivia_results[id].update({
        id,
        questionId: item.questionId,
        answer: normalized,
        updatedAt: ts,
      }),
    );
  }

  if (operations.length > 0) {
    await getInstantAdminDb().transact(operations);
    invalidateCoreStateCache();
  }
}
export async function deleteUserAccount(userId: string) {
  await ensureBaseData();
  const current = await queryAllInstant();
  const user = current.users.find((u) => u.id === userId);
  if (!user) throw new Error('Usuario no encontrado');
  if (user.role === 'admin') throw new Error('El administrador no puede eliminarse desde Usuarios');

  const operations: any[] = [];
  const userPredDoc = current.userPredictions.find((p) => p.userId === userId);
  if (userPredDoc) {
    operations.push(tx.prode_user_predictions[userPredDoc.id].delete());
  }
  const userTriviaPredDoc = current.userTriviaPredictions.find((p) => p.userId === userId);
  if (userTriviaPredDoc) {
    operations.push(tx.prode_user_trivia_predictions[userTriviaPredDoc.id].delete());
  }
  const userGroups = await queryUserLeaderboardGroupsOnly(userId);
  for (const group of userGroups) {
    operations.push(tx.prode_user_leaderboard_groups[group.id].delete());
  }
  operations.push(tx.prode_users[userId].delete());

  await getInstantAdminDb().transact(operations);
  invalidateCoreStateCache();
}

export async function listUsers(): Promise<User[]> {
  await ensureBaseData();
  const users = await queryUsersOnly();
  return users.map(publicUser).sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export async function adminDeleteUser(targetUserId: string) {
  await ensureBaseData();
  const current = await queryAllInstant();
  const user = current.users.find((u) => u.id === targetUserId);
  if (!user) throw new Error('Usuario no encontrado');
  if (user.role === 'admin') throw new Error('No se puede eliminar un usuario administrador');

  const operations: any[] = [];
  const userPredDoc = current.userPredictions.find((p) => p.userId === targetUserId);
  if (userPredDoc) {
    operations.push(tx.prode_user_predictions[userPredDoc.id].delete());
  }
  const userTriviaPredDoc = current.userTriviaPredictions.find((p) => p.userId === targetUserId);
  if (userTriviaPredDoc) {
    operations.push(tx.prode_user_trivia_predictions[userTriviaPredDoc.id].delete());
  }
  const userGroups = await queryUserLeaderboardGroupsOnly(targetUserId);
  for (const group of userGroups) {
    operations.push(tx.prode_user_leaderboard_groups[group.id].delete());
  }
  operations.push(tx.prode_users[targetUserId].delete());
  await getInstantAdminDb().transact(operations);
  invalidateCoreStateCache();
}

export async function createContactMessage(input: {
  userId?: string | null;
  name: string;
  email: string;
  phone?: string;
  message: string;
}): Promise<ContactMessage> {
  await ensureBaseData();
  validateContactMessageInput(input);

  const id = randomUUID();
  const ts = nowIso();
  const doc: InstantContactMessageDoc = {
    id,
    userId: input.userId ?? null,
    name: sanitizeName(input.name),
    email: normalizeEmail(input.email),
    phone: sanitizePhone(input.phone ?? ''),
    message: sanitizeContactMessage(input.message),
    status: 'new',
    createdAt: ts,
    updatedAt: ts,
  };

  await getInstantAdminDb().transact([tx.prode_contact_messages[id].update(doc)]);
  return publicContactMessage(doc);
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  await ensureBaseData();
  const messages = await queryContactMessagesOnly();
  return messages
    .map(publicContactMessage)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getNewContactMessagesCount(): Promise<number> {
  await ensureBaseData();
  return queryNewContactMessagesCountOnly();
}

export async function adminUpdateContactMessageStatus(
  messageId: string,
  status: ContactMessageStatus,
): Promise<ContactMessage> {
  await ensureBaseData();
  const messages = await queryContactMessagesOnly();
  const current = messages.find((item) => item.id === messageId);
  if (!current) throw new Error('Consulta no encontrada');

  const updatedAt = nowIso();
  await getInstantAdminDb().transact([
    tx.prode_contact_messages[messageId].update({ status, updatedAt }),
  ]);

  return publicContactMessage({
    ...current,
    status,
    updatedAt,
  });
}
export async function adminSetUserRegistrationPaymentStatus(
  targetUserId: string,
  status: 'pending' | 'approved' | 'failed',
) {
  await ensureBaseData();
  const user = await queryUserByIdOnly(targetUserId);
  if (!user) throw new Error('Usuario no encontrado');
  if (user.role === 'admin') throw new Error('No se puede modificar el pago del administrador');

  const ts = nowIso();
  const approvedAt = status === 'approved' ? user.registrationPaymentApprovedAt ?? ts : null;
  const receipt = status === 'approved' ? user.registrationPaymentReceipt ?? 'Aprobado manualmente por admin' : null;

  await getInstantAdminDb().transact([
    tx.prode_users[targetUserId].update({
      registrationPaymentStatus: status,
      registrationPaymentApprovedAt: approvedAt,
      registrationPaymentReceipt: receipt,
      updatedAt: ts,
    }),
  ]);
  invalidateCoreStateCache();

  return publicUser({
    ...user,
    registrationPaymentStatus: status,
    registrationPaymentApprovedAt: approvedAt,
    registrationPaymentReceipt: receipt,
    updatedAt: ts,
  });
}

export async function markUserRegistrationPaymentApproved(userId: string, receipt?: string | null) {
  await ensureBaseData();
  const user = await queryUserByIdOnly(userId);
  if (!user) throw new Error('Usuario no encontrado');
  if (user.role === 'admin') return publicUser(user);

  const ts = nowIso();
  await getInstantAdminDb().transact([
    tx.prode_users[userId].update({
      registrationPaymentStatus: 'approved',
      registrationPaymentApprovedAt: ts,
      registrationPaymentReceipt: receipt ?? user.registrationPaymentReceipt ?? null,
      updatedAt: ts,
    }),
  ]);
  invalidateCoreStateCache();

  return publicUser({
    ...user,
    registrationPaymentStatus: 'approved',
    registrationPaymentApprovedAt: ts,
    registrationPaymentReceipt: receipt ?? user.registrationPaymentReceipt ?? null,
    updatedAt: ts,
  });
}

export async function markUserRegistrationPaymentPending(userId: string, paymentId?: string | null) {
  await ensureBaseData();
  const user = await queryUserByIdOnly(userId);
  if (!user) throw new Error('Usuario no encontrado');
  if (user.role === 'admin') return publicUser(user);
  if (user.registrationPaymentStatus === 'approved') return publicUser(user);

  const ts = nowIso();
  const pendingReceipt = paymentId ? `talo_pending:${paymentId}` : user.registrationPaymentReceipt ?? null;
  await getInstantAdminDb().transact([
    tx.prode_users[userId].update({
      registrationPaymentStatus: 'pending',
      registrationPaymentReceipt: pendingReceipt,
      updatedAt: ts,
    }),
  ]);
  invalidateCoreStateCache();

  return publicUser({
    ...user,
    registrationPaymentStatus: 'pending',
    registrationPaymentReceipt: pendingReceipt,
    updatedAt: ts,
  });
}

export async function getState(viewerToken?: string | null): Promise<StateResponse> {
  await ensureBaseData();
  const core = await getCoreStateSnapshot();
  const db = core.db;
  const leaderboard = core.leaderboard;
  const session = verifySession(viewerToken ?? null);
  const viewerUser = session
    ? db.users.find((u) => u.id === session.userId && u.role === session.role) ?? null
    : null;

  return {
    db,
    leaderboard,
    viewer: {
      isAuthenticated: Boolean(viewerUser),
      user: viewerUser,
      isAdmin: viewerUser?.role === 'admin',
    },
    summary: core.summary,
    trivia: {
      pointsPerQuestion: TRIVIA_POINTS_PER_QUESTION,
      cutoffAt: getTriviaCutoffAt(db.matches),
    },
  };
}

export async function getHomePageState() {
  await ensureBaseData();
  const core = await getCoreStateSnapshot();
  return {
    summary: core.summary,
    groups: core.db.groups,
    pointsConfig: core.db.pointsConfig,
    matches: core.db.matches,
    leaderboard: core.leaderboard,
    paidParticipants: core.db.users.filter(
      (user) => user.role !== 'admin' && user.registrationPaymentStatus === 'approved',
    ).length,
  };
}

export async function getLeaderboardPageState() {
  await ensureBaseData();
  const core = await getCoreStateSnapshot();
  return {
    leaderboard: core.leaderboard,
    pointsConfig: core.db.pointsConfig,
  };
}

export async function getResultsScreenState(viewerToken?: string | null): Promise<StateResponse> {
  await ensureBaseData();
  const [officialResults, officialTriviaResults] = await Promise.all([
    queryOfficialResultsOnly(),
    queryOfficialTriviaResultsOnly(),
  ]);
  const db = applyOfficialResultsToSeed(officialResults, officialTriviaResults);
  const session = verifySession(viewerToken ?? null);

  return {
    db,
    leaderboard: [],
    viewer: {
      isAuthenticated: Boolean(session),
      user: null,
      isAdmin: session?.role === 'admin',
    },
    summary: {
      users: 0,
      matches: db.matches.length,
      matchesWithOfficialResult: db.matches.filter((m) => m.officialResult).length,
      predictions: 0,
    },
    trivia: {
      pointsPerQuestion: TRIVIA_POINTS_PER_QUESTION,
      cutoffAt: getTriviaCutoffAt(db.matches),
    },
  };
}

export async function getPredictionsScreenState(viewerToken?: string | null): Promise<StateResponse> {
  await ensureBaseData();
  const session = verifySession(viewerToken ?? null);
  const officialResultsPromise = queryOfficialResultsOnly();
  const officialTriviaResultsPromise = queryOfficialTriviaResultsOnly();

  let viewerUser: User | null = null;
  let userPredictions: Prediction[] = [];
  let userTriviaPredictions: TriviaPrediction[] = [];
  if (session) {
    const [userDoc, userPredictionsDoc, userTriviaPredictionsDoc] = await Promise.all([
      queryUserByIdOnly(session.userId),
      queryUserPredictionsDocByUserOnly(session.userId),
      queryUserTriviaPredictionsDocByUserOnly(session.userId),
    ]);
    if (userDoc && userDoc.role === session.role) {
      viewerUser = publicUser(userDoc);
      if (userPredictionsDoc) {
        userPredictions = Object.entries(userPredictionsDoc.predictions ?? {}).map(([matchId, entry]) => ({
          id: `${userPredictionsDoc.id}:${matchId}`,
          userId: session.userId,
          matchId,
          homeGoals: entry.homeGoals,
          awayGoals: entry.awayGoals,
          updatedAt: entry.updatedAt,
        }));
      }
      if (userTriviaPredictionsDoc) {
        userTriviaPredictions = Object.entries(userTriviaPredictionsDoc.answers ?? {}).map(([questionId, entry]) => ({
          id: `${userTriviaPredictionsDoc.id}:${questionId}`,
          userId: session.userId,
          questionId,
          answer: entry.answer,
          updatedAt: entry.updatedAt,
        }));
      }
    }
  }

  const [officialResults, officialTriviaResults] = await Promise.all([
    officialResultsPromise,
    officialTriviaResultsPromise,
  ]);
  const db = applyOfficialResultsToSeed(officialResults, officialTriviaResults);
  db.users = viewerUser ? [viewerUser] : [];
  db.predictions = userPredictions;
  db.triviaPredictions = userTriviaPredictions;

  return {
    db,
    leaderboard: [],
    viewer: {
      isAuthenticated: Boolean(viewerUser),
      user: viewerUser,
      isAdmin: viewerUser?.role === 'admin',
    },
    summary: {
      users: viewerUser ? 1 : 0,
      matches: db.matches.length,
      matchesWithOfficialResult: db.matches.filter((m) => m.officialResult).length,
      predictions: db.predictions.length,
    },
    trivia: {
      pointsPerQuestion: TRIVIA_POINTS_PER_QUESTION,
      cutoffAt: getTriviaCutoffAt(db.matches),
    },
  };
}










export type LeaderboardUserGroup = {
  id: string;
  name: string;
  userIds: string[];
  createdAt: string;
  updatedAt: string;
};

export async function listUserLeaderboardGroups(userId: string): Promise<LeaderboardUserGroup[]> {
  await ensureBaseData();
  const docs = await queryUserLeaderboardGroupsOnly(userId);
  return docs
    .map((doc) => ({
      id: doc.id,
      name: doc.name,
      userIds: Array.isArray(doc.userIds) ? doc.userIds : [],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function createUserLeaderboardGroup(
  userId: string,
  input: { name: string; userIds: string[] },
): Promise<LeaderboardUserGroup> {
  await ensureBaseData();
  const name = sanitizeName(input.name ?? '');
  if (!name) throw new Error('El nombre del grupo es obligatorio');

  const users = await queryUsersOnly();
  const validUserIds = new Set(users.filter((u) => u.role !== 'admin').map((u) => u.id));
  const uniqueUserIds = Array.from(new Set((input.userIds ?? []).filter((id) => validUserIds.has(id))));
  if (!uniqueUserIds.length) throw new Error('Selecciona al menos un integrante');

  const id = randomUUID();
  const ts = nowIso();
  const doc: InstantLeaderboardGroupDoc = {
    id,
    userId,
    name,
    userIds: uniqueUserIds,
    createdAt: ts,
    updatedAt: ts,
  };

  await getInstantAdminDb().transact([
    tx.prode_user_leaderboard_groups[id].update(doc),
  ]);

  return {
    id: doc.id,
    name: doc.name,
    userIds: doc.userIds,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function deleteUserLeaderboardGroup(userId: string, groupId: string): Promise<void> {
  await ensureBaseData();
  const groups = await queryUserLeaderboardGroupsOnly(userId);
  const target = groups.find((g) => g.id === groupId);
  if (!target) throw new Error('Grupo no encontrado');

  await getInstantAdminDb().transact([
    tx.prode_user_leaderboard_groups[groupId].delete(),
  ]);
}



















