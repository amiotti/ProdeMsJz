import Link from 'next/link';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

import { HeaderNav } from '@/components/header-nav';
import { PageTransition } from '@/components/page-transition';
import { ScrollTopButton } from '@/components/scroll-top-button';
import { SessionBadge } from '@/components/session-badge';
import { SessionIdleGuard } from '@/components/session-idle-guard';
import { ThemeToggle } from '@/components/theme-toggle';
import { getSessionCookieName, verifySession } from '@/lib/auth';
import { getNewContactMessagesCount, getUserFromSessionToken } from '@/lib/db';

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4.5a4.5 4.5 0 0 0-4.5 4.5v2.1c0 1.2-.38 2.37-1.1 3.33l-1.2 1.62A1 1 0 0 0 6 18.5h12a1 1 0 0 0 .8-1.59l-1.2-1.62a5.6 5.6 0 0 1-1.1-3.33V9A4.5 4.5 0 0 0 12 4.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 19.2a2.3 2.3 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export async function AppShell({ children }: { children: ReactNode }) {
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const session = verifySession(token);
  const viewer = session ? await getUserFromSessionToken(token) : null;
  const isLoggedIn = Boolean(viewer);
  const isAdmin = viewer?.role === 'admin';
  const newContactCount = isAdmin ? await getNewContactMessagesCount() : 0;

  const nav = [
    { href: '/inicio', label: 'Inicio' },
    { href: '/calendar', label: 'Calendario' },
    { href: '/teams', label: 'Selecciones' },
    { href: '/rules', label: 'Reglas' },
    ...(isAdmin ? [] : [{ href: '/predictions', label: 'Predicciones' }]),
    { href: '/results', label: 'Resultados Oficiales' },
    { href: '/leaderboard', label: 'Tabla' },
    { href: '/stats', label: 'Estadísticas' },
    ...(isAdmin ? [{ href: '/users', label: 'Usuarios' }] : []),
  ];

  return (
    <div className="app-bg">
      {isLoggedIn ? (
        <header className="topbar">
          <div className="topbar-main">
            <div className="brand-wrap">
              <div className="brand-logo-panel" aria-hidden="true">
                <img className="brand-logo-img" src="/profile.jpeg" alt="" loading="eager" decoding="async" />
              </div>
              <div className="brand-meta">
                <p className="eyebrow">Mundial 2026 USA | MEX | CAN</p>
                <h1 className="brand">Prode MSJZ</h1>
                <p className="brand-subtitle">Predicciones, ranking y estadísticas del Mundial FIFA 2026</p>
              </div>
              <ThemeToggle />
            </div>

            <div className="topbar-actions">
              {isAdmin ? (
                <Link className="admin-alert-link" href="/users" aria-label="Ver consultas de contacto" title="Ver consultas de contacto">
                  <BellIcon />
                  <span className="admin-alert-badge">{newContactCount}</span>
                </Link>
              ) : null}
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

          <HeaderNav items={nav} />
        </header>
      ) : null}

      <main className="container">
        <PageTransition>{children}</PageTransition>
      </main>

      <SessionIdleGuard enabled={isLoggedIn} />

      <footer className="site-footer">
        <div className="site-footer-inner">
          <p>
            (c) 2026 PRODE MSJZ Mundial 2026. Sitio desarrollado por{' '}
            <a href="https://github.com/amiotti/ProdeMsJz" target="_blank" rel="noreferrer">
              A. Miotti
            </a>{' '}
            | <Link href="/terms">T&C</Link> | <Link href="/privacy">Privacidad</Link> | <Link href="/legal">Aviso Legal</Link> |{' '}
            <Link href="/contact">Contacto</Link>
          </p>
        </div>
      </footer>

      <ScrollTopButton />
    </div>
  );
}


