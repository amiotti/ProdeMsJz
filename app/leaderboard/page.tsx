import Link from 'next/link';

import { LeaderboardTable } from '@/components/leaderboard-table';
import { getLeaderboardPageState } from '@/lib/db';
import { requireAuthenticatedUser } from '@/lib/route-guard';

export const dynamic = 'force-dynamic';

function getRegistrationAmountArs() {
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const scoped = isProd
    ? process.env.TALOPAY_REGISTRATION_AMOUNT_ARS_PROD
    : process.env.TALOPAY_REGISTRATION_AMOUNT_ARS_LOCAL;
  const fallback = process.env.TALOPAY_REGISTRATION_AMOUNT_ARS;
  const parsed = Number(scoped ?? fallback ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export default async function LeaderboardPage() {
  const { user } = await requireAuthenticatedUser();
  const canViewLeaderboard = user.role === 'admin' || user.registrationPaymentStatus === 'approved';
  const state = canViewLeaderboard ? await getLeaderboardPageState() : null;
  const registrationAmountArs = getRegistrationAmountArs();

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
        <LeaderboardTable
          views={state?.views ?? {
            general: { rows: [], participantDetails: [] },
            groups: { rows: [], participantDetails: [] },
            knockout: { rows: [], participantDetails: [] },
          }}
          isLoggedIn
        />
      ) : (
        <div className="panel stack-md blocked-payment-panel">
          <h3>Tabla bloqueada hasta confirmar pago</h3>
          <p className="muted">
            Debes completar y confirmar el pago de <strong>${registrationAmountArs.toLocaleString('es-AR')}</strong> para acceder a la tabla de posiciones.
          </p>
          <div className="stack-xs">
            <p className="muted">
              Puedes transferir directamente al alias <strong>amiotti.mp</strong>
            </p>
            <p className="muted">
              Si transfieres, envía el comprobante de pago por WhatsApp al <strong>+5493472554827</strong>.
            </p>
          </div>
          <div className="cta-row">
            <Link className="cta-link" href="/predictions">
              Ir a PRODE
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
