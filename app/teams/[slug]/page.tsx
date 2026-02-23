import { notFound } from 'next/navigation';

import { FlagBadge } from '@/components/flag-badge';
import { TeamName } from '@/components/team-name';
import { getState } from '@/lib/db';
import { getTeamWikipediaSummary } from '@/lib/wikipedia';
import { buildTeamProdeSummary, buildTeamSportFacts, getAllTeams } from '@/lib/worldcup26';

type TeamDetailPageProps = {
  params: {
    slug: string;
  };
};

export const dynamic = 'force-dynamic';

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const state = await getState();
  const team = getAllTeams().find((item) => item.slug === params.slug);

  if (!team) notFound();

  const group = state.db.groups.find((g) => g.teams.includes(team.name));
  const teamMatches = state.db.matches
    .filter((m) => m.homeTeam === team.name || m.awayTeam === team.name)
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());

  const wiki = await getTeamWikipediaSummary(team.name);
  const profileSummary = buildTeamProdeSummary(team.name, group?.id);
  const sportFacts = buildTeamSportFacts(team.name, group?.teams);

  return (
    <section className="stack-lg">
      <div className="panel stack-md">
        <div className="team-card-header">
          <FlagBadge teamName={team.name} size="lg" />
          <div>
            <h2>{team.name}</h2>
            <p className="muted">
              {team.confederation} · Grupo {group?.id ?? '-'}
            </p>
          </div>
        </div>

        <p className="muted">{team.shortDescription}</p>
        {team.notes ? <p className="team-notes">{team.notes}</p> : null}

        <div className="detail-grid">
          <div className="detail-card">
            <span className="detail-label">Indice de fuerza (app)</span>
            <strong>{team.fifaStrength}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Estado de cupo</span>
            <strong>{team.isPlaceholder ? 'Pendiente de repechaje' : 'Clasificado'}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Partidos de grupo</span>
            <strong>{teamMatches.length}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Perfil competitivo</span>
            <strong>
              {team.fifaStrength >= 1930
                ? 'Favorito'
                : team.fifaStrength >= 1860
                  ? 'Candidato'
                  : team.fifaStrength >= 1780
                    ? 'Competitivo'
                    : 'En desarrollo'}
            </strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Condicion deportiva</span>
            <strong>{team.isPlaceholder ? 'Pendiente de definicion' : 'Seleccion confirmada'}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Objetivo estimado</span>
            <strong>{team.fifaStrength >= 1880 ? 'Pelear fase final' : 'Competir en grupo'}</strong>
          </div>
        </div>
      </div>

      <div className="panel stack-md">
        <h3>Claves deportivas</h3>
        <ul className="rules-bullets">
          {sportFacts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
        <p className="muted">{profileSummary}</p>
      </div>

      <div className="panel stack-md">
        <h3>Resumen enciclopedico (secundario)</h3>
        {wiki ? (
          <>
            <p className="muted">{wiki.extract}</p>
            <p className="muted">
              Fuente enciclopedica: <a className="inline-link" href={wiki.pageUrl} target="_blank" rel="noreferrer">Wikipedia</a>
            </p>
          </>
        ) : (
          <p className="muted">
            No se pudo cargar un resumen enciclopedico en este momento. Se muestra igualmente la informacion del
            torneo y del PRODE.
          </p>
        )}
      </div>

      <div className="panel stack-md">
        <h3>Grupo {group?.id ?? '-'}</h3>
        <div className="teams-chip-row">
          {group?.teams.map((teamName) => (
            <TeamName key={teamName} teamName={teamName} linkToTeam />
          ))}
        </div>
      </div>

      <div className="panel table-wrap">
        <h3>Partidos de fase de grupos</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Partido</th>
              <th>Fecha</th>
              <th>Sede</th>
              <th>Fixture</th>
              <th>Resultado oficial</th>
            </tr>
          </thead>
          <tbody>
            {teamMatches.map((match) => (
              <tr key={match.id}>
                <td>{match.id}</td>
                <td>
                  {new Date(match.kickoffAt).toLocaleString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td>{match.venue ?? '-'}</td>
                <td>
                  <span className="fixture-inline">
                    <TeamName teamName={match.homeTeam} linkToTeam /> <span className="vs">vs</span>{' '}
                    <TeamName teamName={match.awayTeam} linkToTeam />
                  </span>
                </td>
                <td>
                  {match.officialResult ? `${match.officialResult.home} - ${match.officialResult.away}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
