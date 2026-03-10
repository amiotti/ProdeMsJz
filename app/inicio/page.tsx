import Link from 'next/link';
import { cookies } from 'next/headers';

import { TeamName } from '@/components/team-name';
import { getSessionCookieName, verifySession } from '@/lib/auth';
import { formatDateTimeArgentina } from '@/lib/datetime';
import { getHomePageState } from '@/lib/db';
import { getRegistrationAmountArs } from '@/lib/public-config';

export const dynamic = 'force-dynamic';

export default async function InicioPage() {
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const session = verifySession(token);
  const state = await getHomePageState();
  const registrationAmountArs = getRegistrationAmountArs();
  const paidParticipants = state.paidParticipants;
  const prizePool = paidParticipants * registrationAmountArs;
  const prizes = [
    { place: '1°' as const, pct: 20 },
    { place: '2°' as const, pct: 15 },
    { place: '3°' as const, pct: 10 },
    { place: '4°' as const, pct: 5 },
    { place: '5°' as const, pct: 1 },
  ].map((item) => ({
    place: item.place,
    amount: Math.round((prizePool * item.pct) / 100),
  }));

  const totalMatches = state.summary.matches;
  const resultsLoaded = state.summary.matchesWithOfficialResult;
  const loadProgressPct = totalMatches > 0 ? Math.round((resultsLoaded / totalMatches) * 100) : 0;
  const nextMatch = [...state.matches]
    .filter((m) => new Date(m.kickoffAt).getTime() > Date.now())
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())[0];
  const currentLeader = state.leaderboard[0] ?? null;

  return (
    <section className="stack-lg">
      <div className="hero">
        <div className="panel">
          <p className="eyebrow hero-kicker">FIFA WORLD CUP 26</p>
          <h2 className="hero-title">PRODE Mundial 2026</h2>
          <p className="muted">
            Registro de participantes, predicciones por partido, resultados oficiales y tabla de posiciones para el
            torneo de 48 selecciones. Los premios del Top 5 se actualizan automáticamente según la cantidad de
            inscriptos con pago aprobado.
          </p>
          <div className="panel prizes-panel">
            <h3>Premios Top 5</h3>
            <ol className="rules-list">
              {prizes.map((prize) => (
                <li key={prize.place}>
                  {prize.place} premio: ${prize.amount.toLocaleString('es-AR')}
                </li>
              ))}
            </ol>
          </div>
          <div className="cta-row">
            {!session ? (
              <Link href="/register" className="cta-link">
                Registrar usuario
              </Link>
            ) : null}
            <Link href="/predictions" className="cta-link">
              Cargar predicciones
            </Link>
            <Link href="/leaderboard" className="cta-link">
              Ver tabla
            </Link>
            <Link href="/calendar" className="cta-link">
              Ver calendario
            </Link>
          </div>
        </div>

        <div className="panel stack-md">
          <h3>Resumen</h3>
          <div className="cards cards-summary">
            <div className="stat-card">
              <div className="muted">Usuarios</div>
              <div className="value">{state.summary.users}</div>
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
              <span className="muted compact-text">Fixture completo del Mundial 2026 cargado en calendario.</span>
            </div>
            <div className="detail-card">
              <span className="detail-label">Líder provisional</span>
              <strong>{currentLeader ? `${currentLeader.firstName} ${currentLeader.lastName}` : 'Sin datos aún'}</strong>
              <span className="muted compact-text">
                {currentLeader ? `${currentLeader.totalPoints} pts` : 'Se actualiza al cargar resultados oficiales'}
              </span>
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
        <p className="muted">
          Grupos cargados con selecciones definidas tras el sorteo, incluyendo plazas de repechaje donde todavía no
          hay ganador confirmado.
        </p>
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

