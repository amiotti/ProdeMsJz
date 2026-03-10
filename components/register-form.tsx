'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function RegisterForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bankInfo, setBankInfo] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [declaredAdult, setDeclaredAdult] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (!acceptedTerms) {
      setStatus('Debes aceptar los Términos y Condiciones para registrarte.');
      return;
    }
    if (!acceptedPrivacy) {
      setStatus('Debes aceptar la Política de Privacidad para registrarte.');
      return;
    }
    if (!declaredAdult) {
      setStatus('Debes declarar que eres mayor de 18 años para registrarte.');
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          bankInfo,
          password,
          acceptedTerms,
          acceptedPrivacy,
          declaredAdult,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) throw new Error(data.error || 'Error al registrar');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('prode-auth-changed'));
      }

      setStatus(`Usuario registrado: ${data.user.name}. Redirigiendo a Inicio...`);
      router.push('/inicio');
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo registrar');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = acceptedTerms && acceptedPrivacy && declaredAdult;

  return (
    <form className="panel form-grid form-grid-register" onSubmit={onSubmit}>
      <label>
        Nombre
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ej: Juan" required />
      </label>
      <label>
        Apellido
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ej: Pérez" required />
      </label>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan@mail.com" required />
      </label>
      <label>
        Teléfono
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54 9 11 ..." required />
      </label>
      <label>
        CBU/CVU o Alias
        <input
          value={bankInfo}
          onChange={(e) => setBankInfo(e.target.value)}
          placeholder="Alias o CBU/CVU para premios"
          required
        />
      </label>
      <label>
        Contraseña
        <input
          type="password"
          value={password}
          minLength={8}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          required
        />
      </label>

      <div className="auth-legal-check" role="group" aria-label="Consentimientos legales">
        <label className="auth-legal-row">
          <span className="auth-legal-text">
            Acepto los{' '}
            <Link href="/terms" className="auth-legal-link" target="_blank" rel="noreferrer">
              Términos y Condiciones
            </Link>
          </span>
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            required
          />
        </label>

        <label className="auth-legal-row">
          <span className="auth-legal-text">
            Acepto la{' '}
            <Link href="/privacy" className="auth-legal-link" target="_blank" rel="noreferrer">
              Política de Privacidad
            </Link>
          </span>
          <input
            type="checkbox"
            checked={acceptedPrivacy}
            onChange={(e) => setAcceptedPrivacy(e.target.checked)}
            required
          />
        </label>

        <label className="auth-legal-row">
          <span className="auth-legal-text">Declaro ser mayor de 18 años</span>
          <input
            type="checkbox"
            checked={declaredAdult}
            onChange={(e) => setDeclaredAdult(e.target.checked)}
            required
          />
        </label>
      </div>

      <button className="btn btn-primary" disabled={loading || !canSubmit} type="submit">
        {loading ? 'Creando usuario...' : 'Registrarme'}
      </button>

      {status ? <p className="status">{status}</p> : null}
    </form>
  );
}



