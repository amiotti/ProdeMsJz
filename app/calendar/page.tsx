import { TeamName } from '@/components/team-name';
import { getState } from '@/lib/db';
import { requireAuthenticatedUser } from '@/lib/route-guard';
import { getTeamDisplayName } from '@/lib/worldcup26';

export const revalidate = 60;

type GroupStandingRow = {
  team: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
};

function buildGroupStandings(state: Awaited<ReturnType<typeof getState>>) {
  const standingsByGroup = new Map<string, GroupStandingRow[]>();

  for (const group of state.db.groups) {
    standingsByGroup.set(
      group.id,
      group.teams.map((team) => ({
        team,
        pj: 0,
        g: 0,
        e: 0,
        p: 0,
        gf: 0,
        gc: 0,
        dg: 0,
        pts: 0,
      })),
    );
  }

  const byTeam = new Map<string, GroupStandingRow>();
  for (const rows of standingsByGroup.values()) {
    for (const row of rows) byTeam.set(row.team, row);
  }

  for (const match of state.db.matches) {
    if (!match.officialResult || match.groupId === 'KO') continue;

    const home = byTeam.get(match.homeTeam);
    const away = byTeam.get(match.awayTeam);
    if (!home || !away) continue;

    const hs = match.officialResult.home;
    const as = match.officialResult.away;

    home.pj += 1;
    away.pj += 1;
    home.gf += hs;
    home.gc += as;
    away.gf += as;
    away.gc += hs;

    if (hs > as) {
      home.g += 1;
      home.pts += 3;
      away.p += 1;
    } else if (hs < as) {
      away.g += 1;
      away.pts += 3;
      home.p += 1;
    } else {
      home.e += 1;
      away.e += 1;
      home.pts += 1;
      away.pts += 1;
    }
  }

  for (const rows of standingsByGroup.values()) {
    for (const row of rows) row.dg = row.gf - row.gc;
    rows.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.localeCompare(b.team, 'es');
    });
  }

  return standingsByGroup;
}

function formatDateShortNoYear(isoDate: string) {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(date);
}

export default async function CalendarPage() {
  await requireAuthenticatedUser();
  const state = await getState();
  const standingsByGroup = buildGroupStandings(state);

  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>Fixture</h2>
        <p className="muted">Tabla de posiciones por grupo y partidos programados en formato simplificado.</p>
      </div>

      {state.db.groups.map((group) => {
        const rows = standingsByGroup.get(group.id) ?? [];
        const matches = state.db.matches
          .filter((match) => match.groupId === group.id)
          .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());

        return (
          <div key={group.id} className="panel stack-md">
            <div className="section-head">
              <h3>{group.name}</h3>
              <span>Tabla de posiciones</span>
            </div>

            <div className="table-wrap">
              <table className="table fixture-standings-table">
                <colgroup>
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '40%' }} />
                  <col style={{ width: '6.75%' }} />
                  <col style={{ width: '6.75%' }} />
                  <col style={{ width: '6.75%' }} />
                  <col style={{ width: '6.75%' }} />
                  <col style={{ width: '6.75%' }} />
                  <col style={{ width: '6.75%' }} />
                  <col style={{ width: '6.75%' }} />
                  <col style={{ width: '6.75%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Equipo</th>
                    <th>PJ</th>
                    <th>G</th>
                    <th>E</th>
                    <th>P</th>
                    <th>GF</th>
                    <th>GC</th>
                    <th>DG</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${group.id}-${row.team}`}>
                      <td>{index + 1}</td>
                      <td>
                        <TeamName teamName={row.team} linkToTeam />
                      </td>
                      <td>{row.pj}</td>
                      <td>{row.g}</td>
                      <td>{row.e}</td>
                      <td>{row.p}</td>
                      <td>{row.gf}</td>
                      <td>{row.gc}</td>
                      <td>{row.dg}</td>
                      <td>
                        <strong>{row.pts}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="fixture-matches-compact">
              <p className="fixture-matches-title">PARTIDOS:</p>
              {matches.map((match) => (
                <p key={match.id} className="muted compact-text fixture-match-line">
                  <span className="fixture-match-date">{formatDateShortNoYear(match.kickoffAt)}</span>
                  <span className="fixture-match-teams">
                    {getTeamDisplayName(match.homeTeam)} vs {getTeamDisplayName(match.awayTeam)}
                  </span>
                  <span className="fixture-match-venue">{match.venue ?? ''}</span>
                </p>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
