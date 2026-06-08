'use client';

import { useState } from 'react';

import type { ContactMessage, ContactMessageStatus, LeaderboardRow, User } from '@/lib/types';

const contactStatusLabel: Record<ContactMessageStatus, string> = {
  new: 'Nueva',
  contacted: 'Contactada',
  resolved: 'Resuelta',
};

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

type HistoricalProdeRow = {
  name: string;
  values: Array<number | 'X'>;
  played: number;
};

const HISTORICAL_COLUMNS = ['Brasil 2014', 'Rusia 2018', 'Copa Ame/Eu', 'Mini Ame/Eu', 'Qatar 2022', 'Copa Ame/Euro', 'Mini Copa Ame/Euro'] as const;

const HISTORICAL_PRODE_ROWS: HistoricalProdeRow[] = [
  { name: 'BOSSA', values: [20, 27, 36, 8, 29, 36, 13], played: 299 },
  { name: 'BOTACIN', values: [23, 28, 34, 10, 27, 32, 12], played: 299 },
  { name: 'MIOTTI', values: [21, 26, 'X', 'X', 28, 35, 14], played: 227 },
  { name: 'CALVO', values: [20, 27, 33, 'X', 29, 'X', 'X'], played: 200 },
  { name: 'ZIELINSKI', values: [22, 28, 34, 10, 24, 30, 'X'], played: 276 },
  { name: 'TUESCA', values: [21, 29, 32, 'X', 26, 30, 'X'], played: 260 },
  { name: 'DEL BARCO', values: [21, 27, 37, 7, 26, 30, 10], played: 299 },
  { name: 'VENTURINO', values: [18, 26, 'X', 'X', 28, 35, 9], played: 227 },
  { name: 'PEROTTI', values: [20, 'X', 34, 7, 27, 32, 8], played: 251 },
  { name: 'BODELLO', values: [14, 26, 29, 8, 25, 36, 13], played: 299 },
  { name: 'ROSSANIGO', values: [19, 'X', 27, 6, 31, 32, 10], played: 251 },
  { name: 'FRAIZ', values: [20, 24, 30, 4, 26, 36, 8], played: 299 },
  { name: 'LAMBER', values: [18, 21, 27, 'X', 27, 29, 13], played: 283 },
];

const HISTORICAL_MATCH_COUNTS = [48, 48, 56, 16, 48, 60, 23] as const;

