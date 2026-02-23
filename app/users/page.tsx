import Link from 'next/link';
import { cookies } from 'next/headers';

import { UsersPanel } from '@/components/users-panel';
import { getSessionCookieName } from '@/lib/auth';
import { getUserFromSessionToken, listUsers } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const token = cookies().get(getSessionCookieName())?.value ?? null;
  const user = await getUserFromSessionToken(token);

  if (!user) {
    return (
      <section className="stack-lg">
        <div className="panel">
          <h2>Usuarios</h2>
          <p className="muted">Debes iniciar sesion para acceder.</p>
          <div className="cta-row">
            <Link className="cta-link" href="/login">
              Ingresar
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (user.role !== 'admin') {
    return (
      <section className="stack-lg">
        <div className="panel">
          <h2>Usuarios</h2>
          <p className="muted">Esta seccion es exclusiva para el administrador.</p>
        </div>
      </section>
    );
  }

  const users = await listUsers();
  return <UsersPanel initialUsers={users} />;
}
