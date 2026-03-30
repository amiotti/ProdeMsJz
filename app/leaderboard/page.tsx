import Link from 'next/link';

import { LeaderboardTable } from '@/components/leaderboard-table';
import { getLeaderboardPageState } from '@/lib/db';
import { requireAuthenticatedUser } from '@/lib/route-guard';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const { user } = await requireAuthenticatedUser();
  const canViewLeaderboard = user.role === 'admin' || user.registrationPaymentStatus === 'approved';
  const state = canViewLeaderboard ? await getLeaderboardPageState() : null;

  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>Tabla de posiciones</h2>
        {canViewLeaderboard ? (
          <p className="muted">
            Ranking de participantes segun resultados oficiales cargados. Desempate por exactos y luego por aciertos
            de ganador/empate.
          </p>
        ) : (
          <p className="muted">Esta sección está disponible solo para usuarios con inscripción aprobada.</p>
        )}
      </div>

      {canViewLeaderboard ? (
        <LeaderboardTable rows={state?.leaderboard ?? []} isLoggedIn />
      ) : (
        <div className="panel">
          <p className="muted">Para ver la tabla de posiciones debes tener el pago de inscripción aprobado.</p>
          <div className="cta-row">
            <Link className="cta-link" href="/predictions">
              Ir a Predicciones
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
