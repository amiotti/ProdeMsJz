import Link from 'next/link';
import { cookies } from 'next/headers';

import { ThemeToggle } from '@/components/theme-toggle';
import { getSessionCookieName, verifySession } from '@/lib/auth';
import { LeaderboardTable } from '@/components/leaderboard-table';
import { getLeaderboardPageState } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const state = await getLeaderboardPageState();
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const isLoggedIn = Boolean(verifySession(token));

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
          <p className="muted">
            Ranking de participantes segun resultados oficiales cargados. Desempate por exactos y luego por aciertos de
            ganador/empate.
          </p>
        </div>
        <LeaderboardTable rows={state.leaderboard} isLoggedIn={isLoggedIn} />
      </section>
    </div>
  );
}


