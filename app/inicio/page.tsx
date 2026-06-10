
import { NextMatchCountdown } from '@/components/next-match-countdown';
import { TeamName } from '@/components/team-name';
import { formatDateTimeArgentina } from '@/lib/datetime';
import { getHomePageState } from '@/lib/db';
import { requireAuthenticatedUser } from '@/lib/route-guard';
import { getTeamDisplayName } from '@/lib/worldcup26';

export const dynamic = 'force-dynamic';

const PRIZE_BASE_AMOUNT_ARS = 25000;

function getRegistrationAmountArs() {
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const scoped = isProd
    ? process.env.TALOPAY_REGISTRATION_AMOUNT_ARS_PROD
    : process.env.TALOPAY_REGISTRATION_AMOUNT_ARS_LOCAL;
  const fallback = process.env.TALOPAY_REGISTRATION_AMOUNT_ARS;
  const parsed = Number(scoped ?? fallback ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export default async function InicioPage() {
  const { user } = await requireAuthenticatedUser();
  const state = await getHomePageState();
  const hasApprovedPayment = user.role === 'admin' || user.registrationPaymentStatus === 'approved';
  const registrationAmountArs = getRegistrationAmountArs();

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
  const prizePool = PRIZE_BASE_AMOUNT_ARS * state.paidParticipants;
  const firstPrize = Math.round(prizePool * 0.7);
  const secondPrize = Math.round(prizePool * 0.25);
  const thirdPrize = prizePool - firstPrize - secondPrize;
  const formatPrize = (value: number) => `$${value.toLocaleString('es-AR')}`;
  const topFiveLeaderboard = state.leaderboard.slice(0, 5);

  return (
    <section className="stack-lg">
      <div className="hero">
        <div className="panel stack-md">
          <p className="eyebrow hero-kicker">FIFA WORLD CUP 26</p>
          <h2 className="hero-title hero-title-with-cup">
            <span>PRODE Mundial 2026</span>
            <img className="title-cup-icon title-cup-icon-hero" src="/world-cup.png" alt="" width={52} height={52} />
          </h2>
          <p className="muted">
            Registro de participantes, predicciones por partido, resultados oficiales y tabla de posiciones para el
            torneo de 48 selecciones.
          </p>
          {!hasApprovedPayment ? (
            <div className="panel stack-md pending-payment-panel">
              <h3>Inscripción pendiente</h3>
              <div className="stack-xs">
                <p className="muted">Para habilitar predicciones y tabla de posiciones debes completar la inscripción.</p>
                <p className="muted">
                  Monto a abonar: <strong>${registrationAmountArs.toLocaleString('es-AR')}</strong>
                </p>
                <p className="muted">
                  Puedes transferir directamente al alias <strong>amiotti.mp</strong>
                </p>
                <p className="muted">
                  Si transfieres, envía el comprobante de pago por WhatsApp al <strong>+5493472554827</strong>.
                </p>
              </div>
            </div>
          ) : null}
          <NextMatchCountdown
            kickoffAt={nextMatch?.kickoffAt ?? null}
            homeTeam={nextMatch ? getTeamDisplayName(nextMatch.homeTeam) : null}
            awayTeam={nextMatch ? getTeamDisplayName(nextMatch.awayTeam) : null}
          />
          <div className="panel prizes-panel">
            <h3>Premios</h3>
            <p className="muted">
              Pozo total actual: <strong>{formatPrize(prizePool)}</strong>
            </p>
            <p className="muted">1°: 70% del pozo - <strong>{formatPrize(firstPrize)}</strong></p>
            <p className="muted">2°: 25% del pozo - <strong>{formatPrize(secondPrize)}</strong></p>
            <p className="muted">3°: 5% del pozo - <strong>{formatPrize(thirdPrize)}</strong></p>
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
              <strong>
                {nextMatch
                  ? `${getTeamDisplayName(nextMatch.homeTeam)} vs ${getTeamDisplayName(nextMatch.awayTeam)}`
                  : 'Sin partidos pendientes'}
              </strong>
              <span className="muted compact-text">
                {nextMatch ? formatDateTimeArgentina(nextMatch.kickoffAt) : 'El fixture no tiene fechas futuras'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="panel stack-md home-top5-panel">
        <div className="section-head">
          <h3>Top 5 tabla de posiciones</h3>
          <span>Resumen actual</span>
        </div>
        {topFiveLeaderboard.length > 0 ? (
          <div className="table-wrap home-top5-wrap">
            <table className="table home-top5-table">
              <thead>
                <tr>
                  <th>Pos.</th>
                  <th>Participante</th>
                  <th>Puntos</th>
                  <th>Exactos</th>
                </tr>
              </thead>
              <tbody>
                {topFiveLeaderboard.map((row, index) => (
                  <tr key={row.userId}>
                    <td>{index + 1}</td>
                    <td>{row.firstName} {row.lastName}</td>
                    <td>{row.totalPoints}</td>
                    <td>{row.exactHits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Todavía no hay participantes con pago aprobado para mostrar en la tabla.</p>
        )}
      </div>

      <div className="panel stack-md">
        <h3>Grupos</h3>
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

