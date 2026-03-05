import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { ThemeToggle } from '@/components/theme-toggle';
import { getSessionCookieName, verifySession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  if (verifySession(token)) {
    redirect('/inicio');
  }

  return (
    <section className="landing-screen">
      <div className="public-theme-toggle">
        <ThemeToggle />
      </div>
      <div className="landing-backdrop" aria-hidden="true" />
      <div className="landing-orb landing-orb-a" aria-hidden="true" />
      <div className="landing-orb landing-orb-b" aria-hidden="true" />

      <div className="landing-grid">
        <div className="landing-panel landing-main">
          <p className="landing-kicker">PRODE MUNDIAL FIFA 2026</p>
          <h2 className="landing-title">
            PARTICIPÁ DEL <span>PRODE LBB</span> 🍺
          </h2>
          <p className="landing-copy">
            Registrate, pagá la prata (no barrani) y cargá pronósticos partido por partido. El ranking se actualiza
            automáticamente cuando se cargan los resultados oficiales. Así evitamos acomodos y excusas 😂
          </p>

          <div className="landing-cta-row">
            <Link className="landing-cta-primary" href="/login">
              Iniciar sesión / Registrarse
            </Link>
            <Link className="landing-cta-secondary" href="/leaderboard">
              Ver tabla pública
            </Link>
          </div>

          <div className="landing-badges">
            <span className="landing-badge">Fixture completo</span>
            <span className="landing-badge">Predicciones por grupo</span>
            <span className="landing-badge">Estadísticas</span>
            <span className="landing-badge">Ranking en vivo</span>
          </div>
        </div>

        <div className="landing-panel landing-side">
          <div className="landing-card-stack">
            <div className="landing-mini-card">
              <span className="landing-mini-label">Top 5 premios</span>
              <strong>$2.000.000 / $500.000</strong>
              <small>y premios especiales</small>
            </div>
            <div className="landing-mini-card">
              <span className="landing-mini-label">Modo de juego</span>
              <strong>Predicción editable</strong>
              <small>hasta 1 hora antes del partido</small>
            </div>
            <div className="landing-mini-card">
              <span className="landing-mini-label">Resultados</span>
              <strong>Oficiales + tablas</strong>
              <small>por grupo y ranking general</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
