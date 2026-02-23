'use client';

import { useState } from 'react';

import type { User } from '@/lib/types';

export function UsersPanel({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function deleteUser(userId: string) {
    setLoadingId(userId);
    setStatus(null);
    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo eliminar');
      setUsers((data.users as User[]) ?? []);
      setStatus('Usuario eliminado.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo eliminar el usuario');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>Usuarios</h2>
        <p className="muted">Panel exclusivo de administrador. Lista de todos los usuarios registrados.</p>
      </div>

      {status ? <p className="status">{status}</p> : null}

      <div className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Foto</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Telefono</th>
              <th>Rol</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.photoDataUrl ? (
                    <img className="avatar-preview avatar-preview-xs" src={user.photoDataUrl} alt={`Foto de ${user.name}`} />
                  ) : (
                    <span className="session-avatar session-avatar-fallback avatar-preview-xs" aria-hidden="true">
                      {user.firstName?.[0] ?? user.name?.[0] ?? 'U'}
                    </span>
                  )}
                </td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.phone}</td>
                <td>{user.role === 'admin' ? 'Administrador' : 'Usuario'}</td>
                <td>
                  {user.role === 'admin' ? (
                    <span className="muted">No editable</span>
                  ) : (
                    <button
                      className="btn btn-danger btn-small"
                      type="button"
                      onClick={() => deleteUser(user.id)}
                      disabled={loadingId === user.id}
                    >
                      {loadingId === user.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
