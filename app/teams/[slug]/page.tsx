import { notFound } from 'next/navigation';

import { FlagBadge } from '@/components/flag-badge';
import { TeamName } from '@/components/team-name';
import { getState } from '@/lib/db';
import { requireAuthenticatedUser } from '@/lib/route-guard';
import { getTeamWikipediaSummary } from '@/lib/wikipedia';
import {
  buildTeamEditorialNotes,
  buildTeamProdeSummary,
  buildTeamSportFacts,
  getAllTeams,
  getFifaTeamNewsUrl,
} from '@/lib/worldcup26';

type TeamDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const revalidate = 60;

const matchDateFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: 'numeric',
  month: 'numeric',
});

function formatMatchDateShort(dateIso: string) {
  return matchDateFormatter.format(new Date(dateIso));
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  await requireAuthenticatedUser();
  const { slug } = await params;
  const state = await getState();
  const team = getAllTeams().find((item) => item.slug === decodeURIComponent(slug));

  if (!team) notFound();

  const group = state.db.groups.find((g) => g.teams.includes(team.name));
  const teamMatches = state.db.matches
    .filter((m) => m.homeTeam === team.name || m.awayTeam === team.name)
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());

  const wiki = await getTeamWikipediaSummary(team.name);
  const profileSummary = buildTeamProdeSummary(team.name, group?.id);
  const sportFacts = buildTeamSportFacts(team.name, group?.teams);
  const editorial = buildTeamEditorialNotes(team.name, group?.id, group?.teams);
  const teamNewsUrl = getFifaTeamNewsUrl(team.name);

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
            <span className="detail-label">Índice de fuerza (app)</span>
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
            <span className="detail-label">Condición deportiva</span>
            <strong>{team.isPlaceholder ? 'Pendiente de definición' : 'Selección confirmada'}</strong>
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
        <h3>Resumen del equipo</h3>
        <p className="muted">{wiki?.extract ?? editorial.summary}</p>
        <p className="muted">
          <strong>Dato relevante:</strong> {editorial.relevantFact.replace(/^Dato relevante:\s*/i, '')}
        </p>
        <p className="muted">
          <strong>Dato curioso:</strong> {editorial.curiousFact.replace(/^Dato curioso:\s*/i, '')}
        </p>
        {wiki ? (
          <p className="muted">
            Fuente enciclopédica:{' '}
            <a className="inline-link" href={wiki.pageUrl} target="_blank" rel="noreferrer">
              Wikipedia
            </a>
          </p>
        ) : (
          <p className="muted">No se pudo cargar Wikipedia en este momento; se muestra una síntesis deportiva local.</p>
        )}
      </div>

      <div className="panel stack-md">
        <h3>Noticias</h3>
        {teamNewsUrl ? (
          <p className="muted">
            Podés seguir las últimas noticias de este equipo{' '}
            <a className="inline-link" href={teamNewsUrl} target="_blank" rel="noreferrer">
              aquí
            </a>
            .
          </p>
        ) : (
          <p className="muted">
            Esta selección aún no tiene una página oficial de noticias disponible porque su cupo todavía no está
            definido.
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
              <th className="fixture-col-header">Fixture</th>
              <th>Resultado oficial</th>
            </tr>
          </thead>
          <tbody>
            {teamMatches.map((match) => (
              <tr key={match.id}>
                <td className="match-code-nowrap">{match.id}</td>
                <td>{formatMatchDateShort(match.kickoffAt)}</td>
                <td>{match.venue ?? '-'}</td>
                <td className="fixture-col-cell">
                  <span className="fixture-inline fixture-inline-table">
                    <span className="fixture-home">
                      <TeamName teamName={match.homeTeam} linkToTeam />
                    </span>
                    <span className="vs">vs</span>
                    <span className="fixture-away">
                      <TeamName teamName={match.awayTeam} linkToTeam />
                    </span>
                  </span>
                </td>
                <td>{match.officialResult ? `${match.officialResult.home} - ${match.officialResult.away}` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}






