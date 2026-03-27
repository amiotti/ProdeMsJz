'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { User } from '@/lib/types';

export function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const isAdmin = user.role === 'admin';
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone);
  const [bankInfo, setBankInfo] = useState(user.bankInfo);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone, bankInfo, password: password || undefined }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo actualizar el perfil');
      if (data.user) {
        setFirstName(data.user.firstName ?? firstName);
        setLastName(data.user.lastName ?? lastName);
        setPhone(data.user.phone ?? phone);
        setBankInfo(data.user.bankInfo ?? bankInfo);
      }
      setPassword('');
      setStatus('Perfil actualizado');
      setEditing(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('prode-auth-changed'));
      }
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoggingOut(true);
    setStatus(null);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('prode-auth-changed'));
      }
      router.push('/login');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <section className="stack-lg">
      {isAdmin ? (
        <div className="panel stack-md">
          <div className="section-head">
            <h3>Perfil administrador</h3>
          </div>
          <p className="muted">En esta cuenta no se muestran datos de registro editables ni predicciones guardadas.</p>
          <div className="detail-grid">
            <div className="detail-card">
              <span className="detail-label">Email</span>
              <strong>{user.email}</strong>
            </div>
            <div className="detail-card">
              <span className="detail-label">Rol</span>
              <strong>Administrador</strong>
            </div>
          </div>
          <div className="cta-row">
            <button className="btn btn-primary" type="button" onClick={logout} disabled={loggingOut}>
              {loggingOut ? 'Saliendo...' : 'Cerrar sesión'}
            </button>
          </div>
          {status ? <p className="status">{status}</p> : null}
        </div>
      ) : (
        <form className="panel stack-md profile-form" onSubmit={onSubmit}>
          <div className="section-head">
            <h3>Datos de registro</h3>
            <button className="btn btn-primary btn-small" type="button" onClick={() => setEditing((prev) => !prev)}>
              {editing ? 'Cancelar edición' : 'Editar perfil'}
            </button>
          </div>

          {editing ? (
            <div className="form-grid">
              <label>
                Nombre
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required disabled={loading} />
              </label>
              <label>
                Apellido
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} required disabled={loading} />
              </label>
              <label>
                Email
                <input value={user.email} disabled />
              </label>
              <label>
                Teléfono
                <input value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={loading} />
              </label>
              <label>
                CBU/CVU o Alias
                <input value={bankInfo} onChange={(e) => setBankInfo(e.target.value)} required disabled={loading} />
              </label>
              <label>
                Nueva contraseña (opcional)
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  placeholder="Dejar vacío para no cambiar"
                  disabled={loading}
                />
              </label>
            </div>
          ) : (
            <div className="detail-grid">
              <div className="detail-card">
                <span className="detail-label">Nombre</span>
                <strong>{firstName}</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Apellido</span>
                <strong>{lastName}</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Email</span>
                <strong>{user.email}</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Teléfono</span>
                <strong>{phone}</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">CBU/CVU o Alias</span>
                <strong>{bankInfo}</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Rol</span>
                <strong>Usuario</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Estado inscripción</span>
                <strong>{user.registrationPaymentStatus ?? 'pending'}</strong>
              </div>
            </div>
          )}

          <div className="cta-row">
            {editing ? (
              <>
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar perfil'}
                </button>
                <button className="btn" type="button" onClick={() => setEditing(false)} disabled={loading}>
                  Cancelar
                </button>
              </>
            ) : null}
            <button className="btn btn-primary" type="button" onClick={logout} disabled={loggingOut}>
              {loggingOut ? 'Saliendo...' : 'Cerrar sesión'}
            </button>
          </div>
          {status ? <p className="status">{status}</p> : null}
        </form>
      )}
    </section>
  );
}



