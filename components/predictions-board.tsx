'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { TeamName } from '@/components/team-name';
import { formatDateArgentinaShort, formatKickoffArgentina } from '@/lib/datetime';
import type { Match, StateResponse } from '@/lib/types';
import { estimateMatchProbabilities } from '@/lib/worldcup26';

type DraftMap = Record<string, { home: string; away: string }>;
type ViewMode = 'group' | 'date';
type MatchSection = { id: string; title: string; subtitle: string; matches: Match[]; saveLabel: string };
type DateMatch = Match & { _meta: string };
type DateSection = { label: string; matches: DateMatch[] };

function sortMatches(a: Match, b: Match) {
  return new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
}

function isPredictionEditable(kickoffAt: string, nowMs = Date.now()) {
  const kickoffMs = new Date(kickoffAt).getTime();
  if (!Number.isFinite(kickoffMs)) return false;
  return nowMs < kickoffMs - 60 * 60 * 1000;
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
    return new Set(state?.db.matches.filter((m) => !isPredictionEditable(m.kickoffAt, nowMs)).map((m) => m.id) ?? []);
  }, [state?.db.matches]);

  const editableMatches = useMemo(() => {
    const nowMs = Date.now();
    return [...(state?.db.matches ?? [])].filter((match) => isPredictionEditable(match.kickoffAt, nowMs)).sort(sortMatches);
  }, [state?.db.matches]);

  const groupSections = useMemo(() => {
    if (!state) return [] as MatchSection[];
    return state.db.groups
      .map((group) => ({
        id: group.id,
        title: group.name,
        subtitle: group.teams.join(' · '),
        matches: editableMatches.filter((match) => match.groupId === group.id),
        saveLabel: 'Guardar grupo',
      }))
      .filter((section) => section.matches.length > 0);
  }, [editableMatches, state]);

  const knockoutSections = useMemo(() => {
    const byStage = new Map<string, Match[]>();
    for (const match of editableMatches.filter((item) => item.groupId === 'KO')) {
      const stage = match.stage ?? 'Fase final';
      const list = byStage.get(stage) ?? [];
      list.push(match);
      byStage.set(stage, list);
    }
    return [...byStage.entries()].map(([stage, matches]) => ({
      id: `KO-${stage}`,
      title: stage,
      subtitle: '',
      matches,
      saveLabel: 'Guardar etapa',
    }));
  }, [editableMatches]);

  const visibleSections = useMemo(() => {
    const sections: MatchSection[] = [];
    if (selectedGroupId === 'ALL') {
      sections.push(...groupSections);
      sections.push(...knockoutSections);
    } else if (selectedGroupId === 'KO') {
      sections.push(...knockoutSections);
    } else {
      sections.push(...groupSections.filter((section) => section.id === selectedGroupId));
    }
    return sections;
  }, [groupSections, knockoutSections, selectedGroupId]);

  const visibleDateSections = useMemo(() => {
    const flat: DateMatch[] = visibleSections.flatMap((section) =>
      section.matches.map((match) => ({ ...match, _meta: section.title })),
    );
    flat.sort(sortMatches);

    const byDate = new Map<string, DateSection>();
    for (const match of flat) {
      const dateKey = formatDateArgentinaShort(match.kickoffAt);
      if (!byDate.has(dateKey)) byDate.set(dateKey, { label: dateKey, matches: [] });
      byDate.get(dateKey)!.matches.push(match);
    }
    return [...byDate.values()];
  }, [visibleSections]);

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
      setMessage('Debes iniciar sesión para cargar predicciones.');
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

    if (targetMatchId) setSavingMatchId(targetMatchId);
    else setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictions }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo guardar');

      setState(data.state as StateResponse);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('prode-predictions-changed'));
      }

      setMessage(targetMatchId ? 'Predicción guardada correctamente.' : 'Predicciones guardadas correctamente.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al guardar predicciones');
    } finally {
      if (targetMatchId) setSavingMatchId(null);
      else setSaving(false);
    }
  }

  async function saveSectionPredictions(sectionId: string, matchIds: string[]) {
    if (!currentUser) {
      setMessage('Debes iniciar sesión para cargar predicciones.');
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
      setMessage('No hay predicciones nuevas para guardar en esta sección.');
      return;
    }

    setSavingSectionId(sectionId);
    setMessage(null);
    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictions }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo guardar');

      setState(data.state as StateResponse);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('prode-predictions-changed'));
      }
      setMessage('Predicciones guardadas correctamente.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al guardar predicciones');
    } finally {
      setSavingSectionId(null);
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
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo generar el pago');
      const redirectUrl = data.url as string | undefined;
      if (!redirectUrl) throw new Error('GalioPay no devolvió URL de checkout');
      window.location.href = redirectUrl;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo iniciar el pago');
    } finally {
      setPaying(false);
    }
  }

  function renderMatchCard(match: Match, extraMeta?: string) {
    const draft = drafts[match.id] ?? { home: '', away: '' };
    const kickoff = formatKickoffArgentina(match.kickoffAt);
    const headerMeta = match.groupId === 'KO' ? match.stage ?? 'Fase final' : `Grupo ${match.groupId} - Fecha ${match.matchday}`;

    return (
      <div key={match.id} className="match-card">
        <div>
          <p className="match-meta">{headerMeta} - {kickoff}</p>
          {extraMeta ? <p className="match-meta">{extraMeta}</p> : null}
          <p className="match-meta">Sede: {match.venue ?? 'Pendiente de confirmar'}</p>
          <div className="fixture-row">
            <TeamName teamName={match.homeTeam} linkToTeam />
            <span className="vs">vs</span>
            <TeamName teamName={match.awayTeam} linkToTeam />
          </div>
          {match.groupId !== 'KO' ? (
            <p className="prob-row">
              Probabilidades (estimadas):{' '}
              {(() => {
                const p = estimateMatchProbabilities(match.homeTeam, match.awayTeam);
                return `${p.homeWinPct}% ${match.homeTeam} | ${p.drawPct}% empate | ${p.awayWinPct}% ${match.awayTeam}`;
              })()}
            </p>
          ) : null}
          {match.officialResult ? (
            <p className="official-result">
              Oficial: {match.officialResult.home} - {match.officialResult.away}
            </p>
          ) : null}
        </div>

        <div className="score-inputs">
          <input
            inputMode="numeric"
            value={draft.home}
            onChange={(e) => setDraft(match.id, 'home', e.target.value)}
            aria-label={`Goles ${match.homeTeam}`}
          />
          <span className="score-divider">-</span>
          <input
            inputMode="numeric"
            value={draft.away}
            onChange={(e) => setDraft(match.id, 'away', e.target.value)}
            aria-label={`Goles ${match.awayTeam}`}
          />
          <button
            className="btn btn-primary btn-small"
            type="button"
            onClick={() => savePredictions(match.id)}
            disabled={saving || savingMatchId === match.id || draft.home === '' || draft.away === ''}
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

  if (currentUser.registrationPaymentStatus !== 'approved') {
    return (
      <div className="panel stack-md">
        <h3>Predicciones bloqueadas hasta confirmar pago</h3>
        <p className="muted">
          Tu usuario tiene estado de inscripción <strong>{currentUser.registrationPaymentStatus ?? 'pending'}</strong>. Debes completar y confirmar el pago de <strong>${registrationAmountArs.toLocaleString('es-AR')}</strong> para acceder a la carga de predicciones.
        </p>
        <div className="cta-row">
          <button className="btn btn-primary" type="button" onClick={startRegistrationPayment} disabled={paying}>
            {paying ? 'Redirigiendo a GalioPay...' : 'Pagar inscripción'}
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
            <option value="KO">Fase final</option>
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
            <option value="group">Grupo / etapa</option>
            <option value="date">Fecha de partido</option>
          </select>
        </label>
      </div>

      <div className="panel">
        <p className="muted">
          Regla de cierre: las predicciones se pueden crear o editar hasta <strong>1 hora antes</strong> del inicio de cada partido. Después del cierre ya no se muestran en esta pantalla.
        </p>
      </div>

      {message ? <p className="status">{message}</p> : null}

      {viewMode === 'group'
        ? visibleSections.map((section) => (
            <div key={section.id} className="panel stack-md">
              <div className="section-head">
                <h3>{section.title}</h3>
                <div className="fixture-inline">
                  <span>{section.matches.length} partidos pendientes</span>
                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    onClick={() => saveSectionPredictions(section.id, section.matches.map((m) => m.id))}
                    disabled={savingSectionId === section.id || saving}
                  >
                    {savingSectionId === section.id ? 'Guardando...' : section.saveLabel}
                  </button>
                </div>
              </div>

              {section.subtitle ? <p className="muted compact-text">{section.subtitle}</p> : null}
              <div className="match-list">{section.matches.map((match) => renderMatchCard(match))}</div>
            </div>
          ))
        : visibleDateSections.map((section) => (
            <div key={section.label} className="panel stack-md">
              <div className="section-head">
                <h3>{section.label}</h3>
                <span>{section.matches.length} partidos pendientes</span>
              </div>
              <div className="match-list">
                {section.matches.map((match) => renderMatchCard(match, match._meta))}
              </div>
            </div>
          ))}

      {(viewMode === 'group' ? visibleSections.length === 0 : visibleDateSections.length === 0) ? (
        <div className="panel">
          <p className="muted">No hay partidos disponibles para predecir en el filtro actual. Solo se muestran partidos cuya ventana de carga sigue abierta.</p>
        </div>
      ) : null}
    </section>
  );
}



