'use client';

import { useEffect } from 'react';

import { TeamName } from '@/components/team-name';
import { formatDateArgentinaShort } from '@/lib/datetime';
import type { TeamFormResult } from '@/lib/team-form';
import { getTeamDisplayName } from '@/lib/worldcup26';

const RESULT_TEXT = {
  win: 'Ganó',
  draw: 'Empató',
  loss: 'Perdió',
} as const;

export function TeamFormDialog({
  teamName,
  results,
  onClose,
}: {
  teamName: string;
  results: TeamFormResult[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const displayName = getTeamDisplayName(teamName);

  return (
    <div className="detail-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="detail-dialog panel stack-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-form-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="detail-dialog-head">
          <div>
            <p className="eyebrow">Forma reciente</p>
            <h3 id="team-form-dialog-title">Últimos partidos de {displayName}</h3>
          </div>
          <button className="detail-dialog-close" type="button" onClick={onClose} aria-label="Cerrar detalle">
            ×
          </button>
        </div>

        {results.length ? (
          <div className="team-form-result-list">
            {results.map((result) => (
              <article key={result.matchId} className="team-form-result-row">
                <span className={`team-form-result-badge is-${result.result}`}>{RESULT_TEXT[result.result]}</span>
                <div className="team-form-result-main">
                  <span className="muted">{formatDateArgentinaShort(result.kickoffAt)}</span>
                  <div className="team-form-opponent">
                    <span>vs</span>
                    <TeamName teamName={result.opponent} linkToTeam />
                  </div>
                </div>
                <strong className="team-form-score">{result.teamScore} - {result.opponentScore}</strong>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">Todavía no hay resultados oficiales cargados para esta selección.</p>
        )}
      </section>
    </div>
  );
}
