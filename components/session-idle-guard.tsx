'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const HEARTBEAT_THROTTLE_MS = 60 * 1000;
const STORAGE_KEY = 'prode:last-activity-at';

export function SessionIdleGuard({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = useRef<number | null>(null);
  const lastHeartbeatRef = useRef(0);
  const loggingOutRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const now = Date.now();
    const stored = Number(window.localStorage.getItem(STORAGE_KEY) ?? '0');
    const baseline = Number.isFinite(stored) && stored > 0 && now - stored < IDLE_TIMEOUT_MS ? stored : now;

    const clearTimer = () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const logoutForInactivity = async () => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {
        // noop
      } finally {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
          window.dispatchEvent(new Event('prode-auth-changed'));
        } catch {
          // noop
        }
        router.push('/login');
        router.refresh();
      }
    };

    const scheduleFrom = (lastAt: number) => {
      clearTimer();
      const remaining = Math.max(0, IDLE_TIMEOUT_MS - (Date.now() - lastAt));
      timeoutRef.current = window.setTimeout(() => {
        void logoutForInactivity();
      }, remaining);
    };

    const heartbeat = async (force = false) => {
      const nowAt = Date.now();
      if (!force && nowAt - lastHeartbeatRef.current < HEARTBEAT_THROTTLE_MS) return;
      lastHeartbeatRef.current = nowAt;
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = (await response.json().catch(() => null)) as { isAuthenticated?: boolean } | null;
        if (response.status === 401 || data?.isAuthenticated === false) {
          await logoutForInactivity();
        }
      } catch {
        // noop: network hiccup should not force logout immediately
      }
    };

    const touchActivity = (forceHeartbeat = false) => {
      const ts = Date.now();
      try {
        window.localStorage.setItem(STORAGE_KEY, String(ts));
      } catch {
        // noop
      }
      scheduleFrom(ts);
      void heartbeat(forceHeartbeat);
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, String(baseline));
    } catch {
      // noop
    }

    scheduleFrom(baseline);
    void heartbeat(true);

    const onUserActivity = () => touchActivity(false);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        touchActivity(true);
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      const ts = Number(event.newValue);
      if (!Number.isFinite(ts)) return;
      scheduleFrom(ts);
    };

    window.addEventListener('mousemove', onUserActivity, { passive: true });
    window.addEventListener('mousedown', onUserActivity, { passive: true });
    window.addEventListener('keydown', onUserActivity);
    window.addEventListener('touchstart', onUserActivity, { passive: true });
    window.addEventListener('scroll', onUserActivity, { passive: true });
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimer();
      window.removeEventListener('mousemove', onUserActivity);
      window.removeEventListener('mousedown', onUserActivity);
      window.removeEventListener('keydown', onUserActivity);
      window.removeEventListener('touchstart', onUserActivity);
      window.removeEventListener('scroll', onUserActivity);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, pathname, router]);

  return null;
}
