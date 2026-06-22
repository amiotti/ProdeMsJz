import { getTeamDisplayName } from '@/lib/worldcup26';
import type { TeamFormResult } from '@/lib/team-form';

const RESULT_LABEL = {
  win: 'G',
  draw: 'E',
  loss: 'P',
} as const;

export function TeamFormSummary({
  teamName,
  results,
  onOpen,
}: {
  teamName: string;
  results: TeamFormResult[];
  onOpen: () => void;
}) {
  const slots = Array.from({ length: 5 }, (_, index) => results[index] ?? null);
  const displayName = getTeamDisplayName(teamName);

  return (
    <button
      className="team-form-summary"
      type="button"
      onClick={onOpen}
      aria-label={`Ver los últimos partidos de ${displayName}`}
    >
      <span className="team-form-title">Últimos 5</span>
      <span className="team-form-dots" aria-hidden="true">
        {slots.map((result, index) => (
          <span
            key={result?.matchId ?? `empty-${index}`}
            className={`team-form-dot${result ? ` is-${result.result}` : ' is-empty'}`}
          >
            {result ? RESULT_LABEL[result.result] : ''}
          </span>
        ))}
      </span>
      <span className="team-form-arrow" aria-hidden="true">›</span>
    </button>
  );
}
