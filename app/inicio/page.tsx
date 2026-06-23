
import { ExactHitConfetti } from '@/components/exact-hit-confetti';
import { NextMatchCountdown } from '@/components/next-match-countdown';
import { TeamName } from '@/components/team-name';
import { getHomePageState, getPendingExactCelebrations } from '@/lib/db';
import { requireAuthenticatedUser } from '@/lib/route-guard';
import type { CSSProperties } from 'react';
import type { Match } from '@/lib/types';
import { getTeamDisplayName } from '@/lib/worldcup26';

export const dynamic = 'force-dynamic';

const PRIZE_BASE_AMOUNT_ARS = 25000;

const KNOCKOUT_STAGE_ORDER = ['16avos', '8vos', 'Cuartos', 'Semifinal', 'Final', 'Tercer puesto'] as const;
const KNOCKOUT_STAGE_LABELS: Record<string, string> = {
  '16avos': 'Eliminatoria de 32',
  '8vos': 'Octavos de final',
  Cuartos: 'Cuartos de final',
  Semifinal: 'Semifinales',
  'Tercer puesto': 'Tercer puesto',
  Final: 'Final',
};

function getRegistrationAmountArs() {
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const scoped = isProd
    ? process.env.TALOPAY_REGISTRATION_AMOUNT_ARS_PROD
    : process.env.TALOPAY_REGISTRATION_AMOUNT_ARS_LOCAL;
  const fallback = process.env.TALOPAY_REGISTRATION_AMOUNT_ARS;
  const parsed = Number(scoped ?? fallback ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatKnockoutDate(kickoffAt: string) {
  const parts = new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Argentina/Buenos_Aires',
  }).formatToParts(new Date(kickoffAt));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = `${values.weekday?.charAt(0).toUpperCase()}${values.weekday?.slice(1).replace('.', '')}`;
  return `${weekday} ${values.day}/${values.month} - ${values.hour}:${values.minute} hs`;
}

function getKnockoutRounds(matches: Match[]) {
  const knockoutMatches = matches
    .filter((match) => match.groupId === 'KO')
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());

  return KNOCKOUT_STAGE_ORDER.map((stage) => ({
    stage,
    label: KNOCKOUT_STAGE_LABELS[stage],
    matches: knockoutMatches.filter((match) => match.stage === stage),
  })).filter((round) => round.matches.length > 0);
}

function getKnockoutSlot(stage: string, index: number) {
  if (stage === '16avos') return index;
  if (stage === '8vos') return index * 2 + 0.5;
  if (stage === 'Cuartos') return index * 4 + 1.5;
  if (stage === 'Semifinal') return index * 8 + 3.5;
  if (stage === 'Final') return 7.5;
  if (stage === 'Tercer puesto') return 7.5;
  return index;
}

export default async function InicioPage() {
  const { user } = await requireAuthenticatedUser();
  const [state, pendingExactMatchIds] = await Promise.all([
    getHomePageState(),
    user.role === 'admin' ? Promise.resolve([]) : getPendingExactCelebrations(user.id),
  ]);
  const hasApprovedPayment = user.role === 'admin' || user.registrationPaymentStatus === 'approved';
  const registrationAmountArs = getRegistrationAmountArs();

  const totalMatches = state.summary.matches;
  const resultsLoaded = state.summary.matchesWithOfficialResult;
  const loadProgressPct = totalMatches > 0 ? Math.round((resultsLoaded / totalMatches) * 100) : 0;
  const nextMatch = [...state.matches]
    .filter((m) => new Date(m.kickoffAt).getTime() > Date.now())
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())[0];
  const prizePool = PRIZE_BASE_AMOUNT_ARS * state.paidParticipants;
  const firstPrize = Math.round(prizePool * 0.7);
  const secondPrize = Math.round(prizePool * 0.25);
  const thirdPrize = prizePool - firstPrize - secondPrize;
  const formatPrize = (value: number) => `$${value.toLocaleString('es-AR')}`;
  const topThreeLeaderboard = resultsLoaded > 0 ? state.leaderboard.filter((row) => row.totalPoints > 0).slice(0, 3) : [];
  const knockoutRounds = getKnockoutRounds(state.matches);

  return (
    <section className="stack-lg">
      <ExactHitConfetti pendingMatchIds={pendingExactMatchIds} />
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
            <div className="detail-card home-top3-card">
              <span className="detail-label">Top 3</span>
              {topThreeLeaderboard.length > 0 ? (
                <div className="home-top3-list">
                  {topThreeLeaderboard.map((row, index) => (
                    <span key={row.userId}>
                      <strong>{index + 1}° {row.firstName} {row.lastName}</strong>
                      <span>{row.totalPoints} pts</span>
                    </span>
                  ))}
                </div>
              ) : (
                <>
                  <strong>Sin resultados oficiales cargados</strong>
                  <span className="muted compact-text">Se actualiza cuando haya resultados oficiales y puntajes.</span>
                </>
              )}
            </div>
          </div>
        </div>
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

      <div className="panel stack-md knockout-panel">
        <div>
          <p className="eyebrow">Llaves actualizadas</p>
          <h3>Fase Eliminatoria</h3>
          <p className="muted compact-text">
            Los cruces se recalculan automáticamente con las posiciones actuales de los grupos y los resultados oficiales cargados.
          </p>
        </div>
        <div className="knockout-scroll" role="region" aria-label="Cuadro de fase eliminatoria" tabIndex={0}>
          <div className="knockout-bracket">
            {knockoutRounds.map((round) => (
              <div key={round.stage} className="knockout-round">
                <h4>{round.label}</h4>
                <div className="knockout-match-list">
                  {round.matches.map((match, matchIndex) => (
                    <article
                      key={match.id}
                      className="knockout-match-card"
                      style={{ '--knockout-slot': getKnockoutSlot(round.stage, matchIndex) } as CSSProperties}
                    >
                      <span className="knockout-date">{formatKnockoutDate(match.kickoffAt)}</span>
                      <div className="knockout-team-row">
                        <TeamName teamName={match.homeTeam} linkToTeam />
                        {match.officialResult ? <strong>{match.officialResult.home}</strong> : null}
                      </div>
                      <div className="knockout-team-row">
                        <TeamName teamName={match.awayTeam} linkToTeam />
                        {match.officialResult ? <strong>{match.officialResult.away}</strong> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

