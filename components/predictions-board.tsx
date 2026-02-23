'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { TeamName } from '@/components/team-name';
import type { Match, StateResponse } from '@/lib/types';
import { estimateMatchProbabilities } from '@/lib/worldcup26';

type DraftMap = Record<string, { home: string; away: string }>;

function sortMatches(a: Match, b: Match) {
  return new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
}

function formatKickoffStable(iso: string) {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const hour = String(d.getUTCHours()).padStart(2, '0');
  const minute = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day}/${month} ${hour}:${minute} UTC`;
}

function isPredictionEditable(kickoffAt: string, nowMs = Date.now()) {
  const kickoffMs = new Date(kickoffAt).getTime();
  if (!Number.isFinite(kickoffMs)) return false;
  return nowMs < kickoffMs - 60 * 60 * 1000;
}

export function PredictionsBoard({ initialState = null }: { initialState?: StateResponse | null }) {
  const [state, setState] = useState<StateResponse | null>(initialState);
  const [loading, setLoading] = useState(!initialState);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState('ALL');
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
  const lockedMatchIds = useMemo(
    () => {
      const nowMs = Date.now();
      return new Set(
        state?.db.matches
          .filter((m) => !isPredictionEditable(m.kickoffAt, nowMs))
          .map((m) => m.id) ?? [],
      );
    },
    [state?.db.matches],
  );

  const groupedMatches = useMemo(() => {
    if (!state) return [] as Array<{ groupId: string; groupName: string; teams: string[]; matches: Match[] }>;
    return state.db.groups.map((group) => ({
      groupId: group.id,
      groupName: group.name,
      teams: group.teams,
      matches: state.db.matches.filter((m) => m.groupId === group.id).sort(sortMatches),
    }));
  }, [state]);

  const visibleGroups = groupedMatches.filter((group) => selectedGroupId === 'ALL' || group.groupId === selectedGroupId);

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

  async function savePredictions() {
    if (!currentUser) {
      setMessage('Debes iniciar sesion para cargar predicciones.');
      return;
    }

    const predictions = Object.entries(drafts)
      .filter(([matchId, score]) => !lockedMatchIds.has(matchId) && score.home !== '' && score.away !== '')
      .map(([matchId, score]) => ({
        matchId,
        homeGoals: Number(score.home),
        awayGoals: Number(score.away),
      }));

    if (predictions.length === 0) {
      setMessage('No hay nuevas predicciones para guardar.');
      return;
    }

    setSaving(true);
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
      const locked = Array.isArray(data.lockedMatches) ? (data.lockedMatches as string[]) : [];
      setMessage(
        locked.length > 0
          ? `Predicciones guardadas. ${locked.length} partido(s) ya estan cerrados (menos de 1 hora para el inicio) y no se modificaron.`
          : 'Predicciones guardadas correctamente. Puedes editarlas hasta 1 hora antes de cada partido.',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al guardar predicciones');
    } finally {
      setSaving(false);
    }
  }

  async function startRegistrationPayment() {
    setPaying(true);
    setMessage(null);
    try {
      const response = await fetch('/api/payments/mercadopago/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo generar el pago');
      }
      const redirectUrl = (data.sandboxInitPoint || data.initPoint) as string | undefined;
      if (!redirectUrl) throw new Error('Mercado Pago no devolvio URL de checkout');
      window.location.href = redirectUrl;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo iniciar el pago');
    } finally {
      setPaying(false);
    }
  }

  if (loading || !state) {
    return <div className="panel">Cargando predicciones...</div>;
  }

  if (!state.viewer.isAuthenticated || !currentUser) {
    return (
      <div className="panel stack-md">
        <h3>Predicciones</h3>
        <p className="muted">Debes iniciar sesion para cargar tus pronosticos. Puedes editar cada partido hasta 1 hora antes del inicio.</p>
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
        <p className="muted">
          El perfil administrador no puede cargar predicciones y no participa en la tabla de posiciones.
        </p>
      </div>
    );
  }

  if (currentUser.registrationPaymentStatus !== 'approved') {
    return (
      <div className="panel stack-md">
        <h3>Predicciones bloqueadas hasta confirmar pago</h3>
        <p className="muted">
          Tu usuario tiene estado de inscripcion <strong>{currentUser.registrationPaymentStatus ?? 'pending'}</strong>. Debes
          completar y confirmar el pago para acceder a la carga de predicciones.
        </p>
        <div className="cta-row">
          <button className="btn btn-primary" type="button" onClick={startRegistrationPayment} disabled={paying}>
            {paying ? 'Redirigiendo a Mercado Pago...' : 'Pagar inscripcion'}
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
          Usuario activo
          <input value={`${currentUser.name} (${currentUser.email})`} disabled />
        </label>

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

        <button className="btn btn-primary" type="button" onClick={savePredictions} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar predicciones'}
        </button>
      </div>

      <div className="panel">
        <p className="muted">
          Regla de cierre: las predicciones se pueden crear o editar hasta <strong>1 hora antes</strong> del inicio de
          cada partido. Despues del cierre quedan bloqueadas.
        </p>
      </div>

      {message ? <p className="status">{message}</p> : null}

      {visibleGroups.map((group) => (
        <div key={group.groupId} className="panel stack-md">
          <div className="section-head">
            <h3>{group.groupName}</h3>
            <span>{group.matches.length} partidos</span>
          </div>

          <div className="teams-chip-row">
            {group.teams.map((team) => (
              <TeamName key={team} teamName={team} linkToTeam className="chip team-chip" />
            ))}
          </div>

          <div className="match-list">
            {group.matches.map((match) => {
              const draft = drafts[match.id] ?? { home: '', away: '' };
              const isLocked = lockedMatchIds.has(match.id);
              const kickoff = formatKickoffStable(match.kickoffAt);

              return (
                <div key={match.id} className="match-card">
                  <div>
                    <p className="match-meta">
                      {match.id} - Fecha {match.matchday} - {kickoff}
                    </p>
                    {match.venue ? <p className="match-meta">Sede: {match.venue}</p> : null}
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
                    <p className="match-meta">
                      {isLocked ? 'Prediccion cerrada (menos de 1 hora para el inicio)' : 'Prediccion editable'}
                    </p>
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
                    <span>-</span>
                    <input
                      inputMode="numeric"
                      value={draft.away}
                      onChange={(e) => setDraft(match.id, 'away', e.target.value)}
                      aria-label={`Goles ${match.awayTeam}`}
                      disabled={isLocked}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
