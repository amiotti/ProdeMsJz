import { cookies } from 'next/headers';

import { PredictionsBoard } from '@/components/predictions-board';
import { getSessionCookieName } from '@/lib/auth';
import { getPredictionsScreenState } from '@/lib/db';
import { getRegistrationAmountArs } from '@/lib/public-config';

export const dynamic = 'force-dynamic';

export default async function PredictionsPage() {
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const state = await getPredictionsScreenState(token);
  const registrationAmountArs = getRegistrationAmountArs();

  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>Predicciones por partido</h2>
        <p className="muted">
          Inicia sesión para cargar tus pronósticos. Cada partido puede editarse hasta 1 hora antes de su inicio.
          Los horarios se muestran en hora de Argentina.
        </p>
      </div>
      <PredictionsBoard initialState={state} registrationAmountArs={registrationAmountArs} />
    </section>
  );
}

