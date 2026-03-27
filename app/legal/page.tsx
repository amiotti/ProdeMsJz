import Link from 'next/link';

export const metadata = {
  title: 'Aviso Legal | PRODE Mundial 2026',
};

export default function LegalPage() {
  return (
    <section className="stack-lg legal-doc">
      <div className="legal-back-row">
        <Link className="legal-back-btn" href="/" aria-label="Volver atrás">
          ←
        </Link>
      </div>

      <div className="panel stack-md">
        <h2>AVISO LEGAL</h2>
        <p className="muted">PRODE Mundial 2026 es una plataforma digital de entretenimiento basada en pronósticos deportivos entre participantes.</p>
        <p className="muted">La actividad consiste en una competencia recreativa basada en la habilidad de los participantes para analizar resultados deportivos.</p>
        <p className="muted">La Plataforma no constituye:</p>
        <ul className="list">
          <li>casa de apuestas</li>
          <li>casino online</li>
          <li>bookmaker</li>
          <li>sistema de juego de azar regulado</li>
        </ul>

        <p className="muted">La inscripción corresponde al acceso a un servicio digital que incluye:</p>
        <ul className="list">
          <li>uso de la plataforma</li>
          <li>rankings</li>
          <li>estadísticas</li>
          <li>administración del torneo</li>
          <li>soporte operativo</li>
        </ul>
        <p className="muted">El procesamiento del pago de inscripción se realiza a través de Talo Pay.</p>

        <p className="muted">Está prohibido utilizar la Plataforma para aceptar apuestas, intermediar apuestas entre terceros o captar fondos vinculados a juegos de azar.</p>
        <p className="muted">La organización podrá suspender cuentas que utilicen el servicio con fines contrarios a la ley o al presente aviso legal.</p>
        <p className="muted">Los premios ofrecidos corresponden a beneficios asociados al ranking de la competencia y no implican una garantía de ganancias económicas.</p>
      </div>
    </section>
  );
}
