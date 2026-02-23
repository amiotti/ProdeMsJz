import { randomUUID } from 'node:crypto';

import { hashPassword, verifyPassword, verifySession } from '@/lib/auth';
import { getInstantAdminDb, tx } from '@/lib/instant';
import { computeLeaderboard } from '@/lib/prode';
import { createSeedDb } from '@/lib/seed';
import type { LeaderboardRow, Prediction, ProdeDB, Score, StateResponse, User } from '@/lib/types';

type UserRole = 'admin' | 'user';

type InstantUserDoc = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  photoDataUrl?: string | null;
  registrationPaymentStatus?: 'pending' | 'approved' | 'failed';
  registrationPaymentApprovedAt?: string | null;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

type InstantPredictionDoc = {
  id: string;
  userId: string;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  updatedAt: string;
  lockedAt: string;
};

type InstantOfficialResultDoc = {
  id: string;
  matchId: string;
  home: number;
  away: number;
  updatedAt: string;
};

type InstantConfigDoc = {
  id: string;
  key: string;
  exactScore: number;
  correctOutcome: number;
  updatedAt: string;
};

type InstantQueryResult = {
  prode_users?: InstantUserDoc[];
  prode_predictions?: InstantPredictionDoc[];
  prode_official_results?: InstantOfficialResultDoc[];
  prode_config?: InstantConfigDoc[];
};

let seedDbCache: ProdeDB | null = null;
let ensureBaseDataInFlight: Promise<void> | null = null;
let ensureBaseDataLastRunAt = 0;
let coreStateCache:
  | {
      expiresAt: number;
      db: ProdeDB;
      leaderboard: LeaderboardRow[];
      summary: StateResponse['summary'];
    }
  | null = null;
const CORE_STATE_TTL_MS = 5_000;

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
  };
}

