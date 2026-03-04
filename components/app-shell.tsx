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
import { getUserFromSessionToken } from '@/lib/db';

export async function AppShell({ children }: { children: ReactNode }) {
  const token = cookies().get(getSessionCookieName())?.value ?? null;
  const session = verifySession(token);
  const viewer = session ? await getUserFromSessionToken(token) : null;
  const isLoggedIn = Boolean(viewer);
  const isAdmin = viewer?.role === 'admin';

  const nav = [
    { href: '/inicio', label: 'Inicio' },
    { href: '/calendar', label: 'Calendario' },
    { href: '/teams', label: 'Selecciones' },
    { href: '/rules', label: 'Reglas' },
    { href: '/predictions', label: 'Predicciones' },
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
                <img className="brand-logo-img brand-logo-img-light" src="/fifa_logo_light.png" alt="" loading="eager" decoding="async" />
                <img className="brand-logo-img brand-logo-img-dark" src="/fifa_logo_dark.jfif" alt="" loading="eager" decoding="async" />
              </div>
              <div className="brand-meta">
                <p className="eyebrow">PRODE MUNDIAL</p>
                <h1 className="brand">Prode Amigos 2026</h1>
                <p className="brand-subtitle">Predicciones, ranking y estadísticas del Mundial FIFA 2026</p>
              </div>
              <ThemeToggle />
            </div>

            <div className="topbar-actions">
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
        <div className="container site-footer-inner">
          <p>(c) {new Date().getFullYear()} PRODE Mundial 2026. Sitio web desarrollado por Agustín Miotti.</p>
          <p>
            Proyecto de código abierto, descargable desde{' '}
            <a href="https://github.com/amiotti/ProdeAmigos" target="_blank" rel="noreferrer">
              GitHub
            </a>
            .
          </p>
          <p><Link href="/terms">Términos y condiciones</Link></p>
          <p><Link href="/privacy">Privacidad</Link></p>
          <p><Link href="/contact">Contacto</Link></p>
          <p><Link href="/legal">Aviso legal</Link></p>
        </div>
      </footer>

      <ScrollTopButton />
    </div>
  );
}
