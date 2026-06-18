'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';

type ConfettiStyle = CSSProperties & {
  '--confetti-left': string;
  '--confetti-drift': string;
  '--confetti-delay': string;
  '--confetti-duration': string;
  '--confetti-spin': string;
};

const COLORS = ['#ef3100', '#f4be1f', '#59e3d7', '#3850dd', '#d6ff2e', '#ff5f78', '#ffffff'];
const PIECES_PER_BURST = 80;
const BURST_GAP_MS = 720;
const FALL_DURATION_MS = 3100;
const MAX_BURSTS_PER_VISIT = 6;

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

export function ExactHitConfetti({ pendingMatchIds }: { pendingMatchIds: string[] }) {
  const matchIds = useMemo(
    () => Array.from(new Set(pendingMatchIds)).slice(0, MAX_BURSTS_PER_VISIT),
    [pendingMatchIds],
  );
  const [active, setActive] = useState(false);

  const pieces = useMemo(
    () =>
      matchIds.flatMap((matchId, burstIndex) =>
        Array.from({ length: PIECES_PER_BURST }, (_, pieceIndex) => {
          const seed = burstIndex * 1000 + pieceIndex + 1;
          const left = pseudoRandom(seed) * 100;
          const drift = (pseudoRandom(seed + 17) - 0.5) * 34;
          const delay = burstIndex * BURST_GAP_MS + pseudoRandom(seed + 31) * 520;
          const duration = 2200 + pseudoRandom(seed + 47) * 1100;
          const spin = 360 + Math.round(pseudoRandom(seed + 59) * 900);
          const width = 6 + Math.round(pseudoRandom(seed + 71) * 7);
          const height = 9 + Math.round(pseudoRandom(seed + 83) * 10);
          const style: ConfettiStyle = {
            '--confetti-left': `${left}%`,
            '--confetti-drift': `${drift}vw`,
            '--confetti-delay': `${delay}ms`,
            '--confetti-duration': `${duration}ms`,
            '--confetti-spin': `${spin}deg`,
            width,
            height,
            backgroundColor: COLORS[(pieceIndex + burstIndex) % COLORS.length],
          };
          return { key: `${matchId}-${pieceIndex}`, style };
        }),
      ),
    [matchIds],
  );

  useEffect(() => {
    if (matchIds.length === 0) return;
    setActive(true);

    const finishAfter = (matchIds.length - 1) * BURST_GAP_MS + FALL_DURATION_MS + 600;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/celebrations/exact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchIds }),
        });
        if (response.status === 401) {
          window.location.assign('/login');
          return;
        }
        setActive(false);
      } catch {
        // If acknowledgement fails, keep it pending so it can be celebrated on the next visit.
        setActive(false);
      }
    }, finishAfter);

    return () => window.clearTimeout(timer);
  }, [matchIds]);

  if (!active || pieces.length === 0) return null;

  return (
    <div className="exact-hit-confetti" aria-hidden="true">
      {pieces.map((piece) => (
        <span key={piece.key} className="exact-hit-confetti-piece" style={piece.style} />
      ))}
    </div>
  );
}
