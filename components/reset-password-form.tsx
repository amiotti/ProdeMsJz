'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ResetPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bankInfo, setBankInfo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setStatus('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          phone,
          bankInfo,
          newPassword: password,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo restablecer la contraseña');
      setStatus('Contraseña actualizada correctamente.');
      setTimeout(() => {
        router.push('/login');
        router.refresh();
      }, 900);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="panel form-grid form-grid-login" onSubmit={onSubmit}>
      <label>
        Email de la cuenta
        <input id="reset-email" name="email" autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Teléfono registrado
        <input id="reset-phone" name="phone" autoComplete="tel" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </label>
      <label>
        Alias o CBU/CVU registrado
        <input id="reset-bank-info" name="bankInfo" autoComplete="off" type="text" value={bankInfo} onChange={(e) => setBankInfo(e.target.value)} required />
      </label>
      <label>
        Nueva contraseña
        <input id="reset-password" name="newPassword" autoComplete="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      </label>
      <label>
        Repetir nueva contraseña
        <input id="reset-confirm-password" name="confirmPassword" autoComplete="new-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
      </label>
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? 'Actualizando...' : 'Restablecer contraseña'}
      </button>
      <p className="muted auth-inline-link-row">
        ¿Ya la recordaste?{' '}
        <Link className="inline-link auth-inline-link" href="/login">
          Volver al login
        </Link>
      </p>
      {status ? <p className="status">{status}</p> : null}
    </form>
  );
}


