'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { User } from '@/lib/types';

type SessionBadgeData = {
  ok: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: User | null;
};

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="9" r="3.35" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M6.2 18.2c1.2-2.4 3.32-3.8 5.8-3.8s4.6 1.4 5.8 3.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 6H6.8A2.8 2.8 0 0 0 4 8.8v6.4A2.8 2.8 0 0 0 6.8 18H10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 12h7.2M16.2 8.2 20 12l-3.8 3.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SessionBadge({ initialData }: { initialData: SessionBadgeData }) {
  const router = useRouter();
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
      router.push('/login');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  if (!data.isAuthenticated) {
    return (
      <div className="session-badge session-badge-loggedout">
        <Link className="nav-link session-login-btn" href="/login">
          Iniciar sesión / Registro
        </Link>
      </div>
    );
  }

  return (
    <div className="session-badge">
      <div className="session-user-actions">
        <Link className="session-icon-btn" href="/profile" aria-label="Ir a mi perfil" title="Ir a mi perfil">
          <ProfileIcon />
        </Link>
        <button
          className="session-icon-btn session-icon-btn-logout"
          type="button"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          onClick={() => void logout()}
          disabled={loggingOut}
        >
          <LogoutIcon />
        </button>
      </div>
    </div>
  );
}

