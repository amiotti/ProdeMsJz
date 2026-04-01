'use client';

import { useState } from 'react';

import type { ContactMessage, ContactMessageStatus, User } from '@/lib/types';

const contactStatusLabel: Record<ContactMessageStatus, string> = {
  new: 'Nueva',
  contacted: 'Contactada',
  resolved: 'Resuelta',
};

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function UsersPanel({ initialUsers, initialMessages }: { initialUsers: User[]; initialMessages: ContactMessage[] }) {
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
                    <button
                      className="btn btn-danger btn-small"
                      type="button"
                      onClick={() => deleteUser(user.id)}
                      disabled={loadingUserId === user.id}
                    >
                      {loadingUserId === user.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
