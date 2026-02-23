'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function RegisterForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  function onPhotoChange(file: File | null) {
    if (!file) {
      setPhotoDataUrl(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      setPaymentUrl(null);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, phone, password, photoDataUrl }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) throw new Error(data.error || 'Error al registrar');

      setStatus(`Usuario registrado: ${data.user.name}. Generando pago de inscripcion...`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('prode-auth-changed'));
      }

      const prefRes = await fetch('/api/payments/mercadopago/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const prefData = await prefRes.json();
      if (!prefRes.ok || !prefData.ok) {
        throw new Error(prefData.error || 'No se pudo generar el pago');
      }

      const redirectUrl = (prefData.sandboxInitPoint || prefData.initPoint) as string | undefined;
      if (!redirectUrl) {
        throw new Error('Mercado Pago no devolvio una URL de checkout');
      }

      setPaymentUrl(redirectUrl);
      window.location.href = redirectUrl;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo registrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="panel form-grid" onSubmit={onSubmit}>
      <label>
        Nombre
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ej: Juan" required />
      </label>
      <label>
        Apellido
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ej: Perez" required />
      </label>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan@mail.com" required />
      </label>
      <label>
        Telefono
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54 9 11 ..." required />
      </label>
      <label>
        Foto de perfil (opcional)
        <input type="file" accept="image/*" onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)} />
      </label>
      {photoDataUrl ? <img className="avatar-preview" src={photoDataUrl} alt="Vista previa de foto" /> : null}
      <label>
        Contraseña
        <input
          type="password"
          value={password}
          minLength={6}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimo 6 caracteres"
          required
        />
      </label>
      <button className="btn btn-primary" disabled={loading} type="submit">
        {loading ? 'Creando usuario y preparando pago...' : 'Registrarme y pagar inscripcion'}
      </button>
      {status ? <p className="status">{status}</p> : null}
      {paymentUrl ? (
        <p className="muted">
          Si no se redirige automaticamente, <a className="inline-link" href={paymentUrl}>haz click aqui para pagar</a>.
        </p>
      ) : null}
    </form>
  );
}
