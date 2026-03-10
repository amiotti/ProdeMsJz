import Link from 'next/link';

import { getTeamInfo, hasKnownTeam } from '@/lib/worldcup26';
import { FlagBadge } from '@/components/flag-badge';

type TeamNameProps = {
  teamName: string;
  linkToTeam?: boolean;
  className?: string;
};

export function TeamName({ teamName, linkToTeam = false, className }: TeamNameProps) {
  const info = getTeamInfo(teamName);
  const label = (
    <span className={className ? `team-inline ${className}` : 'team-inline'}>
      <FlagBadge teamName={teamName} />
      <span>{teamName}</span>
    </span>
  );

  if (!linkToTeam || !hasKnownTeam(teamName)) return label;

  return <Link href={`/teams/${info.slug}`}>{label}</Link>;
}

