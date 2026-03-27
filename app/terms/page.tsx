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
        <h2>TÉRMINOS Y CONDICIONES DE USO</h2>
        <p className="muted">
          Estos Términos y Condiciones regulan el acceso y uso de la plataforma PRODE Mundial 2026 (en adelante, la
          “Plataforma”) en la República Argentina.
        </p>
        <p className="muted">
          El registro, pago de inscripción o utilización del servicio implica la aceptación plena de estos Términos y
          Condiciones.
        </p>
      </div>

      <div className="panel stack-md">
        <h3>1. Objeto del servicio</h3>
        <p className="muted">
          La Plataforma presta un servicio digital de organización y gestión de pronósticos deportivos entre usuarios
          registrados.
        </p>
        <p className="muted">
          La inscripción otorga acceso a funcionalidades tales como carga de pronósticos, ranking, perfil de usuario,
          visualización de resultados y estadísticas.
        </p>
        <p className="muted">
          El servicio incluye infraestructura tecnológica, base de datos, dominio, mantenimiento, soporte operativo y
          administración del torneo.
        </p>
        <p className="muted">
          La organización podrá introducir mejoras técnicas, cambios visuales o ajustes funcionales con el fin de
          mejorar el servicio.
        </p>

        <h3>2. Naturaleza del servicio</h3>
        <p className="muted">
          La Plataforma constituye una competencia recreativa basada en la habilidad de los participantes para analizar
          y predecir resultados deportivos.
        </p>
        <p className="muted">
          No constituye una casa de apuestas, casino online, bookmaker ni actividad de juego de azar regulado.
        </p>
        <p className="muted">La participación no garantiza resultados económicos ni beneficios financieros.</p>

        <h3>3. Elegibilidad</h3>
        <p className="muted">
          La participación está reservada exclusivamente a personas mayores de 18 años con capacidad legal suficiente.
        </p>
        <p className="muted">Queda prohibido el uso del servicio por menores de edad.</p>
        <p className="muted">
          Cada cuenta es personal e intransferible. No se permite la creación de múltiples cuentas para una misma
          persona.
        </p>

        <h3>4. Inscripción y pagos</h3>
        <p className="muted">
          La inscripción se considera válida cuando el pago es aprobado por el medio de cobro habilitado o validado por
          la organización.
        </p>
        <p className="muted">
          Los pagos de inscripción se procesan mediante Talo Pay como proveedor tecnológico de cobro.
        </p>
        <p className="muted">
          El pago de inscripción corresponde principalmente al acceso al servicio digital prestado por la Plataforma.
        </p>
        <p className="muted">
          Una parte de los fondos podrá destinarse a premios, costos operativos, infraestructura tecnológica,
          mantenimiento del sistema y comisiones de procesamiento de pago.
        </p>
        <p className="muted">
          El usuario reconoce que el monto abonado no se asigna exclusivamente a premios, salvo que se indique
          expresamente lo contrario.
        </p>

        <h3>5. Predicciones, trivia y ranking</h3>
        <p className="muted">
          Los participantes podrán cargar o modificar sus pronósticos de partidos hasta la ventana de cierre definida
          para cada partido.
        </p>
        <p className="muted">
          La sección de trivia podrá responderse hasta el cierre de la fase de grupos; una vez iniciada la fase de
          llaves, las respuestas quedarán bloqueadas.
        </p>
        <p className="muted">
          Los resultados oficiales utilizados para calcular los puntajes serán cargados por la organización.
        </p>
        <p className="muted">
          La tabla de posiciones y estadísticas se calcularán automáticamente en base a dichos resultados.
        </p>
        <p className="muted">
          En caso de errores técnicos o inconsistencias de datos, la organización podrá realizar correcciones
          razonables para restablecer el funcionamiento correcto del sistema.
        </p>

        <h3>6. Sistema de puntaje</h3>
        <p className="muted">Salvo indicación contraria publicada en la Plataforma, el sistema de puntaje será el siguiente:</p>
        <ul className="list">
          <li>Resultado exacto: 20 puntos</li>
          <li>Ganador o empate correcto: 10 puntos</li>
          <li>Acierto de goles de uno de los equipos: 5 puntos</li>
          <li>Respuesta de trivia correcta: 10 puntos por pregunta</li>
          <li>Sin aciertos: 0 puntos</li>
        </ul>

        <h3>7. Premios</h3>
        <p className="muted">
          La Plataforma podrá operar con un esquema de premios previamente informado antes del inicio del torneo.
        </p>
        <p className="muted">Los premios podrán consistir en dinero, órdenes de compra, productos o beneficios equivalentes.</p>
        <p className="muted">Los montos anunciados podrán variar según:</p>
        <ul className="list">
          <li>cantidad final de participantes</li>
          <li>costos operativos</li>
          <li>comisiones de medios de pago</li>
          <li>mantenimiento de la plataforma</li>
        </ul>
        <p className="muted">
          Los premios serán abonados dentro de un plazo máximo de 30 días posteriores a la finalización del torneo.
        </p>

        <h3>8. Conducta prohibida</h3>
        <p className="muted">Queda prohibido:</p>
        <ul className="list">
          <li>manipular el funcionamiento del sitio</li>
          <li>intentar acceder sin autorización a sistemas</li>
          <li>automatizar acciones</li>
          <li>explotar vulnerabilidades</li>
        </ul>
        <p className="muted">
          También se prohíbe utilizar la Plataforma para canalizar apuestas o captar fondos vinculados a juegos de
          azar.
        </p>
        <p className="muted">La organización podrá suspender o cancelar cuentas que incumplan estas normas.</p>

        <h3>9. Limitación de responsabilidad</h3>
        <p className="muted">La Plataforma se ofrece bajo criterio de disponibilidad razonable.</p>
        <p className="muted">La organización no garantiza disponibilidad continua ni ausencia absoluta de errores.</p>
        <p className="muted">No será responsable por:</p>
        <ul className="list">
          <li>fallas de terceros</li>
          <li>interrupciones de internet</li>
          <li>mantenimiento técnico</li>
          <li>eventos de fuerza mayor</li>
        </ul>
        <p className="muted">
          La responsabilidad máxima del organizador se limita al monto abonado por el usuario para la edición vigente
          del torneo.
        </p>

        <h3>10. Propiedad intelectual</h3>
        <p className="muted">
          El software, diseño, marca, base de datos estructurada y contenidos originales pertenecen a sus respectivos
          titulares.
        </p>
        <p className="muted">Queda prohibida su reproducción o explotación sin autorización.</p>

        <h3>11. Jurisdicción</h3>
        <p className="muted">Estos Términos se rigen por las leyes de la República Argentina.</p>
        <p className="muted">
          Toda controversia será sometida a los tribunales competentes de la Ciudad Autónoma de Buenos Aires.
        </p>
      </div>
    </section>
  );
}
