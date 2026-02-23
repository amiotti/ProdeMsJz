'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { User } from '@/lib/types';

type SessionBadgeData = {
  ok: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: User | null;
};

export function SessionBadge({ initialData }: { initialData: SessionBadgeData }) {
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<SessionBadgeData>(initialData);
  const [loggingOut, setLoggingOut] = useState(false);

  async function refreshSession() {
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      const json = (await response.json()) as SessionBadgeData;
      setData(json);
    } catch {
      setData((prev) => prev);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        const json = (await response.json()) as SessionBadgeData;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData((prev) => prev);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    function onAuthChanged() {
      void refreshSession();
    }
    window.addEventListener('prode-auth-changed', onAuthChanged);
    return () => window.removeEventListener('prode-auth-changed', onAuthChanged);
  }, []);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setData({ ok: true, isAuthenticated: false, isAdmin: false, user: null });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('prode-auth-changed'));
      }
      router.push('/login');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  if (!data.isAuthenticated || !data.user) {
    return (
      <div className="session-badge session-badge-loggedout">
        <Link className="nav-link session-login-btn" href="/login">
          Iniciar sesion / Registro
        </Link>
      </div>
    );
  }

  const user = data.user;

  return (
    <div className="session-badge">
      {user.photoDataUrl ? (
        <img className="session-avatar" src={user.photoDataUrl} alt={`Foto de ${user.name}`} />
      ) : (
        <span className="session-avatar session-avatar-fallback" aria-hidden="true">
          {`${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || (user.name?.[0] ?? 'U')}
        </span>
      )}
      <Link className="session-user-text" href="/profile" title="Ir a mi perfil">
        <strong>{user.name}</strong>
        <span>{user.role === 'admin' ? 'Administrador' : 'Usuario'}</span>
      </Link>
      <button className="nav-link session-logout-btn" type="button" onClick={logout} disabled={loggingOut} title="Cerrar sesion">
        {loggingOut ? 'Saliendo...' : 'Salir'}
      </button>
    </div>
  );
}
