import { ProfileForm } from '@/components/profile-form';
import { ProfilePredictions } from '@/components/profile-predictions';
import { getPredictionsScreenState } from '@/lib/db';
import { requireAuthenticatedUser } from '@/lib/route-guard';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const { token, user } = await requireAuthenticatedUser();
  const predictionsState = await getPredictionsScreenState(token);

  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>Mi perfil</h2>
        <p className="muted">
          Edita tus datos personales. Rol actual: <strong>{user.role === 'admin' ? 'Administrador' : 'Usuario'}</strong>
        </p>
      </div>
      <ProfileForm user={user} />
      {user.role !== 'admin' ? <ProfilePredictions initialState={predictionsState} userId={user.id} /> : null}
    </section>
  );
}
