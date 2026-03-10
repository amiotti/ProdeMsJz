import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidad | PRODE Mundial 2026',
};

export default function PrivacyPage() {
  return (
    <section className="stack-lg legal-doc">
      <div className="legal-back-row">
        <Link className="legal-back-btn" href="/" aria-label="Volver atrás">
          ←
        </Link>
      </div>

      <div className="panel stack-md">
        <h2>POLÍTICA DE PRIVACIDAD</h2>
        <p className="muted">
          Esta política describe cómo se recopilan, utilizan y protegen los datos personales de los usuarios de PRODE
          Mundial 2026.
        </p>

        <h3>1. Datos recopilados</h3>
        <p className="muted">La Plataforma puede recopilar:</p>
        <p className="muted"><strong>Datos de registro:</strong></p>
        <ul className="list">
          <li>nombre</li>
          <li>apellido</li>
          <li>correo electrónico</li>
          <li>teléfono</li>
          <li>contraseña cifrada</li>
          <li>alias o CBU/CVU para pagos de premios</li>
        </ul>
        <p className="muted"><strong>Datos de uso:</strong></p>
        <ul className="list">
          <li>pronósticos cargados</li>
          <li>ranking</li>
          <li>actividad dentro de la plataforma</li>
          <li>datos técnicos necesarios para operar el servicio</li>
        </ul>
        <p className="muted"><strong>Datos de pago:</strong></p>
        <ul className="list">
          <li>identificadores de transacción</li>
          <li>estado de pago</li>
          <li>comprobantes asociados</li>
        </ul>

        <h3>2. Finalidad del tratamiento</h3>
        <p className="muted">Los datos se utilizan para:</p>
        <ul className="list">
          <li>administrar cuentas de usuario</li>
          <li>habilitar la participación en el torneo</li>
          <li>calcular rankings y estadísticas</li>
          <li>gestionar pagos y premios</li>
          <li>brindar soporte técnico</li>
          <li>prevenir fraude o abuso</li>
        </ul>

        <h3>3. Proveedores tecnológicos</h3>
        <p className="muted">La Plataforma puede utilizar proveedores externos para:</p>
        <ul className="list">
          <li>hosting</li>
          <li>bases de datos</li>
          <li>procesamiento de pagos</li>
          <li>analítica</li>
        </ul>
        <p className="muted">Estos proveedores podrán procesar información en servidores ubicados dentro o fuera de la República Argentina.</p>

        <h3>4. Conservación de datos</h3>
        <p className="muted">Los datos se conservarán durante el tiempo necesario para:</p>
        <ul className="list">
          <li>operar el torneo</li>
          <li>acreditar pagos</li>
          <li>resolver reclamos</li>
          <li>cumplir obligaciones legales</li>
        </ul>
        <p className="muted">Posteriormente podrán ser eliminados o anonimizados.</p>

        <h3>5. Cookies</h3>
        <p className="muted">La Plataforma puede utilizar cookies técnicas y analíticas para mejorar el funcionamiento del servicio.</p>
        <p className="muted">Estas cookies permiten medir uso, rendimiento y estabilidad de la aplicación.</p>

        <h3>6. Derechos del titular</h3>
        <p className="muted">El usuario puede solicitar:</p>
        <ul className="list">
          <li>acceso a sus datos</li>
          <li>rectificación</li>
          <li>actualización</li>
          <li>supresión</li>
        </ul>
        <p className="muted">Para ejercer estos derechos se podrá requerir validación razonable de identidad.</p>

        <h3>7. Seguridad</h3>
        <p className="muted">Se aplican medidas técnicas y organizativas razonables para proteger la información contra accesos no autorizados o pérdida de datos.</p>
        <p className="muted">No obstante, ningún sistema puede garantizar seguridad absoluta.</p>

        <h3>8. Ley 25.326</h3>
        <p className="muted">De conformidad con la Ley 25.326, el titular de los datos personales tiene derecho a acceder a sus datos en forma gratuita a intervalos no inferiores a seis meses.</p>
        <p className="muted">La Agencia de Acceso a la Información Pública es el órgano de control encargado de recibir denuncias y reclamos sobre protección de datos personales.</p>
      </div>
    </section>
  );
}
