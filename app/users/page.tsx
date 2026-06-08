import { UsersPanel } from '@/components/users-panel';
import { listContactMessages, listUsers } from '@/lib/db';
import { requireAuthenticatedUser } from '@/lib/route-guard';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const { user } = await requireAuthenticatedUser();

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
