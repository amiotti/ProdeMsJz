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
          Estas reglas explican cÃ³mo registrarse, cargar pronÃ³sticos y cÃ³mo se arma la tabla de posiciones en esta app.
        </p>
      </div>

      <div className="panel stack-md">
        <h3>CÃ³mo participar</h3>
        <ol className="rules-list">
          <li>Registrate / iniciÃ¡ sesiÃ³n con tu cuenta.</li>
          <li>EntrÃ¡ en `Predicciones` y cargÃ¡ resultados partido por partido.</li>
          <li>PodÃ©s editar cada predicciÃ³n hasta 1 hora antes del inicio de ese partido.</li>
          <li>Cuando se cargan resultados oficiales, la tabla se recalcula automÃ¡ticamente.</li>
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
            <span className="detail-label">Acierto de goles (1 equipo)</span>
            <strong>5 puntos</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">PronÃ³stico incorrecto</span>
            <strong>0 puntos</strong>
          </div>
        </div>
        <p className="muted">
          â€œAcierto de signoâ€ significa acertar ganador/empate/perdedor aunque no coincida el marcador exacto.
        </p>
        <p className="muted">
          Si acertÃ¡s la cantidad de goles del local o del visitante (uno de los dos), sumÃ¡s <strong>5 puntos</strong>.
          Ese puntaje puede combinarse con el acierto de signo.
        </p>
      </div>

      <div className="panel stack-md">
        <h3>Ejemplos rÃ¡pidos</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>PronÃ³stico</th>
                <th>Resultado oficial</th>
                <th>Puntaje</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Argentina 2 - 1 MÃ©xico</td>
                <td>Argentina 2 - 1 MÃ©xico</td>
                <td>{exactScore} (exacto)</td>
              </tr>
              <tr>
                <td>Argentina 3 - 0 MÃ©xico</td>
                <td>Argentina 2 - 0 MÃ©xico</td>
                <td>{correctOutcome + 5} ({correctOutcome} por signo + 5 por goles visitante)</td>
              </tr>
              <tr>
                <td>Argentina 1 - 1 MÃ©xico</td>
                <td>Argentina 2 - 1 MÃ©xico</td>
                <td>5 (acierto de goles visitante)</td>
              </tr>
              <tr>
                <td>Argentina 0 - 2 MÃ©xico</td>
                <td>Argentina 2 - 1 MÃ©xico</td>
                <td>0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel stack-md">
        <h3>Tabla de posiciones</h3>
        <p className="muted">La tabla ordena a los usuarios con estos criterios de desempate:</p>
        <ol className="rules-list">
          <li>Mayor puntaje total.</li>
          <li>Mayor cantidad de resultados exactos.</li>
          <li>Mayor cantidad de aciertos de signo.</li>
          <li>Orden alfabÃ©tico por nombre.</li>
        </ol>
      </div>

      <div className="panel stack-md">
        <h3>Alcance actual</h3>
        <ul className="rules-bullets">
          <li>El calendario muestra el fixture completo del Mundial 2026.</li>
          <li>Las probabilidades de `Predicciones` son estimaciones internas de la app (no cuotas).</li>
          <li>La carga de resultados oficiales se realiza desde `Resultados Oficiales`.</li>
        </ul>
      </div>
    </section>
  );
}
