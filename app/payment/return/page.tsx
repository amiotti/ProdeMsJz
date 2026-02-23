import Link from 'next/link';
import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { getUserFromSessionToken, markUserRegistrationPaymentApproved } from '@/lib/db';

type PaymentReturnPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function getText(status: string | undefined) {
  if (status === 'success' || status === 'approved') {
    return {
      title: 'Pago aprobado',
      description: 'La inscripcion fue pagada correctamente (simulacro Mercado Pago). Ya puedes continuar en la app.',
    };
  }
  if (status === 'pending') {
    return {
      title: 'Pago pendiente',
      description: 'Mercado Pago informa el cobro como pendiente. Puedes revisar el estado y reintentar si hace falta.',
    };
  }
  if (status === 'failure') {
    return {
      title: 'Pago no completado',
      description: 'El pago fue cancelado o fallido. Puedes volver a registrarte o reintentar el checkout.',
    };
  }
  return {
    title: 'Retorno de pago',
    description: 'Volviste desde Mercado Pago. Revisa el estado del pago e ingresa a la app.',
  };
}

export default async function PaymentReturnPage({ searchParams }: PaymentReturnPageProps) {
  const raw = searchParams?.status;
  const status = Array.isArray(raw) ? raw[0] : raw;
  const token = cookies().get(getSessionCookieName())?.value ?? null;
  const sessionUser = await getUserFromSessionToken(token);
  let approvedNow = false;

  if ((status === 'success' || status === 'approved') && sessionUser && sessionUser.role !== 'admin') {
    try {
      const before = sessionUser.registrationPaymentStatus;
      const updated = await markUserRegistrationPaymentApproved(sessionUser.id);
      approvedNow = before !== 'approved' && updated.registrationPaymentStatus === 'approved';
    } catch {
      approvedNow = false;
    }
  }

  const text = getText(status);

  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>{text.title}</h2>
        <p className="muted">{text.description}</p>
        {approvedNow ? (
          <p className="status">Pago marcado como aprobado en tu usuario (simulacro local, sin webhook).</p>
        ) : null}
        <div className="chips-row">
          {status ? <span className="chip">Estado: {status}</span> : null}
          {searchParams?.collection_id ? <span className="chip">Collection: {String(searchParams.collection_id)}</span> : null}
          {searchParams?.payment_id ? <span className="chip">Payment: {String(searchParams.payment_id)}</span> : null}
          {searchParams?.merchant_order_id ? (
            <span className="chip">Merchant Order: {String(searchParams.merchant_order_id)}</span>
          ) : null}
        </div>
        {sessionUser && sessionUser.role !== 'admin' ? (
          <p className="muted">
            Estado de inscripcion actual: <strong>{approvedNow ? 'approved' : sessionUser.registrationPaymentStatus ?? 'pending'}</strong>
          </p>
        ) : null}
        <div className="cta-row">
          <Link className="cta-link" href="/login">
            Iniciar sesion
          </Link>
          <Link className="cta-link" href="/profile">
            Mi perfil
          </Link>
          <Link className="cta-link" href="/predictions">
            Ir a predicciones
          </Link>
        </div>
      </div>
    </section>
  );
}
