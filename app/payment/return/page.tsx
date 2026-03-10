import Link from 'next/link';
import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { getUserFromSessionToken, markUserRegistrationPaymentApproved } from '@/lib/db';
import { getGalioPayment, isGalioApprovedStatus, isValidGalioRegistrationPaymentForUser } from '@/lib/galiopay';

type PaymentReturnPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getText(status: string | undefined) {
  if (status === 'pending') {
    return {
      title: 'Pago pendiente',
      description: 'El cobro figura como pendiente. Puedes revisar el estado y reintentar si hace falta.',
    };
  }
  if (status === 'failure') {
    return {
      title: 'Pago no completado',
      description: 'El pago fue cancelado o fallido. Puedes volver a intentarlo.',
    };
  }
  if (status === 'success' || status === 'approved') {
    return {
      title: 'Retorno de pago',
      description: 'Se recibiÃ³ la confirmaciÃ³n del checkout. Validaremos el pago con Galio antes de aprobar la inscripciÃ³n.',
    };
  }
  return {
    title: 'Retorno de pago',
    description: 'Volviste desde la plataforma de pagos. Revisa el estado del pago e ingresa a la app.',
  };
}

export default async function PaymentReturnPage({ searchParams }: PaymentReturnPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const status = firstParam(resolvedSearchParams?.status);
  const provider = firstParam(resolvedSearchParams?.provider);
  const galioPaymentId = firstParam(resolvedSearchParams?.galio_payment_id);
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const sessionUser = await getUserFromSessionToken(token);

  let approvedNow = false;
  let galioPaymentStatus: string | null = null;
  let galioPaymentFetchError = false;
  let validatedPayment = false;

  if (galioPaymentId && sessionUser && sessionUser.role !== 'admin') {
    try {
      const payment = await getGalioPayment(galioPaymentId);
      galioPaymentStatus = payment.status ?? null;
      validatedPayment = isValidGalioRegistrationPaymentForUser(payment, sessionUser.id);

      if (validatedPayment) {
        const before = sessionUser.registrationPaymentStatus;
        const updated = await markUserRegistrationPaymentApproved(sessionUser.id, galioPaymentId);
        approvedNow = before !== 'approved' && updated.registrationPaymentStatus === 'approved';
      }
    } catch {
      galioPaymentFetchError = true;
    }
  }

  const queryLooksApproved = status === 'success' || status === 'approved';
  const officialApproved = validatedPayment && isGalioApprovedStatus(galioPaymentStatus);
  const text = getText(status);
  const receiptNumber = galioPaymentId ?? null;
  const shouldShowLogin = !sessionUser;

  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>{officialApproved ? 'Pago aprobado' : text.title}</h2>
        <p className="muted">
          {officialApproved
            ? 'La inscripciÃ³n fue validada correctamente contra Galio Pay. Ya puedes continuar en la app.'
            : text.description}
        </p>

        {approvedNow ? <p className="status">Pago aprobado y asociado a tu usuario.</p> : null}
        {receiptNumber ? (
          <p className="muted">
            NÂ° de comprobante: <strong>{receiptNumber}</strong>
          </p>
        ) : null}

        {sessionUser && sessionUser.role !== 'admin' ? (
          <p className="muted">
            Estado de inscripciÃ³n actual:{' '}
            <strong>
              {officialApproved || sessionUser.registrationPaymentStatus === 'approved' ? 'approved' : sessionUser.registrationPaymentStatus ?? 'pending'}
            </strong>
          </p>
        ) : null}

        {provider === 'galio' && queryLooksApproved && !officialApproved ? (
          <p className="status">
            El retorno indica pago exitoso, pero la inscripciÃ³n no se aprobarÃ¡ hasta validar el pago en Galio Pay.
          </p>
        ) : null}

        {provider === 'galio' && galioPaymentFetchError ? (
          <p className="status">No pudimos validar el pago automÃ¡ticamente con Galio. Revisa el estado e intenta nuevamente.</p>
        ) : null}

        <div className="cta-row">
          {shouldShowLogin ? (
            <Link className="cta-link" href="/login">
              Iniciar sesiÃ³n
            </Link>
          ) : null}
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



