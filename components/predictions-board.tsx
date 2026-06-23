'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { TeamFormDialog } from '@/components/team-form-dialog';
import { TeamFormSummary } from '@/components/team-form-summary';
import { TeamName } from '@/components/team-name';
import { formatDateArgentinaShort, formatKickoffArgentina } from '@/lib/datetime';
import { calculatePredictionPoints, isTriviaAnswerMatch } from '@/lib/prode';
import { getRecentTeamResults } from '@/lib/team-form';
import type { Match, StateResponse, TriviaQuestion } from '@/lib/types';
import { estimateMatchProbabilities, getTeamDisplayName } from '@/lib/worldcup26';

type DraftMap = Record<string, { home: string; away: string }>;
type TriviaDraftMap = Record<string, string>;
type ViewMode = 'group' | 'date';
type MatchSection = { id: string; title: string; matches: Match[]; saveLabel: string };
type DateMatch = Match & { _meta: string };
type DateSection = { label: string; matches: DateMatch[] };
type SavePredictionsResponse = {
  ok: boolean;
  state?: StateResponse;
  savedMatchIds?: string[];
  lockedMatches?: string[];
  invalidMatches?: string[];
  error?: string;
};

const DRAFT_STORAGE_PREFIX = 'prode:prediction-drafts:';
const KNOCKOUT_STAGE_LABELS: Record<string, string> = {
  '16avos': 'Eliminatoria 32',
  '8vos': 'Octavos de Final',
  Cuartos: 'Cuartos de Final',
  Semifinal: 'Semifinales',
  'Tercer puesto': 'Tercer Puesto',
  Final: 'Final',
};

function draftStorageKey(userId: string) {
  return DRAFT_STORAGE_PREFIX + userId;
}

function readStoredDrafts(userId: string): DraftMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(draftStorageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { drafts?: DraftMap };
    return parsed.drafts && typeof parsed.drafts === 'object' ? parsed.drafts : {};
  } catch {
    return {};
  }
}

function persistStoredDrafts(userId: string, drafts: DraftMap, dirtyMatchIds: Set<string>) {
  if (typeof window === 'undefined') return;
  const pending = Object.fromEntries(
    Array.from(dirtyMatchIds)
      .map((matchId) => [matchId, drafts[matchId]] as const)
      .filter((entry): entry is [string, { home: string; away: string }] => Boolean(entry[1])),
  );
  try {
    if (Object.keys(pending).length === 0) {
      window.localStorage.removeItem(draftStorageKey(userId));
    } else {
      window.localStorage.setItem(draftStorageKey(userId), JSON.stringify({ drafts: pending, updatedAt: Date.now() }));
    }
  } catch {
    // Storage can be unavailable in private or restricted mobile browser modes.
  }
}

function sortMatches(a: Match, b: Match) {
  return new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
}

function buildDateSections(matches: DateMatch[]) {
  const ordered = [...matches].sort(sortMatches);
  const byDate = new Map<string, DateSection>();
  for (const match of ordered) {
    const dateKey = formatDateArgentinaShort(match.kickoffAt);
    if (!byDate.has(dateKey)) byDate.set(dateKey, { label: dateKey, matches: [] });
    byDate.get(dateKey)!.matches.push(match);
  }
  return [...byDate.values()];
}

function isPredictionEditable(kickoffAt: string, nowMs = Date.now()) {
  const kickoffMs = new Date(kickoffAt).getTime();
  if (!Number.isFinite(kickoffMs)) return false;
  return nowMs < kickoffMs - 60 * 60 * 1000;
}

function redirectToLoginAfterExpiredSession() {
  if (typeof window === 'undefined') return;
  window.location.assign('/login');
}

async function readJsonResponse(response: Response) {
  if (response.status === 401) {
    redirectToLoginAfterExpiredSession();
    throw new Error('Tu sesión venció. Volvé a iniciar sesión para guardar predicciones.');
  }
  return response.json();
}

function normalizeTriviaInput(value: string, question: TriviaQuestion) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (question.answerType === 'number') {
    if (!/^\d+$/.test(trimmed)) return '';
    return String(Number(trimmed));
  }
  return trimmed;
}

function getPredictionStageTitle(match: Match) {
  if (match.groupId !== 'KO') return 'Fase de Grupos';
  return KNOCKOUT_STAGE_LABELS[match.stage ?? ''] ?? match.stage ?? 'Fase Final';
}

