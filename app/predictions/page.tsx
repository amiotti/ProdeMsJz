import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { PredictionsBoard } from '@/components/predictions-board';
import { getSessionCookieName } from '@/lib/auth';
import { getPredictionsScreenState } from '@/lib/db';
import { getRegistrationAmountArs } from '@/lib/public-config';

export const dynamic = 'force-dynamic';

export default async function PredictionsPage() {
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const state = await getPredictionsScreenState(token);
  const registrationAmountArs = getRegistrationAmountArs();

  if (state.viewer.user?.role === 'admin') {
    redirect('/results');
  }

  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>Predicciones</h2>
        <p className="muted">
          Inicia sesion para cargar tus pronosticos. Cada partido puede editarse hasta 1 hora antes de su inicio,
          y las trivias deben responderse antes de que comience la fase de llaves. Los horarios se muestran en hora de Argentina.
        </p>
      </div>
      <PredictionsBoard initialState={state} registrationAmountArs={registrationAmountArs} />
    </section>
  );
}


