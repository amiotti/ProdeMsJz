import Link from 'next/link';
import { cookies } from 'next/headers';

import { ContactForm } from '@/components/contact-form';
import { ThemeToggle } from '@/components/theme-toggle';
import { getSessionCookieName } from '@/lib/auth';
import { getUserFromSessionToken } from '@/lib/db';

export const metadata = {
  title: 'Contacto | PRODE Mundial 2026',
};

export default async function ContactPage() {
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const user = await getUserFromSessionToken(token);
  const backHref = user ? '/inicio' : '/';

  return (
    <section className="stack-lg contact-page-shell">
      {!user ? (
        <div className="contact-floating-row">
          <Link className="public-back-btn" href={backHref} aria-label="Volver atrás">
            ←
          </Link>
          <div className="public-theme-toggle">
            <ThemeToggle />
          </div>
        </div>
      ) : (
        <div className="legal-back-row">
          <Link className="legal-back-btn" href={backHref} aria-label="Volver atrás">
            ←
          </Link>
        </div>
      )}

      <div className="panel stack-md contact-hero-panel">
        <p className="eyebrow">CONTACTO</p>
        <h2>Escribinos y te respondemos por el medio que prefieras</h2>
        <p className="muted contact-hero-copy">
          Usa este formulario para dudas sobre pagos, reglas, acceso, grupos privados o soporte general del PRODE.
          La consulta queda registrada para que el administrador la vea desde su panel.
        </p>
      </div>

      <div className="contact-grid-layout">
        <ContactForm
          defaultValues={{
            name: user?.name ?? '',
            email: user?.email ?? '',
            phone: user?.phone ?? '',
          }}
        />

        <div className="panel stack-md contact-side-panel">
          <h3>Qué conviene enviar</h3>
          <ul className="list">
            <li>El motivo de la consulta con el mayor detalle posible.</li>
            <li>Tu email correcto y, si querés respuesta rápida, también un teléfono.</li>
            <li>Si el tema es un pago, aclará nombre, email usado y comprobante si lo tenés.</li>
          </ul>

          <div className="contact-info-card">
            <strong>Canal</strong>
            <span>Formulario interno del sitio</span>
          </div>
          <div className="contact-info-card">
            <strong>Lectura admin</strong>
            <span>Sección Usuarios del perfil administrador</span>
          </div>
          <div className="contact-info-card">
            <strong>Estado</strong>
            <span>El admin puede marcar la consulta como nueva, contactada o resuelta</span>
          </div>
        </div>
      </div>
    </section>
  );
}

