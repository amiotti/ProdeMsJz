'use client';

import { useState } from 'react';

export function RegistrationPaymentCta() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startPayment() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/payments/talo/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo generar el link de pago');
      const redirectUrl = data.url as string | undefined;
      if (!redirectUrl) throw new Error('TaloPay no devolvió URL de checkout');
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el pago');
      setLoading(false);
      return;
    }
  }

  return (
    <div className="stack-xs">
      <button className="btn btn-primary" type="button" onClick={startPayment} disabled={loading}>
        {loading ? 'Redirigiendo a TaloPay...' : 'Pagar inscripción'}
      </button>
      {error ? <p className="status">{error}</p> : null}
    </div>
  );
}

