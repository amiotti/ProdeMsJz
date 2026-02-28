import Link from 'next/link';

export const metadata = {
  title: 'Términos y Condiciones | PRODE Mundial 2026',
};

export default function TermsPage() {
  return (
    <section className="stack-lg legal-doc">
      <div className="legal-back-row">
        <Link className="legal-back-btn" href="/" aria-label="Volver atrás">
          ←
        </Link>
      </div>

      <div className="panel stack-md">
        <h2>Términos y Condiciones</h2>
        <p className="muted">
          Estos Términos regulan el acceso y uso de PRODE Mundial 2026 en la República Argentina. Al registrarte,
          pagar la inscripción o utilizar la plataforma aceptás estas condiciones.
        </p>
        <p className="muted">
          La plataforma presta un servicio digital de organización y gestión de pronósticos deportivos entre usuarios
          registrados. No constituye una casa de apuestas ni ofrece juego de azar regulado.
        </p>
      </div>

      <div className="panel stack-md">
        <h3>1. Objeto del servicio</h3>
        <ul className="list">
          <li>La inscripción otorga acceso a la plataforma, carga de pronósticos, ranking, perfil, resultados y estadísticas.</li>
          <li>El servicio incluye infraestructura, base de datos, dominio, mantenimiento, soporte operativo y administración del grupo.</li>
          <li>La organización puede introducir mejoras, cambios visuales y ajustes técnicos sin alterar derechos ya adquiridos por el usuario.</li>
        </ul>

        <h3>2. Elegibilidad y cuentas</h3>
        <ul className="list">
          <li>La participación está reservada a personas mayores de 18 años con capacidad legal suficiente.</li>
          <li>Cada cuenta es personal e intransferible. No se admite la suplantación de identidad ni la apertura de cuentas múltiples para una misma persona.</li>
          <li>El usuario debe mantener actualizados sus datos de contacto y datos bancarios o alias para eventuales premios.</li>
        </ul>

        <h3>3. Inscripción, pagos y destino de fondos</h3>
        <ul className="list">
          <li>La inscripción se considera efectiva cuando el pago es aprobado por la plataforma de cobro o validado manualmente por el administrador.</li>
          <li>Los fondos de inscripción pueden destinarse a acceso completo a la plataforma, premios, mantenimiento de base de datos, dominio, hosting, soporte y gastos operativos.</li>
          <li>El usuario reconoce que el monto de inscripción no se asigna en forma exclusiva a premios, salvo que el organizador comunique expresamente otra modalidad.</li>
          <li>Los pagos se procesan a través de Galio Pay o del medio de pago que la organización informe como válido en cada momento.</li>
        </ul>

        <h3>4. Reembolsos, cancelaciones y bajas</h3>
        <ul className="list">
          <li>Salvo obligación legal aplicable o decisión expresa del organizador, la inscripción no es reembolsable una vez confirmada.</li>
          <li>Si el usuario solicita la baja de su cuenta, la organización podrá conservar la información necesaria por razones legales, contables, antifraude y de auditoría.</li>
          <li>La baja de la cuenta no implica automáticamente la devolución de pagos ya realizados ni la eliminación inmediata de registros históricos del torneo.</li>
        </ul>

        <h3>5. Predicciones, resultados y ranking</h3>
        <ul className="list">
          <li>Las predicciones solo pueden cargarse o editarse hasta la ventana de cierre definida por la plataforma.</li>
          <li>Los resultados oficiales son cargados por el administrador y son la base exclusiva para el cálculo del ranking y del puntaje.</li>
          <li>La tabla de posiciones y las estadísticas se actualizan automáticamente en función de los resultados oficiales cargados.</li>
          <li>En caso de errores materiales manifiestos, la organización puede corregir resultados, puntajes, fixtures o clasificaciones para reflejar correctamente la realidad deportiva.</li>
        </ul>

        <h3>6. Sistema de puntaje</h3>
        <ul className="list">
          <li>El resultado exacto otorga 20 puntos.</li>
          <li>Acertar ganador o empate, sin acertar el resultado exacto, otorga 10 puntos.</li>
          <li>Acertar la cantidad de goles de uno solo de los dos equipos otorga 5 puntos.</li>
          <li>Si no existe ningún acierto computable, el puntaje de ese partido es 0.</li>
          <li>La lógica de puntaje se aplica automáticamente sobre los resultados oficiales cargados en la plataforma.</li>
        </ul>

        <h3>7. Modelo de premios</h3>
        <ul className="list">
          <li>La plataforma puede operar con esquema de premios top 5 u otro esquema que el organizador publique antes del inicio del torneo.</li>
          <li>Los premios en dinero, órdenes de compra, cenas, indumentaria u otros beneficios están sujetos a disponibilidad y a las reglas específicas anunciadas por el organizador.</li>
          <li>El monto efectivo de premios puede variar según la cantidad de participantes, gastos operativos, costos de plataforma y modalidad comercial elegida.</li>
          <li>La organización puede reemplazar premios no monetarios por otros de valor equivalente o similar, cuando existan causas justificadas.</li>
        </ul>

        <h3>8. Conducta prohibida</h3>
        <ul className="list">
          <li>Queda prohibido manipular resultados, intentar alterar el funcionamiento del sitio, acceder sin autorización, automatizar acciones o explotar vulnerabilidades.</li>
          <li>También se prohíbe utilizar la plataforma para canalizar apuestas, captar fondos para juegos de azar, ofrecer servicios de betting o fomentar conductas de ludopatía.</li>
          <li>La organización podrá suspender o cancelar cuentas por fraude, abuso, incumplimiento de reglas, falta de pago o uso contrario a la ley.</li>
        </ul>

        <h3>9. Limitación de responsabilidad</h3>
        <ul className="list">
          <li>La plataforma se ofrece bajo criterio de disponibilidad razonable. Pueden existir interrupciones por mantenimiento, fallas de terceros, problemas de conectividad o causas de fuerza mayor.</li>
          <li>La organización no garantiza disponibilidad continua, ausencia absoluta de errores ni compatibilidad con todos los navegadores o dispositivos.</li>
          <li>La responsabilidad del organizador se limita, en la máxima medida permitida por la ley aplicable, al valor efectivamente abonado por el usuario para la edición vigente del torneo.</li>
        </ul>

        <h3>10. Propiedad intelectual y contenidos</h3>
        <ul className="list">
          <li>El software, diseño, marca del servicio, textos originales, base de datos estructurada y desarrollos propios pertenecen a sus titulares y no pueden copiarse, revenderse o explotarse sin autorización.</li>
          <li>Los nombres de equipos, marcas, escudos o referencias deportivas pertenecen a sus respectivos titulares y se utilizan con fines descriptivos e informativos.</li>
        </ul>

        <h3>11. Ley aplicable y jurisdicción</h3>
        <ul className="list">
          <li>Estos Términos se rigen por las leyes de la República Argentina.</li>
          <li>En la medida permitida por la normativa aplicable, cualquier controversia será sometida a los tribunales ordinarios con jurisdicción en la Ciudad Autónoma de Buenos Aires, sin perjuicio de los derechos del consumidor que resulten inderogables.</li>
        </ul>
      </div>
    </section>
  );
}
