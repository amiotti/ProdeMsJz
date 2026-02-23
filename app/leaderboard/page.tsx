import { LeaderboardTable } from '@/components/leaderboard-table';
import { getState } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const state = await getState();

  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>Tabla de posiciones</h2>
        <p className="muted">
          Ranking de participantes (sin incluir al administrador) segun resultados oficiales cargados. Desempate por exactos y luego por
          aciertos de ganador/empate.
        </p>
      </div>
      <LeaderboardTable rows={state.leaderboard} />
    </section>
  );
}
