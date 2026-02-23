import { cookies } from 'next/headers';

import { PredictionsBoard } from '@/components/predictions-board';
import { getSessionCookieName } from '@/lib/auth';
import { getPredictionsScreenState } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function PredictionsPage() {
  const token = cookies().get(getSessionCookieName())?.value ?? null;
  const state = await getPredictionsScreenState(token);

  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>Predicciones por partido</h2>
        <p className="muted">
          Inicia sesion para cargar tus pronosticos. Una vez guardada una prediccion, ese partido queda bloqueado y no
          puede modificarse.
        </p>
      </div>
      <PredictionsBoard initialState={state} />
    </section>
  );
}
