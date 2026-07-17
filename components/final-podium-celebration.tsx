'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';

import type { PendingPodiumCelebration } from '@/lib/db';

type ConfettiStyle = CSSProperties & {
  '--confetti-left': string;
  '--confetti-drift': string;
  '--confetti-delay': string;
  '--confetti-duration': string;
  '--confetti-spin': string;
};

const COLORS = ['#ffd76a', '#f4be1f', '#cbd5e1', '#cd7f32', '#59e3d7', '#ffffff', '#ff5f78'];
const MEDALS: Record<PendingPodiumCelebration['rank'], string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const TITLES: Record<PendingPodiumCelebration['rank'], string> = {
  1: '¡Campeón del PRODE!',
  2: '¡Subcampeón del PRODE!',
  3: '¡Tercer puesto del PRODE!',
};

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

export function FinalPodiumCelebration({ podium }: { podium: PendingPodiumCelebration | null }) {
  const [visible, setVisible] = useState(Boolean(podium));
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    setVisible(Boolean(podium));
    setAcknowledged(false);
  }, [podium?.podiumKey]);

  const pieces = useMemo(() => {
    if (!podium) return [];
    return Array.from({ length: 140 }, (_, pieceIndex) => {
      const seed = pieceIndex + podium.rank * 1000;
      const left = pseudoRandom(seed) * 100;
      const drift = (pseudoRandom(seed + 17) - 0.5) * 42;
      const delay = pseudoRandom(seed + 31) * 900;
      const duration = 2600 + pseudoRandom(seed + 47) * 1500;
      const spin = 360 + Math.round(pseudoRandom(seed + 59) * 1080);
      const width = 6 + Math.round(pseudoRandom(seed + 71) * 8);
      const height = 9 + Math.round(pseudoRandom(seed + 83) * 12);
      const style: ConfettiStyle = {
        '--confetti-left': `${left}%`,
        '--confetti-drift': `${drift}vw`,
        '--confetti-delay': `${delay}ms`,
        '--confetti-duration': `${duration}ms`,
        '--confetti-spin': `${spin}deg`,
        width,
        height,
        backgroundColor: COLORS[pieceIndex % COLORS.length],
      };
      return { key: `${podium.podiumKey}-${pieceIndex}`, style };
    });
  }, [podium]);

  async function acknowledge() {
    if (!podium || acknowledged) return;
    setAcknowledged(true);
    try {
      const response = await fetch('/api/celebrations/podium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ podiumKey: podium.podiumKey }),
      });
      if (response.status === 401) {
        window.location.assign('/login');
        return;
      }
    } finally {
      setVisible(false);
    }
  }

  useEffect(() => {
    if (!podium || !visible) return;
    const timer = window.setTimeout(() => void acknowledge(), 9000);
    return () => window.clearTimeout(timer);
  }, [podium, visible, acknowledged]);

  if (!podium || !visible) return null;

  return (
    <>
      <div className="exact-hit-confetti" aria-hidden="true">
        {pieces.map((piece) => (
          <span key={piece.key} className="exact-hit-confetti-piece" style={piece.style} />
        ))}
      </div>
      <div className="podium-celebration-backdrop" role="presentation" onClick={() => void acknowledge()}>
        <section
          className="podium-celebration-card panel stack-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="podium-celebration-title"
          onClick={(event) => event.stopPropagation()}
        >
          <button className="dialog-close" type="button" onClick={() => void acknowledge()} aria-label="Cerrar felicitación">
            ×
          </button>
          <div className="podium-celebration-medal" aria-hidden="true">{MEDALS[podium.rank]}</div>
          <p className="eyebrow">Podio final definido</p>
          <h2 id="podium-celebration-title">{TITLES[podium.rank]}</h2>
          <p className="muted">
            Terminaste en el <strong>{podium.rank}° puesto</strong> con <strong>{podium.points} puntos</strong>.
          </p>
          <div className="podium-celebration-list" aria-label="Podio final">
            {podium.topThree.map((item) => (
              <div key={item.userId} className={`podium-celebration-row podium-rank-${item.rank}`}>
                <span aria-hidden="true">{MEDALS[item.rank]}</span>
                <strong>{item.name}</strong>
                <em>{item.points} pts</em>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
