import Link from 'next/link';
import { cookies } from 'next/headers';

import { UsersPanel } from '@/components/users-panel';
import { getSessionCookieName } from '@/lib/auth';
import { getUserFromSessionToken, listContactMessages, listUsers } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const user = await getUserFromSessionToken(token);

  if (!user) {
    return (
      <section className="stack-lg">
        <div className="panel">
          <h2>Usuarios</h2>
          <p className="muted">Debes iniciar sesión para acceder.</p>
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
          <p className="muted">Esta sección es exclusiva para el administrador.</p>
        </div>
      </section>
    );
  }

  const [users, messages] = await Promise.all([listUsers(), listContactMessages()]);
  return <UsersPanel initialUsers={users} initialMessages={messages} />;
}

