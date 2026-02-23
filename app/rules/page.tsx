import { getState } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function RulesPage() {
  const state = await getState();
  const { exactScore, correctOutcome } = state.db.pointsConfig;

  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>Reglas del PRODE</h2>
        <p className="muted">
          Estas reglas explican como registrarse, cargar pronosticos y como se arma la tabla de posiciones en esta app.
        </p>
      </div>

      <div className="panel stack-md">
        <h3>Como participar</h3>
        <ol className="rules-list">
          <li>Registrate en la pestaña `Registro` con nombre y email.</li>
          <li>Entrá en `Predicciones`, elegí tu usuario y cargá resultados partido por partido.</li>
          <li>Guardá tus pronosticos. Podés volver a editarlos mientras no quieras cerrarlos manualmente.</li>
          <li>Cuando se cargan resultados oficiales, la tabla se recalcula automaticamente.</li>
        </ol>
      </div>

      <div className="panel stack-md">
        <h3>Puntaje</h3>
        <div className="detail-grid">
          <div className="detail-card">
            <span className="detail-label">Resultado exacto</span>
            <strong>{exactScore} puntos</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Acierto de signo</span>
            <strong>{correctOutcome} punto{correctOutcome === 1 ? '' : 's'}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Pronostico incorrecto</span>
            <strong>0 puntos</strong>
          </div>
        </div>
        <p className="muted">
          “Acierto de signo” significa acertar ganador/empate/perdedor aunque no coincida el marcador exacto.
        </p>
      </div>

      <div className="panel stack-md">
        <h3>Ejemplos rapidos</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Pronostico</th>
              <th>Resultado oficial</th>
              <th>Puntaje</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Argentina 2 - 1 Mexico</td>
              <td>Argentina 2 - 1 Mexico</td>
              <td>{exactScore} (exacto)</td>
            </tr>
            <tr>
              <td>Argentina 1 - 0 Mexico</td>
              <td>Argentina 3 - 1 Mexico</td>
              <td>{correctOutcome} (mismo ganador)</td>
            </tr>
            <tr>
              <td>Argentina 1 - 1 Mexico</td>
              <td>Argentina 2 - 1 Mexico</td>
              <td>0</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="panel stack-md">
        <h3>Tabla de posiciones</h3>
        <p className="muted">La tabla ordena a los usuarios con estos criterios de desempate:</p>
        <ol className="rules-list">
          <li>Mayor puntaje total.</li>
          <li>Mayor cantidad de resultados exactos.</li>
          <li>Mayor cantidad de aciertos de signo.</li>
          <li>Orden alfabetico por nombre.</li>
        </ol>
      </div>

      <div className="panel stack-md">
        <h3>Alcance actual</h3>
        <ul className="rules-bullets">
          <li>El calendario muestra el fixture completo del Mundial 2026.</li>
          <li>Las probabilidades de la pestaña `Predicciones` son estimaciones internas de la app (no cuotas).</li>
          <li>La carga de resultados oficiales se realiza desde la pestaña `Resultados Oficiales`.</li>
        </ul>
      </div>
    </section>
  );
}
