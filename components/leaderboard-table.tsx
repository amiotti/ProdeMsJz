'use client';

import { useEffect, useMemo, useState } from 'react';

import { LeaderboardPlayerDialog } from '@/components/leaderboard-player-dialog';
import type { LeaderboardParticipantDetail, LeaderboardRow, LeaderboardScope, LeaderboardView } from '@/lib/types';

type SavedGroup = {
  id: string;
  name: string;
  userIds: string[];
};

const SCOPE_OPTIONS: Array<{ id: LeaderboardScope; label: string; description: string }> = [
  {
    id: 'general',
    label: 'Tabla General',
    description: 'Todos los partidos y puntos obtenidos en la trivia.',
  },
  {
    id: 'groups',
    label: 'Grupos',
    description: 'Solo la fase de grupos. La trivia no suma en esta tabla.',
  },
  {
    id: 'knockout',
    label: 'Eliminatoria',
    description: 'Desde 16avos hasta la final. La trivia no suma en esta tabla.',
  },
];

function initials(row: LeaderboardRow) {
  const a = row.firstName?.trim()?.[0] ?? '';
  const b = row.lastName?.trim()?.[0] ?? '';
  return `${a}${b}`.toUpperCase() || (row.userName.trim()[0] ?? 'U').toUpperCase();
}

function displayName(row: LeaderboardRow) {
  return `${row.firstName} ${row.lastName}`.trim() || row.userName;
}

function splitName(row: LeaderboardRow) {
  const firstName = row.firstName?.trim() || row.userName;
  const lastName = row.lastName?.trim() || '-';
  return { firstName, lastName };
}

function PositionChange({ value = 0 }: { value?: number }) {
  if (value > 0) {
    return (
      <span className="position-change is-up" title={`Subió ${value} posiciones`} aria-label={`Subió ${value} posiciones`}>
        <span aria-hidden="true">▲</span>
        <strong>{value}</strong>
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="position-change is-down" title={`Bajó ${Math.abs(value)} posiciones`} aria-label={`Bajó ${Math.abs(value)} posiciones`}>
        <span aria-hidden="true">▼</span>
        <strong>{Math.abs(value)}</strong>
      </span>
    );
  }
  return (
    <span className="position-change is-flat" title="Sin cambios de posición" aria-label="Sin cambios de posición">
      <span aria-hidden="true">—</span>
      <strong>0</strong>
    </span>
  );
}

