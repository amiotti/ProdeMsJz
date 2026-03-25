import Link from 'next/link';
import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { getUserFromSessionToken, markUserRegistrationPaymentApproved } from '@/lib/db';
import { getTaloPayment, isTaloApprovedStatus, isValidTaloRegistrationPaymentForUser } from '@/lib/talopay';

type PaymentReturnPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getPendingPaymentIdFromReceipt(receipt: string | null | undefined) {
  const value = String(receipt ?? '').trim();
  const prefix = 'talo_pending:';
  if (!value.startsWith(prefix)) return null;
  const id = value.slice(prefix.length).trim();
  return id || null;
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
      description: 'Se recibio la confirmacion del checkout. Validaremos el pago con Talo antes de aprobar la inscripcion.',
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
  const taloPaymentIdFromQuery =
    firstParam(resolvedSearchParams?.payment_id) ??
    firstParam(resolvedSearchParams?.talo_payment_id) ??
    firstParam(resolvedSearchParams?.id);
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const sessionUser = await getUserFromSessionToken(token);
  const taloPaymentId = taloPaymentIdFromQuery ?? getPendingPaymentIdFromReceipt(sessionUser?.registrationPaymentReceipt);

  let approvedNow = false;
  let taloPaymentStatus: string | null = null;
  let taloPaymentFetchError = false;
  let validatedPayment = false;

  if (taloPaymentId && sessionUser && sessionUser.role !== 'admin') {
    try {
      const payment = await getTaloPayment(taloPaymentId);
      taloPaymentStatus = payment.payment_status ?? payment.status ?? null;
      validatedPayment = isValidTaloRegistrationPaymentForUser(payment, sessionUser.id);

      if (validatedPayment) {
        const before = sessionUser.registrationPaymentStatus;
        const updated = await markUserRegistrationPaymentApproved(sessionUser.id, taloPaymentId);
        approvedNow = before !== 'approved' && updated.registrationPaymentStatus === 'approved';
      }
    } catch {
      taloPaymentFetchError = true;
    }
  }

  const queryLooksApproved = status === 'success' || status === 'approved';
  const officialApproved = validatedPayment && isTaloApprovedStatus(taloPaymentStatus);
  const text = getText(status);
  const receiptNumber = taloPaymentId ?? null;
  const shouldShowLogin = !sessionUser;

  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>{officialApproved ? 'Pago aprobado' : text.title}</h2>
        <p className="muted">
          {officialApproved
            ? 'La inscripcion fue validada correctamente contra Talo Pay. Ya puedes continuar en la app.'
            : text.description}
        </p>

        {approvedNow ? <p className="status">Pago aprobado y asociado a tu usuario.</p> : null}
        {receiptNumber ? (
          <p className="muted">
            Nro de comprobante: <strong>{receiptNumber}</strong>
          </p>
        ) : null}

        {sessionUser && sessionUser.role !== 'admin' ? (
          <p className="muted">
            Estado de inscripcion actual:{' '}
            <strong>
              {officialApproved || sessionUser.registrationPaymentStatus === 'approved' ? 'approved' : sessionUser.registrationPaymentStatus ?? 'pending'}
            </strong>
          </p>
        ) : null}

        {provider === 'talo' && queryLooksApproved && !officialApproved ? (
          <p className="status">El retorno indica pago exitoso, pero la inscripcion no se aprobara hasta validar el pago en Talo Pay.</p>
        ) : null}

        {provider === 'talo' && taloPaymentFetchError ? (
          <p className="status">No pudimos validar el pago automaticamente con Talo. Revisa el estado e intenta nuevamente.</p>
        ) : null}

        <div className="cta-row">
          {shouldShowLogin ? (
            <Link className="cta-link" href="/login">
              Iniciar sesion
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