function invalidateCoreStateCache() {
  coreStateCache = null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function publicUser(doc: InstantUserDoc): User {
  return {
    id: doc.id,
    firstName: doc.firstName,
    lastName: doc.lastName,
    phone: doc.phone,
    photoDataUrl: doc.photoDataUrl ?? null,
    registrationPaymentStatus: doc.registrationPaymentStatus ?? (doc.role === 'admin' ? 'approved' : 'pending'),
    registrationPaymentApprovedAt: doc.registrationPaymentApprovedAt ?? null,
    name: doc.name,
    email: doc.email,
    role: doc.role,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function sanitizePhone(phone: string) {
  return phone.trim();
}

function validateRegistrationInput(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photoDataUrl?: string | null;
  password: string;
}) {
  if (!input.firstName.trim()) throw new Error('El nombre es obligatorio');
  if (!input.lastName.trim()) throw new Error('El apellido es obligatorio');
  if (!input.email.trim()) throw new Error('El email es obligatorio');
  if (!input.phone.trim()) throw new Error('El telefono es obligatorio');
  if (!input.password || input.password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
}

async function queryAllInstant() {
  const db = getInstantAdminDb();
  const data = (await db.query({
    prode_users: {},
    prode_predictions: {},
    prode_official_results: {},
    prode_config: {},
  })) as InstantQueryResult;
  return {
    users: data.prode_users ?? [],
    predictions: data.prode_predictions ?? [],
    officialResults: data.prode_official_results ?? [],
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

async function queryOfficialResultsOnly() {
  const db = getInstantAdminDb();
  const data = (await db.query({ prode_official_results: {} })) as InstantQueryResult;
  return data.prode_official_results ?? [];
}

async function queryPredictionsByUserOnly(userId: string) {
  const db = getInstantAdminDb();
  const data = (await db.query({
    prode_predictions: { $: { where: { userId } } },
  })) as InstantQueryResult;
  return data.prode_predictions ?? [];
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
  const docs = await queryAllInstant();
  if (docs.config.some((c) => c.key === 'points')) return;
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

async function ensureBaseData() {
  const now = Date.now();
  if (now - ensureBaseDataLastRunAt < 15_000) return;
  if (ensureBaseDataInFlight) return ensureBaseDataInFlight;

  ensureBaseDataInFlight = (async () => {
    await ensureAdminUser();
    await ensureConfigDoc();
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

  const predictions: Prediction[] = data.predictions.map((p) => ({
    id: p.id,
    userId: p.userId,
    matchId: p.matchId,
    homeGoals: p.homeGoals,
    awayGoals: p.awayGoals,
    updatedAt: p.updatedAt,
  }));

  const officialByMatchId = new Map(data.officialResults.map((r) => [r.matchId, r] as const));

  const pointsDoc = data.config.find((c) => c.key === 'points');

  return {
    ...seed,
    users,
    predictions,
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

function applyOfficialResultsToSeed(officialResults: InstantOfficialResultDoc[]): ProdeDB {
  const seed = getSeedDbTemplate();
  const officialByMatchId = new Map(officialResults.map((r) => [r.matchId, r] as const));
  return {
    ...seed,
    pointsConfig: { ...seed.pointsConfig },
    groups: seed.groups.map((g) => ({ ...g, teams: [...g.teams] })),
    users: [],
    predictions: [],
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
    users: db.users.length,
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
  photoDataUrl?: string | null;
  password: string;
}): Promise<User> {
  await ensureBaseData();
  validateRegistrationInput(input);

  const email = normalizeEmail(input.email);
  const users = await queryUsersOnly();
  if (users.some((u) => normalizeEmail(u.email) === email)) {
    throw new Error('Ya existe un usuario con ese email');
  }

  const id = randomUUID();
  const ts = nowIso();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const phone = sanitizePhone(input.phone);

  const doc: InstantUserDoc = {
    id,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    email,
    phone,
    photoDataUrl: input.photoDataUrl ?? null,
    registrationPaymentStatus: 'pending',
    registrationPaymentApprovedAt: null,
    role: 'user',
    passwordHash: hashPassword(input.password),
    createdAt: ts,
    updatedAt: ts,
  };

  await getInstantAdminDb().transact([tx.prode_users[id].update(doc)]);
  invalidateCoreStateCache();
  return publicUser(doc);
}

export async function loginUser(input: { email: string; password: string }): Promise<User> {
  await ensureBaseData();
  const email = normalizeEmail(input.email);
  const users = await queryUsersOnly();
  const found = users.find((u) => normalizeEmail(u.email) === email);
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
  input: { firstName?: string; lastName?: string; phone?: string; photoDataUrl?: string | null; password?: string },
): Promise<User> {
  await ensureBaseData();
  const users = await queryUsersOnly();
  const current = users.find((u) => u.id === userId);
  if (!current) throw new Error('Usuario no encontrado');

  const firstName = (input.firstName ?? current.firstName).trim();
  const lastName = (input.lastName ?? current.lastName).trim();
  const phone = sanitizePhone(input.phone ?? current.phone);
  if (!firstName) throw new Error('El nombre es obligatorio');
  if (!lastName) throw new Error('El apellido es obligatorio');
  if (!phone) throw new Error('El telefono es obligatorio');

  const patch: Partial<InstantUserDoc> = {
    firstName,
    lastName,
    phone,
    photoDataUrl: input.photoDataUrl === undefined ? current.photoDataUrl ?? null : input.photoDataUrl,
    name: `${firstName} ${lastName}`.trim(),
    updatedAt: nowIso(),
  };

  if (typeof input.password === 'string' && input.password.length > 0) {
    if (input.password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
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
  const dbState = await readDb();
  const user = dbState.users.find((u) => u.id === userId);
  if (!user) throw new Error('Usuario no encontrado');
  if (user.role === 'admin') throw new Error('El administrador no puede cargar predicciones');
  if (user.registrationPaymentStatus !== 'approved') {
    throw new Error('Debes tener el pago de inscripción aprobado para cargar predicciones');
  }

  const matchById = new Map(dbState.matches.map((m) => [m.id, m] as const));
  const existing = await queryAllInstant();
  const existingByUserMatch = new Map(
    existing.predictions.filter((p) => p.userId === userId).map((p) => [p.matchId, p] as const),
  );

  const operations: any[] = [];
  const lockedMatches: string[] = [];
  const ts = nowIso();
  const nowMs = Date.now();

  for (const item of items) {
    const match = matchById.get(item.matchId);
    if (!match) continue;
    if (!Number.isInteger(item.homeGoals) || item.homeGoals < 0) continue;
    if (!Number.isInteger(item.awayGoals) || item.awayGoals < 0) continue;

    if (!isPredictionWindowOpen(match.kickoffAt, nowMs)) {
      lockedMatches.push(item.matchId);
      continue;
    }

    const existingPrediction = existingByUserMatch.get(item.matchId);
    if (existingPrediction) {
      operations.push(
        tx.prode_predictions[existingPrediction.id].update({
          homeGoals: item.homeGoals,
          awayGoals: item.awayGoals,
          updatedAt: ts,
        }),
      );
      continue;
    }

    const id = randomUUID();
    operations.push(
      tx.prode_predictions[id].update({
        id,
        userId,
        matchId: item.matchId,
        homeGoals: item.homeGoals,
        awayGoals: item.awayGoals,
        updatedAt: ts,
        lockedAt: ts,
      }),
    );
    existingByUserMatch.set(item.matchId, {
      id,
      userId,
      matchId: item.matchId,
      homeGoals: item.homeGoals,
      awayGoals: item.awayGoals,
      updatedAt: ts,
      lockedAt: ts,
    });
  }

  if (operations.length > 0) {
    await getInstantAdminDb().transact(operations);
    invalidateCoreStateCache();
  }

  return { lockedMatches };
}

export async function saveOfficialResults(items: Array<{ matchId: string; home: number; away: number }>) {
  await ensureBaseData();
  const base = getSeedDbTemplate();
  const validMatchIds = new Set(base.matches.map((m) => m.id));
  const current = await queryAllInstant();
  const byMatchId = new Map(current.officialResults.map((r) => [r.matchId, r] as const));
  const ts = nowIso();
  const operations: any[] = [];

  for (const item of items) {
    if (!validMatchIds.has(item.matchId)) continue;
    if (!Number.isInteger(item.home) || item.home < 0) continue;
    if (!Number.isInteger(item.away) || item.away < 0) continue;

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

export async function deleteUserAccount(userId: string) {
  await ensureBaseData();
  const current = await queryAllInstant();
  const user = current.users.find((u) => u.id === userId);
  if (!user) throw new Error('Usuario no encontrado');
  if (user.role === 'admin') throw new Error('El administrador no puede eliminarse desde Usuarios');

  const operations: any[] = current.predictions
    .filter((p) => p.userId === userId)
    .map((p) => tx.prode_predictions[p.id].delete());
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

  const operations: any[] = current.predictions
    .filter((p) => p.userId === targetUserId)
    .map((p) => tx.prode_predictions[p.id].delete());
  operations.push(tx.prode_users[targetUserId].delete());
  await getInstantAdminDb().transact(operations);
  invalidateCoreStateCache();
}

export async function markUserRegistrationPaymentApproved(userId: string) {
  await ensureBaseData();
  const user = await queryUserByIdOnly(userId);
  if (!user) throw new Error('Usuario no encontrado');
  if (user.role === 'admin') return publicUser(user);

  const ts = nowIso();
  await getInstantAdminDb().transact([
    tx.prode_users[userId].update({
      registrationPaymentStatus: 'approved',
      registrationPaymentApprovedAt: ts,
      updatedAt: ts,
    }),
  ]);
  invalidateCoreStateCache();

  return publicUser({
    ...user,
    registrationPaymentStatus: 'approved',
    registrationPaymentApprovedAt: ts,
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
  };
}

export async function getResultsScreenState(viewerToken?: string | null): Promise<StateResponse> {
  await ensureBaseData();
  const officialResults = await queryOfficialResultsOnly();
  const db = applyOfficialResultsToSeed(officialResults);
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
  };
}

export async function getPredictionsScreenState(viewerToken?: string | null): Promise<StateResponse> {
  await ensureBaseData();
  const session = verifySession(viewerToken ?? null);
  const officialResultsPromise = queryOfficialResultsOnly();

  let viewerUser: User | null = null;
  let userPredictions: InstantPredictionDoc[] = [];
  if (session) {
    const [userDoc, predictionsDocs] = await Promise.all([
      queryUserByIdOnly(session.userId),
      queryPredictionsByUserOnly(session.userId),
    ]);
    if (userDoc && userDoc.role === session.role) {
      viewerUser = publicUser(userDoc);
      userPredictions = predictionsDocs;
    }
  }

  const officialResults = await officialResultsPromise;
  const db = applyOfficialResultsToSeed(officialResults);
  db.users = viewerUser ? [viewerUser] : [];
  db.predictions = userPredictions.map((p) => ({
    id: p.id,
    userId: p.userId,
    matchId: p.matchId,
    homeGoals: p.homeGoals,
    awayGoals: p.awayGoals,
    updatedAt: p.updatedAt,
  }));

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
  };
}
