'use client';

import { useEffect, useMemo, useState } from 'react';

function getRemaining(kickoffAt: string) {
  const target = new Date(kickoffAt).getTime();
  const diff = Math.max(0, target - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds, finished: diff === 0 };
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function NextMatchCountdown({
  kickoffAt,
  homeTeam,
  awayTeam,
}: {
  kickoffAt?: string | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
}) {
  const [remaining, setRemaining] = useState(() => (kickoffAt ? getRemaining(kickoffAt) : null));

  useEffect(() => {
    if (!kickoffAt) {
      setRemaining(null);
      return;
    }

    setRemaining(getRemaining(kickoffAt));
    const id = window.setInterval(() => {
      setRemaining(getRemaining(kickoffAt));
    }, 1000);

    return () => window.clearInterval(id);
  }, [kickoffAt]);

  const matchLabel = useMemo(() => {
    if (!homeTeam || !awayTeam) return 'Sin próximo partido';
    return `${homeTeam} vs ${awayTeam}`;
  }, [awayTeam, homeTeam]);

  if (!kickoffAt || !remaining) {
    return (
      <div className="next-match-countdown">
        <div>
          <p className="countdown-label">Próximo partido</p>
          <strong>{matchLabel}</strong>
        </div>
        <p className="muted compact-text">No hay partidos futuros cargados.</p>
      </div>
    );
  }

  return (
    <div className="next-match-countdown">
      <div className="countdown-copy">
        <p className="countdown-label">Próximo partido</p>
        <strong>{matchLabel}</strong>
        <span>Faltan</span>
      </div>
      <div className="countdown-clock" aria-label={`Faltan ${remaining.hours} horas, ${remaining.minutes} minutos y ${remaining.seconds} segundos`}>
        <span>
          <strong>{pad(remaining.hours)}</strong>
          <small>hs</small>
        </span>
        <span>
          <strong>{pad(remaining.minutes)}</strong>
          <small>min</small>
        </span>
        <span>
          <strong>{pad(remaining.seconds)}</strong>
          <small>seg</small>
        </span>
      </div>
    </div>
  );
}
