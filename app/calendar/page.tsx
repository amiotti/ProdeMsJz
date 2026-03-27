import { TeamName } from '@/components/team-name';
import { getState } from '@/lib/db';
import { formatKickoffArgentina } from '@/lib/datetime';

export const revalidate = 60;

export default async function CalendarPage() {
  const state = await getState();
  const fixtures = [...state.db.matches]
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
    .map((match) => ({
      id: match.id,
      stage: match.groupId === 'KO' ? match.stage ?? 'Fase final' : `Fase de grupos - ${match.groupId}`,
      date: match.kickoffAt,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      venue: match.venue ?? null,
    }));

  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>Calendario</h2>
        <p className="muted">
          Fixture oficial con fechas y sedes. Los horarios se muestran en hora de Argentina. La fase final mantiene
          etiquetas de cruce hasta que se definan los clasificados.
        </p>
      </div>

      <div className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Partido</th>
              <th>Etapa</th>
              <th>Fecha</th>
              <th>Local</th>
              <th>Visitante</th>
              <th>Sede</th>
            </tr>
          </thead>
          <tbody>
            {fixtures.map((fixture) => (
              <tr key={fixture.id}>
                <td>
                  <span className="match-code-nowrap">{fixture.id}</span>
                </td>
                <td>{fixture.stage}</td>
                <td>{formatKickoffArgentina(fixture.date)}</td>
                <td><TeamName teamName={fixture.homeTeam} linkToTeam /></td>
                <td><TeamName teamName={fixture.awayTeam} linkToTeam /></td>
                <td>{fixture.venue ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
