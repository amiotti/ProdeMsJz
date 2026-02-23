import Link from 'next/link';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

import { SessionBadge } from '@/components/session-badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { getSessionCookieName, verifySession } from '@/lib/auth';
import { getUserFromSessionToken } from '@/lib/db';

export async function AppShell({ children }: { children: ReactNode }) {
  const token = cookies().get(getSessionCookieName())?.value ?? null;
  const session = verifySession(token);
  const viewer = session ? await getUserFromSessionToken(token) : null;
  const isLoggedIn = Boolean(viewer);
  const isAdmin = viewer?.role === 'admin';

  const nav = [
    { href: '/', label: 'Inicio' },
    { href: '/calendar', label: 'Calendario' },
    { href: '/teams', label: 'Selecciones' },
    { href: '/rules', label: 'Reglas' },
    { href: '/predictions', label: 'Predicciones' },
    { href: '/results', label: isAdmin ? 'Resultados Oficiales' : 'Resultados Oficiales' },
    { href: '/leaderboard', label: 'Tabla' },
    ...(isAdmin ? [{ href: '/users', label: 'Usuarios' }] : []),
    ...(isLoggedIn ? [{ href: '/profile', label: 'Perfil' }] : []),
  ];

  return (
    <div className="app-bg">
      <header className="topbar">
        <div className="topbar-main">
          <div>
            <p className="eyebrow">PRODE MUNDIAL</p>
            <h1 className="brand">Futbol 2026</h1>
          </div>
          <div className="topbar-actions">
            <ThemeToggle />
            <SessionBadge
              initialData={{
                ok: true,
                isAuthenticated: Boolean(viewer),
                isAdmin: Boolean(isAdmin),
                user: viewer,
              }}
            />
          </div>
        </div>

        <nav className="nav">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="container">{children}</main>
      <footer className="site-footer">
        <div className="container site-footer-inner">
          <p>
            © {new Date().getFullYear()} PRODE Mundial 2026. Sitio web desarrollado por Agustin Miotti.
          </p>
          <p>
            Proyecto de codigo abierto, descargable desde GitHub.
          </p>
        </div>
      </footer>
    </div>
  );
}
