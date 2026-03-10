'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

type NavItem = {
  href: string;
  label: string;
};

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === '/inicio') return pathname === '/inicio';
  return pathname.startsWith(`${href}/`);
}

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

export function HeaderNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (detailsRef.current?.open) {
      detailsRef.current.open = false;
    }
  }, [pathname]);

  const currentLabel = useMemo(
    () => items.find((item) => isActivePath(pathname, item.href))?.label ?? 'Inicio',
    [items, pathname],
  );

  async function logout(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  function goToProfile(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    router.push('/profile');
  }

  return (
    <>
      <nav className="nav nav-desktop">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className={`nav-link${active ? ' is-active' : ''}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <details className="mobile-nav" ref={detailsRef}>
        <summary className="mobile-nav-trigger" aria-label="Abrir menú de secciones">
          <span className="mobile-nav-trigger-left">
            <span className="mobile-nav-trigger-icon" aria-hidden="true">
              ☰
            </span>
            <span>{currentLabel}</span>
          </span>
          <span className="mobile-nav-trigger-current">
            <button
              className="mobile-nav-action"
              type="button"
              aria-label="Ir a mi perfil"
              title="Ir a mi perfil"
              onClick={goToProfile}
            >
              <ProfileIcon />
            </button>
            <button
              className="mobile-nav-action mobile-nav-action-logout"
              type="button"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              onClick={logout}
              disabled={loggingOut}
            >
              <LogoutIcon />
            </button>
          </span>
        </summary>
        <nav className="mobile-nav-panel" aria-label="Secciones">
          {items.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-nav-link${active ? ' is-active' : ''}`}
                onClick={() => {
                  if (detailsRef.current) detailsRef.current.open = false;
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </details>
    </>
  );
}



