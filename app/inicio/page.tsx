import Link from 'next/link';

import { TeamName } from '@/components/team-name';
import { formatDateTimeArgentina } from '@/lib/datetime';
import { getHomePageState } from '@/lib/db';
import { requireAuthenticatedUser } from '@/lib/route-guard';

export const dynamic = 'force-dynamic';

export default async function InicioPage() {
  await requireAuthenticatedUser();
  const state = await getHomePageState();

  const totalMatches = state.summary.matches;
  const resultsLoaded = state.summary.matchesWithOfficialResult;
  const loadProgressPct = totalMatches > 0 ? Math.round((resultsLoaded / totalMatches) * 100) : 0;
  const nextMatch = [...state.matches]
    .filter((m) => new Date(m.kickoffAt).getTime() > Date.now())
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())[0];
  const currentLeader = state.leaderboard[0] ?? null;
  const hasLeaderWithPoints = Boolean(currentLeader && currentLeader.totalPoints > 0 && resultsLoaded > 0);
  const leaderName = hasLeaderWithPoints && currentLeader ? `${currentLeader.firstName} ${currentLeader.lastName}` : 'Sin resultados oficiales cargados';
  const leaderMeta = hasLeaderWithPoints && currentLeader ? `${currentLeader.totalPoints} pts` : 'Se actualiza cuando haya resultados oficiales y puntajes';

  return (
    <section className="stack-lg">
      <div className="hero">
        <div className="panel">
          <p className="eyebrow hero-kicker">FIFA WORLD CUP 26</p>
          <h2 className="hero-title">PRODE Mundial 2026</h2>
          <p className="muted">
            Registro de participantes, predicciones por partido, resultados oficiales y tabla de posiciones para el
            torneo de 48 selecciones.
          </p>
          <div className="panel prizes-panel">
            <h3>Premios Top 10</h3>
            <p className="muted">Habrá premios para el Top 10 de participantes con mayor puntuación.</p>
          </div>
          <div className="cta-row">
            <Link href="/predictions" className="cta-link">
              Cargar predicciones
            </Link>
            <Link href="/leaderboard" className="cta-link">
              Ver tabla
            </Link>
            <Link href="/calendar" className="cta-link">
              Ver fixture
            </Link>
          </div>
        </div>

        <div className="panel stack-md">
          <h3>Resumen</h3>
          <div className="cards cards-summary">
            <div className="stat-card">
              <div className="muted">Usuarios (pago aprobado)</div>
              <div className="value">{state.paidParticipants}</div>
            </div>
            <div className="stat-card">
              <div className="muted">Resultados Cargados</div>
              <div className="value">{state.summary.matchesWithOfficialResult}</div>
            </div>
            <div className="stat-card">
              <div className="muted">Predicciones Totales</div>
              <div className="value">{state.summary.predictions}</div>
            </div>
            <div className="stat-card">
              <div className="muted">Avance Resultados</div>
              <div className="value">{loadProgressPct}%</div>
            </div>
          </div>
          <p className="muted">
            Puntaje actual: {state.pointsConfig.exactScore} puntos exacto / {state.pointsConfig.correctOutcome}{' '}
            puntos por ganador o empate.
          </p>
          <div className="detail-grid">
            <div className="detail-card">
              <span className="detail-label">Partidos del torneo</span>
              <strong>{totalMatches}</strong>
              <span className="muted compact-text">Fixture completo del Mundial 2026 cargado en la sección Fixture.</span>
            </div>
            <div className="detail-card">
              <span className="detail-label">Líder provisional</span>
              <strong>{leaderName}</strong>
              <span className="muted compact-text">{leaderMeta}</span>
            </div>
            <div className="detail-card">
              <span className="detail-label">Próximo partido</span>
              <strong>{nextMatch ? `${nextMatch.homeTeam} vs ${nextMatch.awayTeam}` : 'Sin partidos pendientes'}</strong>
              <span className="muted compact-text">
                {nextMatch ? formatDateTimeArgentina(nextMatch.kickoffAt) : 'El fixture no tiene fechas futuras'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="panel stack-md">
        <h3>Grupos (zonas) y equipos</h3>
        <p className="muted">Grupos cargados con selecciones definidas tras el sorteo.</p>
        <div className="group-grid">
          {state.groups.map((group) => (
            <div key={group.id} className="group-card">
              <h4>{group.name}</h4>
              <ul>
                {group.teams.map((team) => (
                  <li key={team}>
                    <TeamName teamName={team} linkToTeam />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