export function LeaderboardTable({
  views,
  isLoggedIn,
}: {
  views: Record<LeaderboardScope, LeaderboardView>;
  isLoggedIn: boolean;
}) {
  const [activeScope, setActiveScope] = useState<LeaderboardScope>('general');
  const [groups, setGroups] = useState<SavedGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('all');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [draftSelectedUserIds, setDraftSelectedUserIds] = useState<Record<string, boolean>>({});
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [groupMutationLoading, setGroupMutationLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ row: LeaderboardRow; position: number } | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, LeaderboardParticipantDetail>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const activeView = views[activeScope];
  const rows = activeView.rows;
  const activeScopeOption = SCOPE_OPTIONS.find((option) => option.id === activeScope) ?? SCOPE_OPTIONS[0];

  useEffect(() => {
    const syncTheme = () => setIsDarkTheme(document.documentElement.getAttribute('data-theme') === 'dark');
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const row of rows) next[row.userId] = false;
    setDraftSelectedUserIds(next);
  }, [rows]);

  useEffect(() => {
    if (activeGroupId === 'all') return;
    if (!groups.some((g) => g.id === activeGroupId)) {
      setActiveGroupId('all');
    }
  }, [activeGroupId, groups]);
  useEffect(() => {
    if (!isLoggedIn) {
      setGroups([]);
      setGroupsError(null);
      return;
    }

    let cancelled = false;
    async function load() {
      setGroupsLoading(true);
      setGroupsError(null);
      try {
        const response = await fetch('/api/leaderboard/groups', { cache: 'no-store' });
        const payload = (await response.json()) as { ok?: boolean; error?: string; groups?: SavedGroup[] };
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || 'No se pudieron cargar los grupos');
        }
        if (!cancelled) {
          setGroups(Array.isArray(payload.groups) ? payload.groups : []);
        }
      } catch (error) {
        if (!cancelled) {
          setGroupsError(error instanceof Error ? error.message : 'No se pudieron cargar los grupos');
        }
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const activeGroup = useMemo(() => groups.find((g) => g.id === activeGroupId) ?? null, [groups, activeGroupId]);

  const filteredRows = useMemo(() => {
    if (!activeGroup) return rows;
    const include = new Set(activeGroup.userIds);
    return rows.filter((row) => include.has(row.userId));
  }, [rows, activeGroup]);

  const modalRows = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const name = displayName(row).toLowerCase();
      const userName = row.userName.toLowerCase();
      return name.includes(q) || userName.includes(q);
    });
  }, [rows, userQuery]);

  const selectedCount = useMemo(() => Object.values(draftSelectedUserIds).filter(Boolean).length, [draftSelectedUserIds]);
  const positionByUserId = useMemo(
    () => new Map(rows.map((row, index) => [row.userId, index + 1] as const)),
    [rows],
  );

  function openCreateModal() {
    if (!isLoggedIn || groupMutationLoading) return;
    setGroupName('');
    setUserQuery('');
    setDraftSelectedUserIds((prev) => {
      const clean: Record<string, boolean> = {};
      for (const row of rows) clean[row.userId] = prev[row.userId] ?? false;
      return clean;
    });
    setIsCreateModalOpen(true);
  }

  function closeCreateModal() {
    setIsCreateModalOpen(false);
  }

  function toggleDraftUser(userId: string) {
    setDraftSelectedUserIds((prev) => ({ ...prev, [userId]: !prev[userId] }));
  }

  async function openPlayerDetail(row: LeaderboardRow, position: number) {
    setSelectedPlayer({ row, position });
    setDetailError(null);
    const cacheKey = `${activeScope}:${row.userId}`;
    if (detailCache[cacheKey]) return;

    setDetailLoading(true);
    try {
      const params = new URLSearchParams({ userId: row.userId, scope: activeScope });
      const response = await fetch(`/api/leaderboard/player-detail?${params.toString()}`, { cache: 'no-store' });
      const payload = (await response.json()) as {
        ok?: boolean;
        detail?: LeaderboardParticipantDetail;
        error?: string;
      };
      if (response.status === 401) {
        window.location.assign('/login');
        return;
      }
      if (!response.ok || !payload.ok || !payload.detail) {
        throw new Error(payload.error || 'No se pudo cargar el detalle');
      }
      setDetailCache((prev) => ({ ...prev, [cacheKey]: payload.detail! }));
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'No se pudo cargar el detalle');
    } finally {
      setDetailLoading(false);
    }
  }

  async function createGroup() {
    const cleanName = groupName.trim();
    if (!cleanName || groupMutationLoading) return;

    const userIds = rows.filter((row) => draftSelectedUserIds[row.userId]).map((row) => row.userId);
    if (!userIds.length) return;

    try {
      setGroupMutationLoading(true);
      setGroupsError(null);

      const response = await fetch('/api/leaderboard/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, userIds })
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string; group?: SavedGroup };
      if (!response.ok || !payload.ok || !payload.group) {
        throw new Error(payload.error || 'No se pudo crear el grupo');
      }

      setGroups((prev) => [...prev, payload.group!]);
      setActiveGroupId(payload.group.id);
      setIsCreateModalOpen(false);
    } catch (error) {
      setGroupsError(error instanceof Error ? error.message : 'No se pudo crear el grupo');
    } finally {
      setGroupMutationLoading(false);
    }
  }

  async function deleteActiveGroup() {
    if (!activeGroup || groupMutationLoading) return;

    try {
      setGroupMutationLoading(true);
      setGroupsError(null);

      const response = await fetch('/api/leaderboard/groups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: activeGroup.id })
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'No se pudo eliminar el grupo');
      }

      setGroups((prev) => prev.filter((g) => g.id !== activeGroup.id));
      setActiveGroupId('all');
    } catch (error) {
      setGroupsError(error instanceof Error ? error.message : 'No se pudo eliminar el grupo');
    } finally {
      setGroupMutationLoading(false);
    }
  }

  if (!rows.length) {
    return <div className="panel">Todavia no hay participantes.</div>;
  }

  return (
    <>
      <div className="stack-md">
        <div className="panel leaderboard-scope-panel">
          <div className="leaderboard-scope-row">
            <div className="leaderboard-scope-tabs" role="group" aria-label="Fase de la tabla de posiciones">
              {SCOPE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  className={`leaderboard-scope-button${activeScope === option.id ? ' is-active' : ''}`}
                  type="button"
                  onClick={() => {
                    setActiveScope(option.id);
                    setSelectedPlayer(null);
                  }}
                  aria-pressed={activeScope === option.id}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {isLoggedIn ? (
              <button
                type="button"
                className="btn btn-primary btn-small leaderboard-inline-create"
                onClick={openCreateModal}
                disabled={groupMutationLoading || groupsLoading}
              >
                Crear grupo
              </button>
            ) : null}
          </div>
          <p className="leaderboard-scope-description">{activeScopeOption.description}</p>
        </div>

        {isLoggedIn && groups.length === 0 && groupsError ? <p className="field-error">{groupsError}</p> : null}

        {isLoggedIn && groups.length > 0 ? (
          <div className="panel stack-md">
            <div className="stack-xs">
              <h3>Grupos de posiciones</h3>
              <p className="muted">Crea grupos propios y filtra la tabla para ver solo sus integrantes.</p>
              {groupsError ? <p className="field-error">{groupsError}</p> : null}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="leaderboard-group-select"
                id="leaderboard-group-filter"
                name="leaderboardGroupFilter"
                value={activeGroupId}
                onChange={(event) => setActiveGroupId(event.target.value)}
                aria-label="Grupo activo de la tabla"
                style={{ minWidth: 260 }}
                disabled={!isLoggedIn || groupsLoading}
              >
                <option value="all">Tabla general (todos)</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>

              <button type="button" className="btn btn-small" onClick={deleteActiveGroup} disabled={!isLoggedIn || !activeGroup || groupMutationLoading}>
                Eliminar grupo activo
              </button>

              <span className="muted">
                {activeGroup ? `${filteredRows.length} integrante(s) en "${activeGroup.name}"` : `${rows.length} participante(s)`}
              </span>
            </div>
          </div>
        ) : null}

        <div className="panel table-wrap">
          <table className="table leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Participante</th>
                <th>Puntos</th>
                <th>G/P</th>
                <th>Exactos</th>
                <th>Ganador/Empate</th>
                <th>Goles</th>
                <th>Incorrectos</th>
                <th>Efectividad</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? (
                filteredRows.map((row, index) => (
                  <tr key={row.userId}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="leader-user-cell">
                        <span className="session-avatar session-avatar-fallback avatar-preview-xs" aria-hidden="true">
                          {initials(row)}
                        </span>
                        <button
                          className="leader-player-button"
                          type="button"
                          onClick={() => void openPlayerDetail(row, positionByUserId.get(row.userId) ?? index + 1)}
                          aria-label={`Ver detalle de ${displayName(row)}`}
                        >
                          <strong>{displayName(row)}</strong>
                        </button>
                      </div>
                    </td>
                    <td>{row.totalPoints}</td>
                    <td><PositionChange value={row.positionChange} /></td>
                    <td>{row.exactHits}</td>
                    <td>{row.outcomeHits}</td>
                    <td>{row.sideGoalsHits}</td>
                    <td>{row.incorrectPredictions}</td>
                    <td>{row.accuracyRate}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="muted" style={{ textAlign: 'center' }}>
                    El grupo seleccionado no tiene integrantes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isLoggedIn && isCreateModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Crear grupo de posiciones"
          style={{
            position: 'fixed',
            inset: 0,
            height: '100dvh',
            zIndex: 120,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: '4vh 1rem 2rem',
            background: isDarkTheme ? 'rgba(8, 13, 24, 0.58)' : 'rgba(34, 44, 66, 0.34)',
            backdropFilter: 'blur(2px)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'auto',
            touchAction: 'pan-y'
          }}
        >
          <div
            className="panel stack-md"
            style={{
              width: 'min(560px, 100%)',
              maxHeight: 'min(80dvh, 700px)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              touchAction: 'pan-y',
              overscrollBehavior: 'auto',
              background: isDarkTheme ? 'rgba(22, 18, 31, 0.97)' : 'rgba(248, 251, 255, 0.98)',
              border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid rgba(24, 44, 86, 0.22)',
              boxShadow: '0 20px 44px rgba(16, 24, 40, 0.32)'
            }}
          >
            <div className="stack-xs">
              <h3>Crear grupo</h3>
              <p className="muted">Define un nombre y selecciona los integrantes que quieras incluir.</p>
            </div>

            <div style={{ display: 'grid', gap: '0.45rem', justifyItems: 'center' }}>
              <input
                id="leaderboard-group-name"
                name="groupName"
                type="text"
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Nombre del grupo"
                aria-label="Nombre del grupo"
                style={{ width: 'min(420px, 100%)', background: isDarkTheme ? 'rgba(10, 10, 18, 0.42)' : '#ffffff' }}
              />
              <input
                id="leaderboard-user-query"
                name="userQuery"
                type="text"
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
                placeholder="Buscar usuario por nombre"
                aria-label="Buscar usuarios"
                style={{ width: 'min(420px, 100%)', background: isDarkTheme ? 'rgba(10, 10, 18, 0.42)' : '#ffffff' }}
              />
            </div>

            <div
              style={{
                border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid rgba(24, 44, 86, 0.22)',
                borderRadius: 12,
                padding: '0.55rem',
                flex: '1 1 auto',
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch',
                overscrollBehaviorY: 'contain',
                background: isDarkTheme ? 'rgba(12, 11, 20, 0.74)' : 'rgba(255, 255, 255, 0.96)'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.36rem', maxWidth: 460, margin: '0 auto' }}>
                {modalRows.map((row) => {
                  const { firstName, lastName } = splitName(row);
                  return (
                    <label
                      key={row.userId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        border: '1px solid var(--line)',
                        borderRadius: 10,
                        padding: '0.48rem 0.62rem',
                        background: isDarkTheme ? 'rgba(255, 255, 255, 0.07)' : 'rgba(248, 250, 255, 0.94)'
                      }}
                    >
                      <input
                        id={`leaderboard-user-${row.userId}`}
                        name={`leaderboard-user-${row.userId}`}
                        type="checkbox"
                        checked={Boolean(draftSelectedUserIds[row.userId])}
                        onChange={() => toggleDraftUser(row.userId)}
                        style={{ width: 18, height: 18, margin: 0, flex: '0 0 auto' }}
                      />
                      <span style={{ display: 'flex', gap: '0.22rem', flexWrap: 'nowrap', alignItems: 'center' }}>
                        <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{firstName}</strong>
                        <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastName}</strong>
                      </span>
                    </label>
                  );
                })}
              </div>
              {!modalRows.length ? (
                <p className="muted" style={{ margin: '0.65rem 0 0' }}>
                  No se encontraron usuarios para esa busqueda.
                </p>
              ) : null}
            </div>

            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '0.2rem',
                paddingTop: '0.35rem',
                paddingBottom: '0.1rem',
                marginTop: 'auto',
                background: 'transparent'
              }}
            >
              <span className="muted">{selectedCount} usuario(s) seleccionado(s)</span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-small" onClick={closeCreateModal}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  onClick={createGroup}
                  disabled={!groupName.trim() || selectedCount === 0 || groupMutationLoading}
                >
                  Crear grupo
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedPlayer ? (
        <LeaderboardPlayerDialog
          row={selectedPlayer.row}
          position={selectedPlayer.position}
          detail={detailCache[`${activeScope}:${selectedPlayer.row.userId}`] ?? null}
          loading={detailLoading}
          error={detailError}
          onClose={() => setSelectedPlayer(null)}
        />
      ) : null}
    </>
  );
}









