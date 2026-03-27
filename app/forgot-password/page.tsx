import Link from 'next/link';

import { ResetPasswordForm } from '@/components/reset-password-form';
import { ThemeToggle } from '@/components/theme-toggle';

export default function ForgotPasswordPage() {
  return (
    <section className="auth-screen stack-lg">
      <Link className="public-back-btn" href="/login" aria-label="Volver al login">
        ←
      </Link>
      <div className="public-theme-toggle">
        <ThemeToggle />
      </div>
      <div className="auth-bg-shade" aria-hidden="true" />
      <div className="auth-center-wrap">
        <div className="panel auth-intro-panel auth-intro-panel-login">
          <h2>Recuperar contraseña</h2>
          <p className="muted">
            Para restablecer tu contraseña, valida tus datos de registro: email, teléfono y alias/CBU-CVU.
          </p>
        </div>
        <div className="auth-form-wrap">
          <ResetPasswordForm />
        </div>
      </div>
    </section>
  );
}

