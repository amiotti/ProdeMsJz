'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { TeamName } from '@/components/team-name';
import { formatDateArgentinaShort, formatKickoffArgentina } from '@/lib/datetime';
import type { Match, StateResponse } from '@/lib/types';
import { estimateMatchProbabilities } from '@/lib/worldcup26';

type DraftMap = Record<string, { home: string; away: string }>;
type ViewMode = 'group' | 'date';
type GroupSection = { groupId: string; groupName: string; teams: string[]; matches: Match[] };
type DateMatch = Match & { _groupName: string };
type DateSection = { label: string; matches: DateMatch[] };

function sortMatches(a: Match, b: Match) {
  return new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
}

function isPredictionEditable(kickoffAt: string, nowMs = Date.now()) {
  const kickoffMs = new Date(kickoffAt).getTime();
  if (!Number.isFinite(kickoffMs)) return false;
  return nowMs < kickoffMs - 60 * 60 * 1000;
}

function hasMatchStarted(kickoffAt: string, nowMs = Date.now()) {
  const kickoffMs = new Date(kickoffAt).getTime();
  if (!Number.isFinite(kickoffMs)) return true;
  return nowMs >= kickoffMs;
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
  const [savingGroupId, setSavingGroupId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('group');
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [paying, setPaying] = useState(false);

  async function loadState() {
    setLoading(true);
    const response = await fetch('/api/predictions/state', { cache: 'no-store' });
    const data = (await response.json()) as StateResponse;
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
    const nextDrafts: DraftMap = {};
    for (const prediction of state.db.predictions.filter((p) => p.userId === state.viewer.user?.id)) {
      nextDrafts[prediction.matchId] = {
        home: String(prediction.homeGoals),
        away: String(prediction.awayGoals),
      };
    }
    setDrafts(nextDrafts);
  }, [state]);

  const currentUser = state?.viewer.user ?? null;

  const lockedMatchIds = useMemo(() => {
    const nowMs = Date.now();
    return new Set(
      state?.db.matches.filter((m) => !isPredictionEditable(m.kickoffAt, nowMs)).map((m) => m.id) ?? [],
    );
  }, [state?.db.matches]);

  const groupedMatches = useMemo(() => {
    if (!state) return [] as GroupSection[];
    const nowMs = Date.now();
    return state.db.groups.map((group) => ({
      groupId: group.id,
      groupName: group.name,
      teams: group.teams,
      matches: state.db.matches.filter((m) => m.groupId === group.id && !hasMatchStarted(m.kickoffAt, nowMs)).sort(sortMatches),
    }));
  }, [state]);

  const visibleGroups = useMemo(
    () => groupedMatches.filter((group) => (selectedGroupId === 'ALL' || group.groupId === selectedGroupId) && group.matches.length > 0),
    [groupedMatches, selectedGroupId],
  );

  const visibleDateSections = useMemo(() => {
    const flat: DateMatch[] = visibleGroups.flatMap((group) =>
      group.matches.map((match) => ({ ...match, _groupName: group.groupName })),
    );
    flat.sort(sortMatches);

    const byDate = new Map<string, DateSection>();
    for (const match of flat) {
      const dateKey = formatDateArgentinaShort(match.kickoffAt);
      if (!byDate.has(dateKey)) byDate.set(dateKey, { label: dateKey, matches: [] });
      byDate.get(dateKey)!.matches.push(match);
    }
    return [...byDate.values()];
  }, [visibleGroups]);

  function setDraft(matchId: string, side: 'home' | 'away', value: string) {
    if (lockedMatchIds.has(matchId)) return;
    if (value && !/^\d+$/.test(value)) return;

    setDrafts((prev) => ({
      ...prev,
      [matchId]: {
        home: prev[matchId]?.home ?? '',
        away: prev[matchId]?.away ?? '',
        [side]: value,
      },
    }));
  }

  async function savePredictions(targetMatchId?: string) {
    if (!currentUser) {
      setMessage('Debes iniciar sesiÃ³n para cargar predicciones.');
      return;
    }

    const predictions = Object.entries(drafts)
      .filter(
        ([matchId, score]) =>
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

    if (targetMatchId) {
      setSavingMatchId(targetMatchId);
    } else {
      setSaving(true);
    }
    setMessage(null);

    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictions }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo guardar');
      }

      setState(data.state as StateResponse);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('prode-predictions-changed'));
      }
      const locked = Array.isArray(data.lockedMatches) ? (data.lockedMatches as string[]) : [];
      setMessage(
        locked.length > 0
          ? `Predicciones guardadas. ${locked.length} partido(s) ya estÃ¡n cerrados (menos de 1 hora para el inicio) y no se modificaron.`
          : targetMatchId
            ? 'PredicciÃ³n guardada correctamente. Puedes editarla hasta 1 hora antes del partido.'
            : 'Predicciones guardadas correctamente. Puedes editarlas hasta 1 hora antes de cada partido.',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al guardar predicciones');
    } finally {
      if (targetMatchId) setSavingMatchId(null);
      else setSaving(false);
    }
  }

  async function saveGroupPredictions(groupId: string, matchIds: string[]) {
    if (!currentUser) {
      setMessage('Debes iniciar sesiÃ³n para cargar predicciones.');
      return;
    }

    const predictions = Object.entries(drafts)
      .filter(
        ([matchId, score]) =>
          matchIds.includes(matchId) && !lockedMatchIds.has(matchId) && score.home !== '' && score.away !== '',
      )
      .map(([matchId, score]) => ({
        matchId,
        homeGoals: Number(score.home),
        awayGoals: Number(score.away),
      }));

    if (predictions.length === 0) {
      setMessage('No hay predicciones nuevas para guardar en este grupo.');
      return;
    }

    setSavingGroupId(groupId);
    setMessage(null);
    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictions }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo guardar');
      }

      setState(data.state as StateResponse);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('prode-predictions-changed'));
      }
      const locked = Array.isArray(data.lockedMatches) ? (data.lockedMatches as string[]) : [];
      setMessage(
        locked.length > 0
          ? `Predicciones del grupo guardadas. ${locked.length} partido(s) ya estÃ¡n cerrados y no se modificaron.`
          : 'Predicciones del grupo guardadas correctamente.',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al guardar predicciones');
    } finally {
      setSavingGroupId(null);
    }
  }

  async function startRegistrationPayment() {
    setPaying(true);
    setMessage(null);
    try {
      const response = await fetch('/api/payments/galio/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo generar el pago');
      }
      const redirectUrl = data.url as string | undefined;
      if (!redirectUrl) throw new Error('GalioPay no devolviÃ³ URL de checkout');
      window.location.href = redirectUrl;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo iniciar el pago');
    } finally {
      setPaying(false);
    }
  }

  function renderMatchCard(match: Match, extraMeta?: string) {
    const draft = drafts[match.id] ?? { home: '', away: '' };
    const isLocked = lockedMatchIds.has(match.id);
    const kickoff = formatKickoffArgentina(match.kickoffAt);

    return (
      <div key={match.id} className="match-card">
        <div>
          <p className="match-meta">Fecha {match.matchday} - {kickoff}</p>
          {extraMeta ? <p className="match-meta">{extraMeta}</p> : null}
          <p className="match-meta">Sede: {match.venue ?? 'Pendiente de confirmar'}</p>
          <div className="fixture-row">
            <TeamName teamName={match.homeTeam} linkToTeam />
            <span className="vs">vs</span>
            <TeamName teamName={match.awayTeam} linkToTeam />
          </div>
          <p className="prob-row">
            Probabilidades (estimadas):{' '}
            {(() => {
              const p = estimateMatchProbabilities(match.homeTeam, match.awayTeam);
              return `${p.homeWinPct}% ${match.homeTeam} | ${p.drawPct}% empate | ${p.awayWinPct}% ${match.awayTeam}`;
            })()}
          </p>
          {isLocked ? <p className="match-meta">PredicciÃ³n cerrada (menos de 1 hora para el inicio)</p> : null}
          {match.officialResult ? (
            <p className="official-result">
              Oficial: {match.officialResult.home} - {match.officialResult.away}
            </p>
          ) : null}
        </div>

        <div className={`score-inputs${isLocked ? ' is-locked' : ''}`}>
          <input
            inputMode="numeric"
            value={draft.home}
            onChange={(e) => setDraft(match.id, 'home', e.target.value)}
            aria-label={`Goles ${match.homeTeam}`}
            disabled={isLocked}
          />
          <span className="score-divider">-</span>
          <input
            inputMode="numeric"
            value={draft.away}
            onChange={(e) => setDraft(match.id, 'away', e.target.value)}
            aria-label={`Goles ${match.awayTeam}`}
            disabled={isLocked}
          />
          <button
            className="btn btn-primary btn-small"
            type="button"
            onClick={() => savePredictions(match.id)}
            disabled={isLocked || saving || savingMatchId === match.id || draft.home === '' || draft.away === ''}
            title="Guardar esta predicciÃ³n"
          >
            {savingMatchId === match.id ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    );
  }

  if (loading || !state) {
    return <div className="panel">Cargando predicciones...</div>;
  }

  if (!state.viewer.isAuthenticated || !currentUser) {
    return (
      <div className="panel stack-md">
        <h3>Predicciones</h3>
        <p className="muted">Debes iniciar sesiÃ³n para cargar tus pronÃ³sticos. Puedes editar cada partido hasta 1 hora antes del inicio.</p>
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

  if (currentUser.registrationPaymentStatus !== 'approved') {
    return (
      <div className="panel stack-md">
        <h3>Predicciones bloqueadas hasta confirmar pago</h3>
        <p className="muted">
          Tu usuario tiene estado de inscripciÃ³n <strong>{currentUser.registrationPaymentStatus ?? 'pending'}</strong>. Debes completar y confirmar el pago de <strong>${registrationAmountArs.toLocaleString('es-AR')}</strong> para acceder a la carga de predicciones.
        </p>
        <div className="cta-row">
          <button className="btn btn-primary" type="button" onClick={startRegistrationPayment} disabled={paying}>
            {paying ? 'Redirigiendo a GalioPay...' : 'Pagar inscripciÃ³n'}
          </button>
          <Link className="cta-link" href="/payment/return">
            Revisar estado del pago
          </Link>
          <Link className="cta-link" href="/profile">
            Mi perfil
          </Link>
        </div>
        {message ? <p className="status">{message}</p> : null}
      </div>
    );
  }

  return (
    <section className="stack-lg">
      <div className="panel toolbar-grid">
        <label>
          Filtrar grupo
          <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
            <option value="ALL">Todos</option>
            {state.db.groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Ver por
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value as ViewMode)}>
            <option value="group">Grupo</option>
            <option value="date">Fecha de partido</option>
          </select>
        </label>
      </div>

      <div className="panel">
        <p className="muted">
          Regla de cierre: las predicciones se pueden crear o editar hasta <strong>1 hora antes</strong> del inicio de cada partido. DespuÃ©s del cierre quedan bloqueadas.
        </p>
      </div>

      {message ? <p className="status">{message}</p> : null}

      {viewMode === 'group'
        ? visibleGroups.map((group) => (
            <div key={group.groupId} className="panel stack-md">
              <div className="section-head">
                <h3>{group.groupName}</h3>
                <div className="fixture-inline">
                  <span>{group.matches.length} partidos pendientes</span>
                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    onClick={() => saveGroupPredictions(group.groupId, group.matches.map((m) => m.id))}
                    disabled={savingGroupId === group.groupId || saving}
                  >
                    {savingGroupId === group.groupId ? 'Guardando...' : 'Guardar grupo'}
                  </button>
                </div>
              </div>

              <div className="teams-chip-row">
                {group.teams.map((team) => (
                  <TeamName key={team} teamName={team} linkToTeam className="chip team-chip" />
                ))}
              </div>

              <div className="match-list">{group.matches.map((match) => renderMatchCard(match))}</div>
            </div>
          ))
        : visibleDateSections.map((section) => (
            <div key={section.label} className="panel stack-md">
              <div className="section-head">
                <h3>{section.label}</h3>
                <span>{section.matches.length} partidos pendientes</span>
              </div>
              <div className="match-list">
                {section.matches.map((match) => renderMatchCard(match, match._groupName))}
              </div>
            </div>
          ))}

      {(viewMode === 'group' ? visibleGroups.length === 0 : visibleDateSections.length === 0) ? (
        <div className="panel">
          <p className="muted">No hay partidos disponibles para predecir en el filtro actual (solo se muestran partidos futuros).</p>
        </div>
      ) : null}
    </section>
  );
}