function normalizeHistoricalName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function historicalValueTotal(values: Array<number | 'X'>) {
  return values.reduce<number>((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
}

function buildCurrentSignHitsByHistoricalName(leaderboard: LeaderboardRow[]) {
  const map = new Map<string, number>();
  for (const row of leaderboard) {
    const fullName = normalizeHistoricalName(`${row.firstName} ${row.lastName}`);
    const lastName = normalizeHistoricalName(row.lastName || row.userName);
    const signHits = row.exactHits + row.outcomeHits;
    if (lastName) map.set(lastName, signHits);
    if (fullName) map.set(fullName, signHits);
  }
  return map;
}

export function UsersPanel({
  initialUsers,
  initialMessages,
  leaderboard,
  currentOfficialMatches,
}: {
  initialUsers: User[];
  initialMessages: ContactMessage[];
  leaderboard: LeaderboardRow[];
  currentOfficialMatches: number;
}) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [messages, setMessages] = useState<ContactMessage[]>(initialMessages);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, User['registrationPaymentStatus']>>(
    Object.fromEntries(initialUsers.map((user) => [user.id, user.registrationPaymentStatus ?? 'pending'])),
  );

  function syncUsers(nextUsers: User[]) {
    setUsers(nextUsers);
    setPaymentDrafts(
      Object.fromEntries(nextUsers.map((user) => [user.id, user.registrationPaymentStatus ?? 'pending'])),
    );
  }

  async function deleteUser(userId: string) {
    setLoadingUserId(userId);
    setStatus(null);
    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo eliminar');
      syncUsers((data.users as User[]) ?? []);
      setStatus('Usuario eliminado.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo eliminar el usuario');
    } finally {
      setLoadingUserId(null);
    }
  }

  async function updatePaymentStatus(userId: string, registrationPaymentStatus: User['registrationPaymentStatus']) {
    setLoadingUserId(userId);
    setStatus(null);
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, registrationPaymentStatus }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo actualizar el pago');
      syncUsers((data.users as User[]) ?? []);
      setStatus('Estado de pago actualizado.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo actualizar el pago');
    } finally {
      setLoadingUserId(null);
    }
  }

  async function updateMessageStatus(messageId: string, nextStatus: ContactMessageStatus) {
    setLoadingMessageId(messageId);
    setStatus(null);
    try {
      const response = await fetch('/api/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo actualizar la consulta');
      setMessages((data.messages as ContactMessage[]) ?? []);
      setStatus('Estado de consulta actualizado.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo actualizar la consulta');
    } finally {
      setLoadingMessageId(null);
    }
  }

  const currentSignHitsByName = buildCurrentSignHitsByHistoricalName(leaderboard);
  const historicalTotalMatches = HISTORICAL_MATCH_COUNTS.reduce((sum, value) => sum + value, 0);
  const totalMatchesWithCurrent = historicalTotalMatches + currentOfficialMatches;

  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>Usuarios</h2>
        <p className="muted">Panel exclusivo de administrador. Lista de todos los usuarios registrados y consultas recibidas.</p>
      </div>

      {status ? <p className="status">{status}</p> : null}

      <div className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>CBU/CVU o Alias</th>
              <th>Pago</th>
              <th>Rol</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <span className="session-avatar session-avatar-fallback avatar-preview-xs" aria-hidden="true">
                    {user.firstName?.[0] ?? user.name?.[0] ?? 'U'}
                  </span>
                </td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.phone}</td>
                <td>{user.bankInfo}</td>
                <td>
                  {user.role === 'admin' ? (
                    <span className="muted">Aprobado</span>
                  ) : (
                    <div className="inline-actions">
                      <select
                        id={`users-payment-${user.id}`}
                        name={`paymentStatus-${user.id}`}
                        value={paymentDrafts[user.id] ?? 'pending'}
                        onChange={(e) => {
                          const nextStatus = e.target.value as User['registrationPaymentStatus'];
                          setPaymentDrafts((prev) => ({
                            ...prev,
                            [user.id]: nextStatus,
                          }));
                          void updatePaymentStatus(user.id, nextStatus);
                        }}
                        disabled={loadingUserId === user.id}
                      >
                        <option value="pending">Pendiente</option>
                        <option value="approved">Aprobado</option>
                        <option value="failed">Fallido</option>
                      </select>
                    </div>
                  )}
                </td>
                <td>{user.role === 'admin' ? 'Administrador' : 'Usuario'}</td>
                <td>
                  {user.role === 'admin' ? (
                    <span className="muted">No editable</span>
                  ) : (
                    <div className="inline-actions user-row-actions">
                      <a
                        className="btn btn-primary btn-small"
                        href={`/api/profile/predictions-pdf?userId=${encodeURIComponent(user.id)}`}
                      >
                        Predicciones
                      </a>
                      <button
                        className="btn btn-danger btn-small"
                        type="button"
                        onClick={() => deleteUser(user.id)}
                        disabled={loadingUserId === user.id}
                      >
                        {loadingUserId === user.id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel stack-md historical-prode-panel">
        <div className="section-head">
          <h3>Tabla histórica PRODE LBB</h3>
          <span>Aciertos por signo</span>
        </div>
        <p className="muted">
          Comparativa histórica de prodes anteriores, continuada con los aciertos por signo del Mundial 2026.
        </p>
        <div className="table-wrap">
          <table className="table historical-prode-table">
            <thead>
              <tr>
                <th>Nombre</th>
                {HISTORICAL_COLUMNS.map((column) => (
                  <th key={column}>{column}</th>
                ))}
                <th>Mundial 2026</th>
                <th>Total aciertos</th>
                <th>% acierto</th>
                <th>Jugados</th>
                <th>% jugados</th>
              </tr>
            </thead>
            <tbody>
              {HISTORICAL_PRODE_ROWS.map((row) => {
                const currentHits = currentSignHitsByName.get(normalizeHistoricalName(row.name)) ?? 0;
                const totalHits = historicalValueTotal(row.values) + currentHits;
                const played = row.played + currentOfficialMatches;
                const hitPct = played > 0 ? Math.round((totalHits / played) * 100) : 0;
                const playedPct = totalMatchesWithCurrent > 0 ? Math.round((played / totalMatchesWithCurrent) * 100) : 0;

                return (
                  <tr key={row.name}>
                    <th scope="row">{row.name}</th>
                    {row.values.map((value, index) => (
                      <td key={`${row.name}-${HISTORICAL_COLUMNS[index]}`}>{value}</td>
                    ))}
                    <td>{currentHits}</td>
                    <td>{totalHits}</td>
                    <td>{hitPct}%</td>
                    <td>{played}</td>
                    <td>{playedPct}%</td>
                  </tr>
                );
              })}
              <tr className="historical-prode-total-row">
                <th scope="row">PARTIDOS</th>
                {HISTORICAL_MATCH_COUNTS.map((value, index) => (
                  <td key={`matches-${HISTORICAL_COLUMNS[index]}`}>{value}</td>
                ))}
                <td>{currentOfficialMatches}</td>
                <td>{totalMatchesWithCurrent}</td>
                <td>-</td>
                <td>{totalMatchesWithCurrent}</td>
                <td>100%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted compact-text">* Se muestran participantes con historial relevante. La columna Mundial 2026 se actualiza con resultados oficiales cargados.</p>
      </div>

      <div className="panel stack-md">
        <div className="section-head">
          <h3>Consultas de contacto</h3>
          <span>{messages.length} recibidas</span>
        </div>

        {messages.length === 0 ? (
          <p className="muted">Todavía no hay consultas cargadas desde el formulario de contacto.</p>
        ) : (
          <div className="contact-admin-list">
            {messages.map((message) => (
              <article key={message.id} className="contact-admin-card">
                <div className="contact-admin-head">
                  <div className="stack-xs">
                    <strong>{message.name}</strong>
                    <div className="contact-admin-meta">
                      <a href={`mailto:${message.email}`}>{message.email}</a>
                      {message.phone ? <a href={`tel:${message.phone}`}>{message.phone}</a> : <span>Sin teléfono</span>}
                      <span>{dateFormatter.format(new Date(message.createdAt))}</span>
                    </div>
                  </div>

                  <label className="contact-status-field">
                    Estado
                    <select
                      id={`contact-status-${message.id}`}
                      name={`contactStatus-${message.id}`}
                      value={message.status}
                      onChange={(e) => void updateMessageStatus(message.id, e.target.value as ContactMessageStatus)}
                      disabled={loadingMessageId === message.id}
                    >
                      <option value="new">Nueva</option>
                      <option value="contacted">Contactada</option>
                      <option value="resolved">Resuelta</option>
                    </select>
                  </label>
                </div>

                <p className="contact-admin-message">{message.message}</p>
                <span className={`badge-pill contact-status-badge status-${message.status}`}>{contactStatusLabel[message.status]}</span>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
