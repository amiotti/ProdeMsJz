'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { User } from '@/lib/types';

export function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(user.photoDataUrl ?? null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  function onPhotoChange(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone, photoDataUrl, password: password || undefined }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo actualizar el perfil');
      setPassword('');
      setStatus('Perfil actualizado');
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
      router.push('/login');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <section className="stack-lg">
      <form className="panel form-grid" onSubmit={onSubmit}>
        {photoDataUrl ? <img className="avatar-preview avatar-preview-lg" src={photoDataUrl} alt={`Foto de ${user.name}`} /> : null}
        <label>
          Nombre
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </label>
        <label>
          Apellido
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </label>
        <label>
          Email
          <input value={user.email} disabled />
        </label>
        <label>
          Telefono
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        <label>
          Foto de perfil (opcional)
          <input type="file" accept="image/*" onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)} />
        </label>
        <div className="cta-row">
          <button type="button" className="cta-link" onClick={() => setPhotoDataUrl(null)}>
            Quitar foto
          </button>
        </div>
        <label>
          Nueva contraseña (opcional)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            placeholder="Dejar vacio para no cambiar"
          />
        </label>
        <div className="cta-row">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar perfil'}
          </button>
          <button className="btn btn-danger" type="button" onClick={logout} disabled={loggingOut}>
            {loggingOut ? 'Saliendo...' : 'Cerrar sesion'}
          </button>
        </div>
        {status ? <p className="status">{status}</p> : null}
      </form>
    </section>
  );
}
