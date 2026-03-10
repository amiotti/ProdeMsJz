import Link from 'next/link';

import { RegisterForm } from '@/components/register-form';
import { ThemeToggle } from '@/components/theme-toggle';

export default function RegisterPage() {

  return (
    <section className="auth-screen stack-lg">
      <Link className="public-back-btn" href="/" aria-label="Volver a la landing">
        ←
      </Link>
      <div className="public-theme-toggle">
        <ThemeToggle />
      </div>
      <div className="auth-bg-shade" aria-hidden="true" />
      <div className="auth-center-wrap">
        <div className="panel auth-intro-panel">
          <h2>Registro de participantes</h2>
          <p className="muted">
            Creá tu cuenta para empezar a cargar pronósticos. Se guarda nombre, apellido, teléfono, email, contraseña
            y tu CBU/CVU o Alias para gestión de premios.
          </p>
        </div>
        <div className="auth-form-wrap">
          <RegisterForm />
        </div>
      </div>
    </section>
  );
}



