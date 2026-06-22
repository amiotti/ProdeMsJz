'use client';

import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

import { TeamName } from '@/components/team-name';
import type { LeaderboardParticipantDetail, LeaderboardRow } from '@/lib/types';

function playerName(row: LeaderboardRow) {
  return `${row.firstName} ${row.lastName}`.trim() || row.userName;
}

export function LeaderboardPlayerDialog({
  row,
  position,
  detail,
  onClose,
}: {
  row: LeaderboardRow;
  position: number;
  detail: LeaderboardParticipantDetail | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const matchSections = useMemo(() => {
    const matches = detail?.matches ?? [];
    const groupMatches = matches.filter((match) => match.stageLabel.startsWith('Grupo '));
    const knockoutByStage = new Map<string, typeof matches>();

    for (const match of matches.filter((item) => !item.stageLabel.startsWith('Grupo '))) {
      const section = knockoutByStage.get(match.stageLabel) ?? [];
      section.push(match);
      knockoutByStage.set(match.stageLabel, section);
    }

    return [
      ...(groupMatches.length ? [{ title: 'Fase de grupos', matches: groupMatches }] : []),
      ...Array.from(knockoutByStage, ([title, sectionMatches]) => ({ title, matches: sectionMatches })),
    ];
  }, [detail]);

  return createPortal(
    <div className="detail-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="detail-dialog leaderboard-player-dialog panel stack-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leaderboard-player-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="detail-dialog-head">
          <div>
            <p className="eyebrow">Detalle del participante</p>
            <h3 id="leaderboard-player-title">{playerName(row)}</h3>
          </div>
          <button className="detail-dialog-close" type="button" onClick={onClose} aria-label="Cerrar detalle">
            ×
          </button>
        </div>

        <div className="player-detail-kpis">
          <span><strong>#{position}</strong> Posición</span>
          <span><strong>{row.totalPoints}</strong> Puntos</span>
          <span><strong>{row.exactHits}</strong> Exactos</span>
          <span><strong>{row.outcomeHits}</strong> Signos</span>
          <span><strong>{row.sideGoalsHits}</strong> Goles</span>
          <span><strong>{row.accuracyRate}%</strong> Efectividad</span>
        </div>

        <div className="player-result-sections">
          {matchSections.length ? (
            matchSections.map((section) => (
              <section key={section.title} className="player-result-section">
                <div className="player-result-section-head">
                  <h4>{section.title}</h4>
                  <span>{section.matches.length} partido(s)</span>
                </div>
                <div className="player-result-list">
                  {section.matches.map((match) => (
                    <article key={match.matchId} className="player-result-row">
                      <div className="player-result-info">
                        <div className="player-result-fixture">
                          <TeamName teamName={match.homeTeam} linkToTeam />
                          <strong>{match.officialResult.home} - {match.officialResult.away}</strong>
                          <TeamName teamName={match.awayTeam} linkToTeam />
                        </div>
                      </div>
                      <div className="player-result-prediction">
                        <span>Predicción</span>
                        <strong>
                          {match.prediction ? `${match.prediction.home} - ${match.prediction.away}` : 'Sin predicción'}
                        </strong>
                      </div>
                      <span className={`player-result-points${match.points === null ? ' is-empty' : ''}`}>
                        {match.points === null ? '—' : `+${match.points} pts`}
                      </span>
                    </article>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <p className="muted">Todavía no hay partidos con resultados oficiales cargados.</p>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
