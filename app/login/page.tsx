import Link from 'next/link';

import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>Ingresar</h2>
        <p className="muted">Inicia sesion con tu email y contraseña para cargar pronosticos y editar tu perfil.</p>
        <div className="cta-row">
          <Link className="cta-link" href="/register">
            ¿Primera vez? Registrarme
          </Link>
        </div>
      </div>
      <LoginForm />
    </section>
  );
}
