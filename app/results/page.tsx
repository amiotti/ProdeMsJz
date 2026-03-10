import { cookies } from 'next/headers';

import { ResultsBoard } from '@/components/results-board';
import { getSessionCookieName } from '@/lib/auth';
import { getResultsScreenState } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ResultsPage() {
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const state = await getResultsScreenState(token);

  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>Resultados oficiales</h2>
        <p className="muted">
          Todos los usuarios pueden consultar los resultados. Solo el perfil administrador puede cargarlos o editarlos.
        </p>
      </div>
      <ResultsBoard initialState={state} />
    </section>
  );
}


