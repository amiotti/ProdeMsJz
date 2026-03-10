'use client';

import { useEffect, useMemo, useState } from 'react';

import { formatKickoffArgentina } from '@/lib/datetime';
import { TeamName } from '@/components/team-name';
import type { Match, StateResponse } from '@/lib/types';

type DraftMap = Record<string, { home: string; away: string }>;
type ResultsViewMode = 'results' | 'standings';
type ResultsSortMode = 'date' | 'group';
type GroupStandingRow = {
  team: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
};

const KNOCKOUT_STAGE_ORDER: Record<string, number> = {
  '32avos': 1,
  '16avos': 2,
  '8vos': 3,
  Cuartos: 4,
  Semifinal: 5,
  'Tercer puesto': 6,
  Final: 7,
};

function getStageOrder(match: Match) {
  if (match.groupId !== 'KO') return 0;
  return KNOCKOUT_STAGE_ORDER[match.stage ?? ''] ?? 99;
}

function getGroupSortOrder(groupId: string) {
  if (groupId === 'KO') return 99;
  return groupId.charCodeAt(0) - 64;
}

function buildGroupStandings(state: StateResponse) {
  const standingsByGroup = new Map<string, GroupStandingRow[]>();

  for (const group of state.db.groups) {
    standingsByGroup.set(
      group.id,
      group.teams.map((team) => ({
        team,
        pj: 0,
        g: 0,
        e: 0,
        p: 0,
        gf: 0,
        gc: 0,
        dg: 0,
        pts: 0,
      })),
    );
  }

  const byTeam = new Map<string, GroupStandingRow>();
  for (const rows of standingsByGroup.values()) {
    for (const row of rows) byTeam.set(row.team, row);
  }

  for (const match of state.db.matches) {
    if (!match.officialResult || match.groupId === 'KO') continue;
    const home = byTeam.get(match.homeTeam);
    const away = byTeam.get(match.awayTeam);
    if (!home || !away) continue;

    const hs = match.officialResult.home;
    const as = match.officialResult.away;

    home.pj += 1;
    away.pj += 1;
    home.gf += hs;
    home.gc += as;
    away.gf += as;
    away.gc += hs;

    if (hs > as) {
      home.g += 1;
      home.pts += 3;
      away.p += 1;
    } else if (hs < as) {
      away.g += 1;
      away.pts += 3;
      home.p += 1;
    } else {
      home.e += 1;
      away.e += 1;
      home.pts += 1;
      away.pts += 1;
    }
  }

  for (const rows of standingsByGroup.values()) {
    for (const row of rows) row.dg = row.gf - row.gc;
    rows.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.localeCompare(b.team, 'es');
    });
  }

  return standingsByGroup;
}