export function PredictionsBoard({
  initialState = null,
  registrationAmountArs,
}: {
  initialState?: StateResponse | null;
  registrationAmountArs: number;
}) {
  const [state, setState] = useState<StateResponse | null>(initialState);
  const [loading, setLoading] = useState(!initialState);
  const [saving, setSaving] = useState(false);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [savingSectionId, setSavingSectionId] = useState<string | null>(null);
  const [savingTrivia, setSavingTrivia] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState('TODAY');
  const [viewMode, setViewMode] = useState<ViewMode>('date');
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [triviaDrafts, setTriviaDrafts] = useState<TriviaDraftMap>({});
  const awayInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const dirtyMatchIdsRef = useRef<Set<string>>(new Set());
  const dirtyTriviaQuestionIdsRef = useRef<Set<string>>(new Set());
  const savingLockRef = useRef(false);
  const syncedUserIdRef = useRef<string | null>(initialState?.viewer.user?.id ?? null);
  const [optimisticSavedMatchIds, setOptimisticSavedMatchIds] = useState<Set<string>>(new Set());
  const [selectedFormTeam, setSelectedFormTeam] = useState<string | null>(null);

  async function loadState() {
    setLoading(true);
    const response = await fetch('/api/predictions/state', { cache: 'no-store' });
    const data = (await readJsonResponse(response)) as StateResponse;
    if (!data.viewer.user && state?.viewer.user) {
      redirectToLoginAfterExpiredSession();
      throw new Error('Tu sesión venció. Volvé a iniciar sesión.');
    }
    setState(data);
    setLoading(false);
    return data;
  }

  useEffect(() => {
    if (initialState) return;
    loadState().catch(() => {
      setLoading(false);
      setMessage('No se pudo cargar el estado del PRODE.');
    });
  }, [initialState]);

  useEffect(() => {
    if (!state?.viewer.user) return;
    const userId = state.viewer.user.id;
    const userChanged = syncedUserIdRef.current !== userId;
    if (userChanged) {
      dirtyMatchIdsRef.current.clear();
      dirtyTriviaQuestionIdsRef.current.clear();
      syncedUserIdRef.current = userId;
      setOptimisticSavedMatchIds(new Set());
    }

    const nextDrafts: DraftMap = {};
    for (const prediction of state.db.predictions.filter((p) => p.userId === userId)) {
      nextDrafts[prediction.matchId] = {
        home: String(prediction.homeGoals),
        away: String(prediction.awayGoals),
      };
    }

    const storedDrafts = readStoredDrafts(userId);
    let recoveredDrafts = 0;
    for (const [matchId, storedScore] of Object.entries(storedDrafts)) {
      const savedScore = nextDrafts[matchId];
      if (savedScore?.home === storedScore.home && savedScore.away === storedScore.away) continue;
      nextDrafts[matchId] = storedScore;
      dirtyMatchIdsRef.current.add(matchId);
      recoveredDrafts += 1;
    }
    if (recoveredDrafts > 0) {
      setMessage(
        `Se recuperaron ${recoveredDrafts} borrador(es) sin confirmar de este dispositivo. Presiona Guardar para enviarlos.`,
      );
    }
    setDrafts((prev) => {
      if (userChanged) return nextDrafts;
      const merged = { ...nextDrafts };
      for (const matchId of dirtyMatchIdsRef.current) {
        if (prev[matchId]) merged[matchId] = prev[matchId];
      }
      return merged;
    });

    const nextTriviaDrafts: TriviaDraftMap = {};
    for (const prediction of state.db.triviaPredictions.filter((p) => p.userId === userId)) {
      nextTriviaDrafts[prediction.questionId] = prediction.answer;
    }
    setTriviaDrafts((prev) => {
      if (userChanged) return nextTriviaDrafts;
      const merged = { ...nextTriviaDrafts };
      for (const questionId of dirtyTriviaQuestionIdsRef.current) {
        if (prev[questionId] !== undefined) merged[questionId] = prev[questionId];
      }
      return merged;
    });
  }, [state]);

  const currentUser = state?.viewer.user ?? null;

  useEffect(() => {
    if (!currentUser) return;
    persistStoredDrafts(currentUser.id, drafts, dirtyMatchIdsRef.current);
  }, [currentUser, drafts]);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (dirtyMatchIdsRef.current.size === 0) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, []);

  const hasApprovedPayment = currentUser?.registrationPaymentStatus === 'approved';
  const isAnySaving = saving || savingMatchId !== null || savingSectionId !== null || savingTrivia;

  const lockedMatchIds = useMemo(() => {
    const nowMs = Date.now();
    return new Set(state?.db.matches.filter((m) => !isPredictionEditable(m.kickoffAt, nowMs)).map((m) => m.id) ?? []);
  }, [state?.db.matches]);

  const triviaQuestionById = useMemo(
    () => new Map(state?.db.triviaQuestions.map((question) => [question.id, question] as const) ?? []),
    [state?.db.triviaQuestions],
  );

  const triviaCutoffAt = state?.trivia.cutoffAt ?? null;
  const triviaEditable = useMemo(() => {
    if (!triviaCutoffAt) return false;
    const cutoffMs = new Date(triviaCutoffAt).getTime();
    if (!Number.isFinite(cutoffMs)) return false;
    return Date.now() < cutoffMs;
  }, [triviaCutoffAt]);

  const allMatches = useMemo(() => {
    return [...(state?.db.matches ?? [])].sort(sortMatches);
  }, [state?.db.matches]);
  const recentResultsByTeam = useMemo(() => {
    const teams = new Set(allMatches.flatMap((match) => [match.homeTeam, match.awayTeam]));
    return new Map(
      Array.from(teams, (teamName) => [teamName, getRecentTeamResults(teamName, allMatches)] as const),
    );
  }, [allMatches]);

  const groupSections = useMemo(() => {
    if (!state) return [] as MatchSection[];
    return state.db.groups
      .map((group) => ({
        id: group.id,
        title: group.name,
        matches: allMatches.filter((match) => match.groupId === group.id),
        saveLabel: 'Guardar grupo',
      }))
      .filter((section) => section.matches.length > 0);
  }, [allMatches, state]);

  const knockoutSections = useMemo(() => {
    const byStage = new Map<string, Match[]>();
    for (const match of allMatches.filter((item) => item.groupId === 'KO')) {
      const stage = match.stage ?? 'Fase final';
      const list = byStage.get(stage) ?? [];
      list.push(match);
      byStage.set(stage, list);
    }
    return [...byStage.entries()].map(([stage, matches]) => ({
      id: `KO-${stage}`,
      title: stage,
      matches,
      saveLabel: 'Guardar etapa',
    }));
  }, [allMatches]);

  const savedPredictedMatchIds = useMemo(() => {
    const saved = new Set(
      state?.db.predictions
        .filter((prediction) => prediction.userId === currentUser?.id)
        .map((prediction) => prediction.matchId) ?? [],
    );
    for (const matchId of optimisticSavedMatchIds) saved.add(matchId);
    return saved;
  }, [currentUser?.id, optimisticSavedMatchIds, state?.db.predictions]);
  const predictionProgress = useMemo(() => {
    const total = allMatches.length;
    const saved = allMatches.reduce(
      (count, match) => count + (savedPredictedMatchIds.has(match.id) ? 1 : 0),
      0,
    );

    return {
      saved,
      total,
      percentage: total > 0 ? Math.round((saved / total) * 100) : 0,
    };
  }, [allMatches, savedPredictedMatchIds]);

  const visibleSections = useMemo(() => {
    const todayKey = formatDateArgentinaShort(new Date().toISOString());
    const withoutPrediction = (match: Match) => !lockedMatchIds.has(match.id) && !savedPredictedMatchIds.has(match.id);

    const filterUnpredicted = (sections: MatchSection[]) =>
      sections
        .map((section) => ({
          ...section,
          matches: section.matches.filter((match) => withoutPrediction(match)),
        }))
        .filter((section) => section.matches.length > 0);

    const sections: MatchSection[] = [];
    if (selectedGroupId === 'TODAY') {
      const todayMatches = allMatches.filter((match) => formatDateArgentinaShort(match.kickoffAt) === todayKey);
      if (todayMatches.length > 0) {
        sections.push({
          id: 'TODAY',
          title: 'Hoy',
          matches: todayMatches,
          saveLabel: 'Guardar partidos de hoy',
        });
      }
    } else if (selectedGroupId === 'ALL') {
      sections.push(...groupSections);
      sections.push(...knockoutSections);
    } else if (selectedGroupId === 'UNPREDICTED') {
      sections.push(...filterUnpredicted(groupSections));
      sections.push(...filterUnpredicted(knockoutSections));
    } else if (selectedGroupId === 'KO') {
      sections.push(...knockoutSections);
    } else if (selectedGroupId !== 'TRIVIA') {
      sections.push(...groupSections.filter((section) => section.id === selectedGroupId));
    }
    return sections;
  }, [allMatches, groupSections, knockoutSections, lockedMatchIds, savedPredictedMatchIds, selectedGroupId]);

  const visibleDateSections = useMemo(() => {
    const flat: DateMatch[] = visibleSections.flatMap((section) =>
      section.matches.map((match) => ({ ...match, _meta: section.title })),
    );
    return buildDateSections(flat);
  }, [visibleSections]);

  const dateSectionsByPhase = useMemo(() => {
    const flat: DateMatch[] = visibleSections.flatMap((section) =>
      section.matches.map((match) => ({ ...match, _meta: section.title })),
    );
    const groupMatches = flat.filter((match) => match.groupId !== 'KO');
    const knockoutMatches = flat.filter((match) => match.groupId === 'KO');
    return {
      group: buildDateSections(groupMatches),
      knockout: buildDateSections(knockoutMatches),
    };
  }, [visibleSections]);

  function setDraft(matchId: string, side: 'home' | 'away', value: string) {
    if (!hasApprovedPayment) return;
    if (lockedMatchIds.has(matchId)) return;
    if (value && !/^\d+$/.test(value)) return;

    dirtyMatchIdsRef.current.add(matchId);
    setDrafts((prev) => ({
      ...prev,
      [matchId]: {
        home: prev[matchId]?.home ?? '',
        away: prev[matchId]?.away ?? '',
        [side]: value,
      },
    }));
  }

  function setHomeDraftAndAdvance(matchId: string, value: string) {
    setDraft(matchId, 'home', value);
    if (/^\d+$/.test(value)) {
      window.requestAnimationFrame(() => awayInputRefs.current[matchId]?.focus());
    }
  }

  function setTriviaDraft(questionId: string, value: string) {
    if (!hasApprovedPayment) return;
    dirtyTriviaQuestionIdsRef.current.add(questionId);
    setTriviaDrafts((prev) => ({ ...prev, [questionId]: value }));
  }

  function applyPredictionSaveResponse(
    data: SavePredictionsResponse,
    submitted: Array<{ matchId: string; homeGoals: number; awayGoals: number }>,
    successMessage: string,
  ) {
    const savedIds = new Set(data.savedMatchIds ?? []);
    const lockedIds = data.lockedMatches ?? [];
    const invalidIds = data.invalidMatches ?? [];

    if (!data.state) throw new Error('El servidor no devolvió la confirmación de guardado. Tus borradores siguen disponibles.');

    const confirmedById = new Map(
      data.state.db.predictions
        .filter((prediction) => prediction.userId === currentUser?.id)
        .map((prediction) => [prediction.matchId, prediction] as const),
    );
    const unverified = submitted.filter((prediction) => {
      if (!savedIds.has(prediction.matchId)) return false;
      const confirmed = confirmedById.get(prediction.matchId);
      return confirmed?.homeGoals !== prediction.homeGoals || confirmed.awayGoals !== prediction.awayGoals;
    });
    if (unverified.length > 0) {
      throw new Error('No se pudo verificar el guardado en la base. Tus borradores siguen disponibles para reintentar.');
    }

    for (const matchId of savedIds) dirtyMatchIdsRef.current.delete(matchId);
    if (currentUser) persistStoredDrafts(currentUser.id, drafts, dirtyMatchIdsRef.current);

    setOptimisticSavedMatchIds((prev) => {
      const next = new Set(prev);
      for (const matchId of savedIds) next.add(matchId);
      return next;
    });
    setState(data.state);

    if (lockedIds.length > 0 || invalidIds.length > 0) {
      const rejected = lockedIds.length + invalidIds.length;
      setMessage(
        savedIds.size > 0
          ? `${savedIds.size} predicción(es) guardada(s). ${rejected} no se guardaron porque estaban cerradas o eran inválidas.`
          : 'No se guardó ninguna predicción: los partidos ya estaban cerrados o los datos eran inválidos.',
      );
      return;
    }

    if (savedIds.size !== submitted.length) {
      setMessage('El servidor no confirmó todas las predicciones. Los borradores no confirmados siguen disponibles.');
      return;
    }
    setMessage(successMessage);
  }
  async function savePredictions(targetMatchId?: string) {
    if (!currentUser) {
      setMessage('Debes iniciar sesión para cargar predicciones.');
      return;
    }
    if (!hasApprovedPayment) {
      setMessage('Debes tener la inscripción aprobada para guardar predicciones.');
      return;
    }
    if (savingLockRef.current) {
      setMessage('Ya hay un guardado en curso. Espera a que termine antes de volver a guardar.');
      return;
    }

    const predictions = Object.entries(drafts)
      .filter(
        ([matchId, score]) =>
          dirtyMatchIdsRef.current.has(matchId) &&
          (!targetMatchId || matchId === targetMatchId) &&
          !lockedMatchIds.has(matchId) &&
          score.home !== '' &&
          score.away !== '',
      )
      .map(([matchId, score]) => ({
        matchId,
        homeGoals: Number(score.home),
        awayGoals: Number(score.away),
      }));

    if (predictions.length === 0) {
      setMessage('No hay nuevas predicciones para guardar.');
      return;
    }

    savingLockRef.current = true;
    if (targetMatchId) setSavingMatchId(targetMatchId);
    else setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictions }),
      });
      const data = (await readJsonResponse(response)) as SavePredictionsResponse;
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo guardar');

      applyPredictionSaveResponse(
        data,
        predictions,
        targetMatchId ? 'Predicción guardada y verificada correctamente.' : 'Predicciones guardadas y verificadas correctamente.',
      );
      window.dispatchEvent(new Event('prode-predictions-changed'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al guardar predicciones');
    } finally {
      savingLockRef.current = false;
      if (targetMatchId) setSavingMatchId(null);
      else setSaving(false);
    }
  }

  async function saveSectionPredictions(sectionId: string, matchIds: string[]) {
    if (!currentUser) {
      setMessage('Debes iniciar sesión para cargar predicciones.');
      return;
    }
    if (!hasApprovedPayment) {
      setMessage('Debes tener la inscripción aprobada para guardar predicciones.');
      return;
    }
    if (savingLockRef.current) {
      setMessage('Ya hay un guardado en curso. Espera a que termine antes de volver a guardar.');
      return;
    }

    const predictions = Object.entries(drafts)
      .filter(
        ([matchId, score]) =>
          dirtyMatchIdsRef.current.has(matchId) &&
          matchIds.includes(matchId) &&
          !lockedMatchIds.has(matchId) &&
          score.home !== '' &&
          score.away !== '',
      )
      .map(([matchId, score]) => ({
        matchId,
        homeGoals: Number(score.home),
        awayGoals: Number(score.away),
      }));

    if (predictions.length === 0) {
      setMessage('No hay predicciones nuevas para guardar en esta sección.');
      return;
    }

    savingLockRef.current = true;
    setSavingSectionId(sectionId);
    setMessage(null);
    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictions }),
      });
      const data = (await readJsonResponse(response)) as SavePredictionsResponse;
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo guardar');

      applyPredictionSaveResponse(data, predictions, 'Predicciones guardadas y verificadas correctamente.');
      window.dispatchEvent(new Event('prode-predictions-changed'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al guardar predicciones');
    } finally {
      savingLockRef.current = false;
      setSavingSectionId(null);
    }
  }

  async function saveTriviaAnswers() {
    if (!currentUser) {
      setMessage('Debes iniciar sesión para cargar trivias.');
      return;
    }
    if (!hasApprovedPayment) {
      setMessage('Debes tener la inscripción aprobada para guardar trivias.');
      return;
    }
    if (savingLockRef.current) {
      setMessage('Ya hay un guardado en curso. Espera a que termine antes de volver a guardar.');
      return;
    }

    const triviaAnswers = Object.entries(triviaDrafts)
      .map(([questionId, answer]) => {
        const question = triviaQuestionById.get(questionId);
        if (!question) return null;
        const normalized = normalizeTriviaInput(answer, question);
        if (!normalized) return null;
        return { questionId, answer: normalized };
      })
      .filter((item): item is { questionId: string; answer: string } => Boolean(item));

    if (triviaAnswers.length === 0) {
      setMessage('No hay respuestas de trivia para guardar.');
      return;
    }

    savingLockRef.current = true;
    setSavingTrivia(true);
    setMessage(null);
    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triviaAnswers }),
      });
      const data = (await readJsonResponse(response)) as SavePredictionsResponse;
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo guardar la trivia');
      if (!data.state) throw new Error('El servidor no devolvió la confirmación de guardado de la trivia.');

      for (const answer of triviaAnswers) {
        dirtyTriviaQuestionIdsRef.current.delete(answer.questionId);
      }
      setState(data.state);
      setMessage('Trivia guardada correctamente.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al guardar trivia');
    } finally {
      savingLockRef.current = false;
      setSavingTrivia(false);
    }
  }


  function renderTriviaPanel(key: string, readOnly = false) {
    const triviaReadOnly = readOnly || !triviaEditable;
    return (
      <div key={key} className="panel stack-md">
        <div className="section-head">
          <h3>Trivia Mundial 2026</h3>
          <span>{state?.trivia.pointsPerQuestion ?? 10} puntos por cada respuesta correcta</span>
        </div>
        <p className="muted">
          Puedes responder la trivia hasta antes del comienzo del primer partido del Mundial.
          {triviaCutoffAt ? ` Cierre: ${formatKickoffArgentina(triviaCutoffAt)}.` : ''}
        </p>
        {!triviaEditable ? (
          <p className="status">La trivia está cerrada porque ya comenzó el primer partido del Mundial.</p>
        ) : null}
        {readOnly ? (
          <p className="status">Vista de solo lectura: habilita tu inscripción para editar y guardar.</p>
        ) : null}
        <div className="stack-md">
          {state?.db.triviaQuestions.map((question, index) => {
            const official = state.db.triviaResults.find((result) => result.questionId === question.id);
            const userAnswer = triviaDrafts[question.id] ?? '';
            const hasOfficialAnswer = Boolean(official?.answer.trim());
            const triviaPoints = hasOfficialAnswer && userAnswer.trim() && official
              ? isTriviaAnswerMatch(userAnswer, official.answer)
                ? state.trivia.pointsPerQuestion
                : 0
              : null;

            return (
              <label key={question.id} className={`stack-xs trivia-question-card${triviaPoints !== null ? ' has-points-badge' : ''}`}>
                {triviaPoints !== null ? <span className="prediction-points-badge trivia-points-badge">{triviaPoints} pts</span> : null}
                <span>
                  {index + 1}. {question.prompt}
                </span>
                <input
                  id={`trivia-${question.id}`}
                  name={`trivia-${question.id}`}
                  value={userAnswer}
                  onChange={(event) => setTriviaDraft(question.id, event.target.value)}
                  placeholder={question.answerType === 'number' ? 'Ingresa un número' : 'Escribe tu respuesta'}
                  inputMode={question.answerType === 'number' ? 'numeric' : undefined}
                  disabled={triviaReadOnly || isAnySaving}
                />
                {hasOfficialAnswer ? (
                  <p className="official-result">Resultado oficial: {official?.answer}</p>
                ) : null}
              </label>
            );
          })}
        </div>
        <div className="fixture-inline" style={{ justifyContent: 'flex-start' }}>
          <button className="btn btn-primary" type="button" onClick={saveTriviaAnswers} disabled={triviaReadOnly || isAnySaving}>
            {savingTrivia ? 'Guardando...' : 'Guardar trivia'}
          </button>
        </div>
      </div>
    );
  }

  function renderMatchCard(match: Match, readOnly = false) {
    const draft = drafts[match.id] ?? { home: '', away: '' };
    const matchIsDirty = dirtyMatchIdsRef.current.has(match.id);
    const matchIsSaved = savedPredictedMatchIds.has(match.id) && !matchIsDirty;
    const matchReadOnly = readOnly || lockedMatchIds.has(match.id);
    const kickoff = formatKickoffArgentina(match.kickoffAt);
    const headerMeta = match.groupId === 'KO' ? match.stage ?? 'Fase final' : `Grupo ${match.groupId} - Fecha ${match.matchday}`;
    const showProbabilities = lockedMatchIds.has(match.id);
    const probabilities = showProbabilities ? estimateMatchProbabilities(match.homeTeam, match.awayTeam) : null;
    const pointsConfig = state?.db.pointsConfig;
    const earnedPoints =
      pointsConfig && match.officialResult && draft.home !== '' && draft.away !== ''
        ? calculatePredictionPoints(
            { homeGoals: Number(draft.home), awayGoals: Number(draft.away) },
            match.officialResult,
            pointsConfig,
          ).points
        : null;

    return (
      <div key={match.id} className={`match-card${earnedPoints !== null ? ' has-points-badge' : ''}`}>
        {earnedPoints !== null ? <span className="prediction-points-badge">{earnedPoints} pts</span> : null}
        <div className="match-main">
          <p className="match-meta">{headerMeta} - {kickoff}</p>
          <div className="fixture-row prediction-fixture-row">
            <div className="prediction-team-column">
              <TeamName teamName={match.homeTeam} linkToTeam />
              <TeamFormSummary
                teamName={match.homeTeam}
                results={recentResultsByTeam.get(match.homeTeam) ?? []}
                onOpen={() => setSelectedFormTeam(match.homeTeam)}
              />
            </div>
            <span className="vs">vs</span>
            <div className="prediction-team-column">
              <TeamName teamName={match.awayTeam} linkToTeam />
              <TeamFormSummary
                teamName={match.awayTeam}
                results={recentResultsByTeam.get(match.awayTeam) ?? []}
                onOpen={() => setSelectedFormTeam(match.awayTeam)}
              />
            </div>
          </div>
          {probabilities ? (
            <p className="prob-row">
              Probabilidades: {getTeamDisplayName(match.homeTeam)} {probabilities.homeWinPct}% · Empate {probabilities.drawPct}% ·{' '}
              {getTeamDisplayName(match.awayTeam)} {probabilities.awayWinPct}%
            </p>
          ) : null}
          {match.officialResult ? (
            <p className="official-result">
              Resultado oficial: {match.officialResult.home} - {match.officialResult.away}
            </p>
          ) : null}
        </div>

        <div className="score-inputs score-inputs-with-action">
          <input
            id={`pred-home-${match.id}`}
            name={`pred-home-${match.id}`}
            inputMode="numeric"
            value={draft.home}
            onChange={(e) => setHomeDraftAndAdvance(match.id, e.target.value)}
            aria-label={`Goles ${match.homeTeam}`}
            disabled={matchReadOnly}
          />
          <span className="score-divider">-</span>
          <input
            id={`pred-away-${match.id}`}
            name={`pred-away-${match.id}`}
            inputMode="numeric"
            ref={(node) => {
              awayInputRefs.current[match.id] = node;
            }}
            value={draft.away}
            onChange={(e) => setDraft(match.id, 'away', e.target.value)}
            aria-label={`Goles ${match.awayTeam}`}
            disabled={matchReadOnly}
          />
          <button
            className="btn btn-primary btn-small"
            type="button"
            onClick={() => savePredictions(match.id)}
            disabled={matchReadOnly || isAnySaving || !matchIsDirty || draft.home === '' || draft.away === ''}
          >
            {savingMatchId === match.id ? 'Guardando...' : matchIsSaved ? 'Guardada' : 'Guardar'}
          </button>
        </div>
      </div>
    );
  }

  function renderMatchList(matches: Match[], readOnly = false) {
    let previousTitle: string | null = null;
    return matches.map((match) => {
      const stageTitle = getPredictionStageTitle(match);
      const shouldShowTitle = stageTitle !== previousTitle;
      previousTitle = stageTitle;
      return (
        <div key={`stage-wrap-${match.id}`} className="prediction-stage-block">
          {shouldShowTitle ? <h4 className="prediction-stage-title">{stageTitle}</h4> : null}
          {renderMatchCard(match, readOnly)}
        </div>
      );
    });
  }

  if (loading || !state) {
    return <div className="panel">Cargando predicciones...</div>;
  }

  if (!state.viewer.isAuthenticated || !currentUser) {
    return (
      <div className="panel stack-md">
        <h3>Predicciones</h3>
        <p className="muted">Debes iniciar sesión para cargar tus pronósticos. Puedes editar cada partido hasta 1 hora antes del inicio.</p>
        <div className="cta-row">
          <Link className="cta-link" href="/login">
            Ingresar
          </Link>
          <Link className="cta-link" href="/register">
            Crear cuenta
          </Link>
        </div>
      </div>
    );
  }

  if (currentUser.role === 'admin') {
    return (
      <div className="panel stack-md">
        <h3>Predicciones</h3>
        <p className="muted">El perfil administrador no puede cargar predicciones y no participa en la tabla de posiciones.</p>
      </div>
    );
  }

  const shouldShowTriviaPanel = selectedGroupId === 'ALL' || selectedGroupId === 'TRIVIA';
  const showTriviaBeforeMatches = shouldShowTriviaPanel && triviaEditable;
  const showTriviaAfterMatches = shouldShowTriviaPanel && !triviaEditable;

  return (
    <section className="stack-lg predictions-board">
      {!hasApprovedPayment ? (
        <div className="panel stack-md blocked-payment-panel">
          <h3>Predicciones bloqueadas hasta confirmar pago</h3>
          <p className="muted">
            Debes completar y confirmar el pago de <strong>${registrationAmountArs.toLocaleString('es-AR')}</strong> para acceder a la carga de predicciones.
          </p>
          <div className="stack-xs">
            <p className="muted">
              Puedes transferir directamente al alias <strong>amiotti.mp</strong>
            </p>
            <p className="muted">
              Si transfieres, envía el comprobante de pago por WhatsApp al <strong>+5493472554827</strong>.
            </p>
          </div>
        </div>
      ) : null}

      <div className="panel toolbar-grid">
        <label>
          Filtrar por
          <select id="pred-filter-group" name="predFilterGroup" value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
            <option value="TODAY">Hoy</option>
            <option value="ALL">Todos</option>
            <option value="UNPREDICTED">Pendientes</option>
            <option value="KO">Fase final</option>
            <option value="TRIVIA">Trivia</option>
            {state.db.groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Ver por
          <select id="pred-view-mode" name="predViewMode" value={viewMode} onChange={(e) => setViewMode(e.target.value as ViewMode)} disabled={selectedGroupId === 'TRIVIA'}>
            <option value="group">Grupo / etapa</option>
            <option value="date">Fecha de partido</option>
          </select>
        </label>

        <button
          className="btn btn-primary pred-save-all-btn"
          type="button"
          onClick={() => savePredictions()}
          disabled={!hasApprovedPayment || isAnySaving || dirtyMatchIdsRef.current.size === 0 || selectedGroupId === 'TRIVIA'}
        >
          {saving ? 'Guardando...' : 'Guardar Todo'}
        </button>
      </div>

      <div className="prediction-progress panel" aria-label="Progreso de predicciones guardadas">
        <div className="prediction-progress-head">
          <div>
            <span className="eyebrow">Avance del PRODE</span>
            <strong>{predictionProgress.percentage}% completado</strong>
          </div>
          <span className="prediction-progress-count">
            {predictionProgress.saved} de {predictionProgress.total} partidos
          </span>
        </div>
        <div
          className="prediction-progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={predictionProgress.total}
          aria-valuenow={predictionProgress.saved}
          aria-valuetext={`${predictionProgress.percentage}% de predicciones guardadas`}
        >
          <span
            className="prediction-progress-fill"
            style={{ width: `${predictionProgress.percentage}%` }}
          />
        </div>
        {dirtyMatchIdsRef.current.size > 0 ? (
          <span className="prediction-progress-pending">
            {dirtyMatchIdsRef.current.size} borrador(es) todavía sin guardar
          </span>
        ) : null}
      </div>

      {message ? <p className="status">{message}</p> : null}
      {dirtyMatchIdsRef.current.size > 0 ? (
        <p className="status">
          Borradores sin guardar: <strong>{dirtyMatchIdsRef.current.size}</strong>. Solo se consideran cargados cuando aparece
          la confirmación de guardado.
        </p>
      ) : null}

      {showTriviaBeforeMatches
        ? renderTriviaPanel('trivia-first', !hasApprovedPayment)
        : null}

      {selectedGroupId === 'TRIVIA' ? (
        null
      ) : viewMode === 'group' ? (
        visibleSections.map((section) => (
            <div key={section.id} className="panel stack-md">
              <div className="section-head">
                <h3>{section.title}</h3>
                <div className="fixture-inline">
                  <span>{section.matches.length} partidos</span>
                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    onClick={() => saveSectionPredictions(section.id, section.matches.map((m) => m.id))}
                    disabled={!hasApprovedPayment || isAnySaving}
                  >
                    {savingSectionId === section.id ? 'Guardando...' : section.saveLabel}
                  </button>
                </div>
              </div>

              <div className="match-list">{renderMatchList(section.matches, !hasApprovedPayment)}</div>
            </div>
        ))
      ) : (
        selectedGroupId === 'ALL' ? (
          <>
            {dateSectionsByPhase.group.map((section) => (
              <div key={`group-${section.label}`} className="panel stack-md">
                <div className="section-head">
                  <h3 className="pred-date-heading"><span className="pred-date-icon" aria-hidden="true">📅</span>{section.label}</h3>
                  <span>{section.matches.length} partidos</span>
                </div>
                <div className="match-list">
                  {renderMatchList(section.matches, !hasApprovedPayment)}
                </div>
              </div>
            ))}
            {dateSectionsByPhase.knockout.map((section) => (
              <div key={`ko-${section.label}`} className="panel stack-md">
                <div className="section-head">
                  <h3 className="pred-date-heading"><span className="pred-date-icon" aria-hidden="true">📅</span>{section.label}</h3>
                  <span>{section.matches.length} partidos</span>
                </div>
                <div className="match-list">
                  {renderMatchList(section.matches, !hasApprovedPayment)}
                </div>
              </div>
            ))}
          </>
        ) : (
          visibleDateSections.map((section) => (
            <div key={section.label} className="panel stack-md">
              <div className="section-head">
                <h3 className="pred-date-heading"><span className="pred-date-icon" aria-hidden="true">📅</span>{section.label}</h3>
                <span>{section.matches.length} partidos</span>
              </div>
              <div className="match-list">
                {renderMatchList(section.matches, !hasApprovedPayment)}
              </div>
            </div>
          ))
        )
      )}

      {selectedGroupId !== 'TRIVIA' && (viewMode === 'group' ? visibleSections.length === 0 : visibleDateSections.length === 0) ? (
        <div className="panel">
          <p className="muted">No hay partidos disponibles en el filtro actual.</p>
        </div>
      ) : null}

      {showTriviaAfterMatches
        ? renderTriviaPanel('trivia-readonly-last', !hasApprovedPayment)
        : null}

      {selectedFormTeam ? (
        <TeamFormDialog
          teamName={selectedFormTeam}
          results={recentResultsByTeam.get(selectedFormTeam) ?? []}
          onClose={() => setSelectedFormTeam(null)}
        />
      ) : null}
    </section>
  );
}







