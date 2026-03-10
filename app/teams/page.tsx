import Link from 'next/link';

import { FlagBadge } from '@/components/flag-badge';
import { getState } from '@/lib/db';
import { buildTeamProdeSummary, buildTeamSportFacts, getAllTeams } from '@/lib/worldcup26';

export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
  const state = await getState();
  const teams = getAllTeams();
  const groupByTeam = new Map<string, string>();

  for (const group of state.db.groups) {
    for (const team of group.teams) {
      groupByTeam.set(team, group.id);
    }
  }

  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>Selecciones</h2>
        <p className="muted">
          Vista comparativa con datos deportivos útiles para el PRODE: fuerza estimada, exigencia del grupo y rival más
          duro. Entrá a cada selección para ver el detalle completo.
        </p>
      </div>

      <div className="teams-grid">
        {teams.map((team) => {
          const groupId = groupByTeam.get(team.name);
          const groupTeams = state.db.groups.find((g) => g.id === groupId)?.teams;
          const sportFacts = buildTeamSportFacts(team.name, groupTeams);

          return (
            <Link href={`/teams/${team.slug}`} key={team.id} className="team-card-link">
              <article className="team-card panel">
                <div className="team-card-header">
                  <FlagBadge teamName={team.name} size="lg" />
                  <div>
                    <h3>{team.name}</h3>
                    <p className="muted">
                      {team.confederation} · Grupo {groupId ?? '-'}
                    </p>
                  </div>
                </div>

                <p className="muted">{team.shortDescription}</p>
                <p className="muted">{buildTeamProdeSummary(team.name, groupId)}</p>

                <ul className="rules-bullets compact-bullets">
                  {sportFacts.slice(0, 3).map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>

                <div className="chips-row">
                  <span className="chip">Índice {team.fifaStrength}</span>
                  <span className="chip">{team.isPlaceholder ? 'Cupo por repechaje' : 'Clasificado'}</span>
                  <span className="chip">{team.confederation}</span>
                </div>

                {team.notes ? <p className="team-notes">{team.notes}</p> : null}
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

