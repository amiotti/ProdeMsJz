'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (previousPath.current && previousPath.current !== pathname) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
    previousPath.current = pathname;
  }, [pathname]);

  return (
    <div key={pathname} className="page-transition-shell">
      <span className="route-sweep" aria-hidden="true" />
      {children}
    </div>
  );
}
