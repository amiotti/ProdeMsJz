'use client';

import { useEffect, useMemo, useState } from 'react';

import { TeamName } from '@/components/team-name';
import type { Match, StateResponse } from '@/lib/types';

type DraftMap = Record<string, { home: string; away: string }>;

export function ResultsBoard({ initialState = null }: { initialState?: StateResponse | null }) {
  const [state, setState] = useState<StateResponse | null>(initialState);
  const [loading, setLoading] = useState(!initialState);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [selectedGroupId, setSelectedGroupId] = useState('ALL');

  useEffect(() => {
    if (initialState) return;
    fetch('/api/results/state', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: StateResponse) => {
        setState(data);
        const nextDrafts: DraftMap = {};
        for (const match of data.db.matches) {
          if (!match.officialResult) continue;
          nextDrafts[match.id] = {
            home: String(match.officialResult.home),
            away: String(match.officialResult.away),
          };
        }
        setDrafts(nextDrafts);
      })
      .catch(() => setMessage('No se pudieron cargar los resultados.'))
      .finally(() => setLoading(false));
  }, [initialState]);

  useEffect(() => {
    if (!state) return;
    const nextDrafts: DraftMap = {};
    for (const match of state.db.matches) {
      if (!match.officialResult) continue;
      nextDrafts[match.id] = {
        home: String(match.officialResult.home),
        away: String(match.officialResult.away),
      };
    }
    setDrafts(nextDrafts);
  }, [state]);

  const visibleMatches = useMemo(() => {
    if (!state) return [] as Match[];
    return state.db.matches.filter((m) => selectedGroupId === 'ALL' || m.groupId === selectedGroupId);
  }, [state, selectedGroupId]);

  function setDraft(matchId: string, side: 'home' | 'away', value: string) {
    if (!state?.viewer.isAdmin) return;
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

  async function save() {
    if (!state?.viewer.isAdmin) return;

    const results = Object.entries(drafts)
      .filter(([, score]) => score.home !== '' && score.away !== '')
      .map(([matchId, score]) => ({ matchId, home: Number(score.home), away: Number(score.away) }));

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo guardar');
      setState(data.state as StateResponse);
      setMessage('Resultados oficiales actualizados.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al guardar resultados');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !state) {
    return <div className="panel">Cargando panel de resultados...</div>;
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

        <div className="readonly-note">
          {state.viewer.isAdmin ? 'Modo administrador: puedes editar y guardar resultados.' : 'Modo lectura: solo el administrador puede editar resultados.'}
        </div>

        <button className="btn btn-danger" type="button" onClick={save} disabled={saving || !state.viewer.isAdmin}>
          {saving ? 'Guardando...' : 'Guardar resultados oficiales'}
        </button>
      </div>

      {message ? <p className="status">{message}</p> : null}

      <div className="panel match-list">
        {visibleMatches.map((match) => {
          const draft = drafts[match.id] ?? { home: '', away: '' };
          const readOnly = !state.viewer.isAdmin;

          return (
            <div className="match-card" key={match.id}>
              <div>
                <p className="match-meta">
                  {match.groupId} - Fecha {match.matchday}
                </p>
                {match.venue ? <p className="match-meta">Sede: {match.venue}</p> : null}
                <div className="fixture-row">
                  <TeamName teamName={match.homeTeam} linkToTeam />
                  <span className="vs">vs</span>
                  <TeamName teamName={match.awayTeam} linkToTeam />
                </div>
              </div>

              <div className={`score-inputs${readOnly ? ' is-locked' : ''}`}>
                <input value={draft.home} onChange={(e) => setDraft(match.id, 'home', e.target.value)} disabled={readOnly} />
                <span>-</span>
                <input value={draft.away} onChange={(e) => setDraft(match.id, 'away', e.target.value)} disabled={readOnly} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
