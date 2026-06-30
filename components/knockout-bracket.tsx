'use client';

import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { TeamName } from '@/components/team-name';
import type { Match } from '@/lib/types';

const KNOCKOUT_STAGE_ORDER = ['16avos', '8vos', 'Cuartos', 'Semifinal', 'Final', 'Tercer puesto'] as const;

const KNOCKOUT_STAGE_LABELS: Record<string, string> = {
  '16avos': 'Eliminatoria de 32',
  '8vos': 'Octavos de final',
  Cuartos: 'Cuartos de final',
  Semifinal: 'Semifinales',
  'Tercer puesto': 'Tercer puesto',
  Final: 'Final',
};

const KNOCKOUT_STAGE_MATCH_ORDER: Record<string, string[]> = {
  '16avos': [
    'KO-73',
    'KO-76',
    'KO-74',
    'KO-75',
    'KO-78',
    'KO-77',
    'KO-79',
    'KO-80',
    'KO-82',
    'KO-81',
    'KO-84',
    'KO-83',
    'KO-85',
    'KO-88',
    'KO-86',
    'KO-87',
  ],
  '8vos': ['KO-89', 'KO-90', 'KO-91', 'KO-92', 'KO-93', 'KO-94', 'KO-95', 'KO-96'],
  Cuartos: ['KO-97', 'KO-99', 'KO-98', 'KO-100'],
  Semifinal: ['KO-101', 'KO-102'],
  Final: ['KO-104'],
  'Tercer puesto': ['KO-103'],
};

function sortKnockoutMatches(stage: string, matches: Match[]) {
  const order = KNOCKOUT_STAGE_MATCH_ORDER[stage] ?? [];
  const positionById = new Map(order.map((id, index) => [id, index] as const));

  return [...matches].sort((a, b) => {
    const aPosition = positionById.get(a.id);
    const bPosition = positionById.get(b.id);
    if (aPosition !== undefined || bPosition !== undefined) {
      return (aPosition ?? Number.MAX_SAFE_INTEGER) - (bPosition ?? Number.MAX_SAFE_INTEGER);
    }
    return new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
  });
}

function formatKnockoutDate(kickoffAt: string) {
  const parts = new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Argentina/Buenos_Aires',
  }).formatToParts(new Date(kickoffAt));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = `${values.weekday?.charAt(0).toUpperCase()}${values.weekday?.slice(1).replace('.', '')}`;
  return `${weekday} ${values.day}/${values.month} - ${values.hour}:${values.minute} hs`;
}

function getKnockoutRounds(matches: Match[]) {
  const knockoutMatches = matches
    .filter((match) => match.groupId === 'KO')
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());

  return KNOCKOUT_STAGE_ORDER.map((stage) => ({
    stage,
    label: KNOCKOUT_STAGE_LABELS[stage],
    matches: sortKnockoutMatches(stage, knockoutMatches.filter((match) => match.stage === stage)),
  })).filter((round) => round.matches.length > 0);
}

function getKnockoutSlot(stage: string, index: number) {
  if (stage === '16avos') return index;
  if (stage === '8vos') return index * 2 + 0.5;
  if (stage === 'Cuartos') return index * 4 + 1.5;
  if (stage === 'Semifinal') return index * 8 + 3.5;
  if (stage === 'Final') return 7.5;
  if (stage === 'Tercer puesto') return 7.5;
  return index;
}

export function KnockoutBracket({ matches }: { matches: Match[] }) {
  const knockoutRounds = getKnockoutRounds(matches);
  const scrollRef = useRef<HTMLDivElement>(null);
  const roundRefs = useRef(new Map<string, HTMLDivElement>());
  const [activeStage, setActiveStage] = useState<string>(knockoutRounds[0]?.stage ?? '16avos');

  function setRoundRef(stage: string, node: HTMLDivElement | null) {
    if (!node) {
      roundRefs.current.delete(stage);
      return;
    }
    roundRefs.current.set(stage, node);
  }

  function focusRound(stage: string) {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || !roundRefs.current.get(stage)) return;

    setActiveStage(stage);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const updatedNode = roundRefs.current.get(stage);
        if (!updatedNode) return;

        const containerLeft = scrollContainer.getBoundingClientRect().left;
        const roundLeft = updatedNode.getBoundingClientRect().left;
        const nextLeft = scrollContainer.scrollLeft + roundLeft - containerLeft;

        scrollContainer.scrollTo({
          left: Math.max(nextLeft, 0),
          behavior: 'smooth',
        });
      });
    });
  }

  return (
    <div className={`panel stack-md knockout-panel ${activeStage !== '16avos' ? 'knockout-panel-compact' : ''}`}>
      <div>
        <p className="eyebrow">Llaves actualizadas</p>
        <h3>Fase Eliminatoria</h3>
        <p className="muted compact-text">
          Los cruces se recalculan automáticamente con las posiciones actuales de los grupos y los resultados oficiales cargados.
        </p>
      </div>
      <div ref={scrollRef} className="knockout-scroll" role="region" aria-label="Cuadro de fase eliminatoria" tabIndex={0}>
        <div className="knockout-bracket">
          {knockoutRounds.map((round) => (
            <div key={round.stage} ref={(node) => setRoundRef(round.stage, node)} className="knockout-round">
              <h4>
                <button
                  type="button"
                  className={`knockout-round-link ${activeStage === round.stage ? 'is-active' : ''}`}
                  onClick={() => focusRound(round.stage)}
                  aria-current={activeStage === round.stage ? 'true' : undefined}
                >
                  {round.label}
                </button>
              </h4>
              <div className="knockout-match-list">
                {round.matches.map((match, matchIndex) => (
                  <article
                    key={match.id}
                    className="knockout-match-card"
                    style={{ '--knockout-slot': getKnockoutSlot(round.stage, matchIndex) } as CSSProperties}
                  >
                    <span className="knockout-date">{formatKnockoutDate(match.kickoffAt)}</span>
                    <div className="knockout-team-row">
                      <TeamName teamName={match.homeTeam} linkToTeam />
                      {match.officialResult ? <strong>{match.officialResult.home}</strong> : null}
                    </div>
                    <div className="knockout-team-row">
                      <TeamName teamName={match.awayTeam} linkToTeam />
                      {match.officialResult ? <strong>{match.officialResult.away}</strong> : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
