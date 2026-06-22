import type { Match, Score } from '@/lib/types';

export type TeamFormResult = {
  matchId: string;
  kickoffAt: string;
  opponent: string;
  teamScore: number;
  opponentScore: number;
  result: 'win' | 'draw' | 'loss';
  officialResult: Score;
  homeTeam: string;
  awayTeam: string;
};

export function getRecentTeamResults(teamName: string, matches: Match[], limit = 3): TeamFormResult[] {
  return matches
    .filter(
      (match): match is Match & { officialResult: Score } =>
        Boolean(match.officialResult) && (match.homeTeam === teamName || match.awayTeam === teamName),
    )
    .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime())
    .slice(0, limit)
    .map((match) => {
      const isHome = match.homeTeam === teamName;
      const teamScore = isHome ? match.officialResult.home : match.officialResult.away;
      const opponentScore = isHome ? match.officialResult.away : match.officialResult.home;

      return {
        matchId: match.id,
        kickoffAt: match.kickoffAt,
        opponent: isHome ? match.awayTeam : match.homeTeam,
        teamScore,
        opponentScore,
        result: teamScore > opponentScore ? 'win' : teamScore < opponentScore ? 'loss' : 'draw',
        officialResult: match.officialResult,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
      };
    });
}