export function ResultsBoard({ initialState = null }: { initialState?: StateResponse | null }) {
  const [state, setState] = useState<StateResponse | null>(initialState);
  const [loading, setLoading] = useState(!initialState);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [selectedGroupId, setSelectedGroupId] = useState('ALL');
  const [viewMode, setViewMode] = useState<ResultsViewMode>('results');
  const [sortMode, setSortMode] = useState<ResultsSortMode>('date');

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
    const matches = state.db.matches.filter((m) => selectedGroupId === 'ALL' || m.groupId === selectedGroupId);
    return matches.sort((a, b) => {
      if (sortMode === 'group') {
        if (a.groupId !== b.groupId) return getGroupSortOrder(a.groupId) - getGroupSortOrder(b.groupId);
        const stageDiff = getStageOrder(a) - getStageOrder(b);
        if (stageDiff !== 0) return stageDiff;
        if (a.matchday !== b.matchday) return a.matchday - b.matchday;
      }
      const kickoffDiff = new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
      if (kickoffDiff !== 0) return kickoffDiff;
      return a.groupId.localeCompare(b.groupId, 'es');
    });
  }, [state, selectedGroupId, sortMode]);

  const standingsByGroup = useMemo(() => (state ? buildGroupStandings(state) : new Map<string, GroupStandingRow[]>()), [state]);
  const visibleGroups = useMemo(
    () => state?.db.groups.filter((g) => selectedGroupId === 'ALL' || g.id === selectedGroupId) ?? [],
    [state, selectedGroupId],
  );

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
            <option value="KO">Fase final</option>
            {state.db.groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Ordenar por
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value as ResultsSortMode)}>
            <option value="date">Fecha</option>
            <option value="group">Grupo / etapa</option>
          </select>
        </label>

        <div className="readonly-note">
          <div className="fixture-inline" style={{ justifyContent: 'flex-start' }}>
            <button
              type="button"
              className={`btn btn-small ${viewMode === 'results' ? 'btn-danger' : ''}`}
              onClick={() => setViewMode('results')}
            >
              Resultados
            </button>
            <button
              type="button"
              className={`btn btn-small ${viewMode === 'standings' ? 'btn-danger' : ''}`}
              onClick={() => setViewMode('standings')}
            >
              Posiciones
            </button>
          </div>
        </div>

        {state.viewer.isAdmin ? (
          <button className="btn btn-primary" type="button" onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar resultados oficiales'}
          </button>
        ) : null}
      </div>

      {message ? <p className="status">{message}</p> : null}

      {viewMode === 'results' ? (
        <div className="panel match-list">
          {visibleMatches.map((match) => {
            const draft = drafts[match.id] ?? { home: '', away: '' };
            const readOnly = !state.viewer.isAdmin;
            const meta = match.groupId === 'KO' ? match.stage ?? 'Fase final' : `Grupo ${match.groupId} - Fecha ${match.matchday}`;

            return (
              <div className="match-card" key={match.id}>
                <div>
                  <p className="match-meta">{meta} - {formatKickoffArgentina(match.kickoffAt)}</p>
                  {match.venue ? <p className="match-meta">Sede: {match.venue}</p> : null}
                  <div className="fixture-row">
                    <TeamName teamName={match.homeTeam} linkToTeam />
                    <span className="vs">vs</span>
                    <TeamName teamName={match.awayTeam} linkToTeam />
                  </div>
                </div>

                <div className={`score-inputs${readOnly ? ' is-locked' : ''}`}>
                  <input value={draft.home} onChange={(e) => setDraft(match.id, 'home', e.target.value)} disabled={readOnly} />
                  <span className="score-divider">-</span>
                  <input value={draft.away} onChange={(e) => setDraft(match.id, 'away', e.target.value)} disabled={readOnly} />
                </div>
              </div>
            );
          })}
        </div>
      ) : selectedGroupId === 'KO' ? (
        <div className="panel">
          <p className="muted">La tabla de posiciones aplica solo a la fase de grupos.</p>
        </div>
      ) : (
        <div className="stack-lg">
          {visibleGroups.map((group) => {
            const rows = standingsByGroup.get(group.id) ?? [];
            return (
              <div key={group.id} className="panel table-wrap">
                <div className="section-head">
                  <h3>{group.name}</h3>
                  <span>Tabla de posiciones (se actualiza con resultados oficiales)</span>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Equipo</th>
                      <th>PJ</th>
                      <th>G</th>
                      <th>E</th>
                      <th>P</th>
                      <th>GF</th>
                      <th>GC</th>
                      <th>DG</th>
                      <th>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={`${group.id}-${row.team}`}>
                        <td>{index + 1}</td>
                        <td>
                          <TeamName teamName={row.team} linkToTeam />
                        </td>
                        <td>{row.pj}</td>
                        <td>{row.g}</td>
                        <td>{row.e}</td>
                        <td>{row.p}</td>
                        <td>{row.gf}</td>
                        <td>{row.gc}</td>
                        <td>{row.dg}</td>
                        <td>
                          <strong>{row.pts}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}








