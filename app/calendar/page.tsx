import { getState } from '@/lib/db';
import { buildCalendarFixtures, hasKnownTeam } from '@/lib/worldcup26';
import { TeamName } from '@/components/team-name';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const state = await getState();
  const fixtures = buildCalendarFixtures(state.db.matches);

  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>Calendario</h2>
        <p className="muted">
          Fixture oficial cargado desde publicación web con fechas GMT y sedes. La fase final mantiene etiquetas de
          cruce hasta que se definan los clasificados.
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
                <td>{fixture.id}</td>
                <td>{fixture.stage}</td>
                <td>
                  {new Date(fixture.date).toLocaleString('es-AR', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short',
                  })}
                </td>
                <td>
                  {fixture.awayTeam && hasKnownTeam(fixture.homeTeam) ? (
                    <TeamName teamName={fixture.homeTeam} linkToTeam />
                  ) : (
                    fixture.homeTeam
                  )}
                </td>
                <td>
                  {fixture.awayTeam ? (
                    hasKnownTeam(fixture.awayTeam) ? (
                      <TeamName teamName={fixture.awayTeam} linkToTeam />
                    ) : (
                      fixture.awayTeam
                    )
                  ) : (
                    '-'
                  )}
                </td>
                <td>{fixture.venue ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
