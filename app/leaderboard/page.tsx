import Link from 'next/link';
import { cookies } from 'next/headers';

import { LeaderboardTable } from '@/components/leaderboard-table';
import { ThemeToggle } from '@/components/theme-toggle';
import { getSessionCookieName } from '@/lib/auth';
import { getLeaderboardPageState, getUserFromSessionToken } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const viewer = await getUserFromSessionToken(token);
  const isLoggedIn = Boolean(viewer);
  const canViewLeaderboard = Boolean(
    viewer && (viewer.role === 'admin' || viewer.registrationPaymentStatus === 'approved'),
  );
  const state = canViewLeaderboard ? await getLeaderboardPageState() : null;

  return (
    <div className={`public-page-shell${isLoggedIn ? '' : ' is-public'}`}>
      {!isLoggedIn ? (
        <>
          <Link className="public-back-btn" href="/" aria-label="Volver a la landing">
            ←
          </Link>
          <div className="public-theme-toggle">
            <ThemeToggle />
          </div>
        </>
      ) : null}

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
          <LeaderboardTable rows={state?.leaderboard ?? []} isLoggedIn={isLoggedIn} />
        ) : (
          <div className="panel">
            <p className="muted">Para ver la tabla de posiciones debes iniciar sesión y tener el pago aprobado.</p>
            <div className="cta-row">
              {!isLoggedIn ? (
                <Link className="cta-link" href="/login">
                  Iniciar sesión
                </Link>
              ) : null}
              <Link className="cta-link" href="/predictions">
                Ir a Predicciones
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
