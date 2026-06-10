import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { PredictionsBoard } from '@/components/predictions-board';
import { getSessionCookieName } from '@/lib/auth';
import { getPredictionsScreenState } from '@/lib/db';
import { getRegistrationAmountArs } from '@/lib/public-config';
import { requireAuthenticatedUser } from '@/lib/route-guard';

export const dynamic = 'force-dynamic';

export default async function PredictionsPage() {
  const { user } = await requireAuthenticatedUser();
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const state = await getPredictionsScreenState(token);
  const registrationAmountArs = getRegistrationAmountArs();

  if (user.role === 'admin') {
    redirect('/results');
  }

  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>Predicciones</h2>
        <p className="muted">
          Regla de cierre: las predicciones se pueden crear o editar hasta <strong>1 hora antes</strong> del inicio de cada partido.
          {state.trivia.cutoffAt ? (
            <>
              {' '}
              La trivia debe completarse antes del comienzo del primer partido del Mundial (11/6/26 16:00 hs).
            </>
          ) : null}
        </p>
      </div>
      <PredictionsBoard initialState={state} registrationAmountArs={registrationAmountArs} />
    </section>
  );
}
