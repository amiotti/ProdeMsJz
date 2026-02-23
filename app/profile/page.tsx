import Link from 'next/link';
import { cookies } from 'next/headers';

import { ProfileForm } from '@/components/profile-form';
import { getSessionCookieName } from '@/lib/auth';
import { getUserFromSessionToken } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const token = cookies().get(getSessionCookieName())?.value ?? null;
  const user = await getUserFromSessionToken(token);

  if (!user) {
    return (
      <section className="stack-lg">
        <div className="panel">
          <h2>Perfil</h2>
          <p className="muted">Debes iniciar sesion para ver y editar tu perfil.</p>
          <div className="cta-row">
            <Link className="cta-link" href="/login">
              Ir a Ingresar
            </Link>
            <Link className="cta-link" href="/register">
              Crear cuenta
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>Mi perfil</h2>
        <p className="muted">
          Edita tus datos personales. Rol actual: <strong>{user.role === 'admin' ? 'Administrador' : 'Usuario'}</strong>
        </p>
      </div>
      <ProfileForm user={user} />
    </section>
  );
}
