'use client';

import { useForm } from 'react-hook-form';

import type { ContactMessage } from '@/lib/types';

type ContactFormValues = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

export function ContactForm({
  defaultValues,
}: {
  defaultValues?: Partial<ContactFormValues>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    defaultValues: {
      name: defaultValues?.name ?? '',
      email: defaultValues?.email ?? '',
      phone: defaultValues?.phone ?? '',
      message: defaultValues?.message ?? '',
    },
  });

  async function onSubmit(values: ContactFormValues) {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'No se pudo enviar la consulta');
    }
    reset({ ...values, message: '' });
    return data.message as ContactMessage;
  }

  return (
    <form
      className="panel form-grid contact-form-panel"
      onSubmit={handleSubmit(async (values) => {
        try {
          await onSubmit(values);
          window.alert('Consulta enviada. El administrador la verá desde su panel.');
        } catch (error) {
          window.alert(error instanceof Error ? error.message : 'No se pudo enviar la consulta');
        }
      })}
    >
      <label>
        Nombre
        <input
          {...register('name', { required: 'Ingresa tu nombre', minLength: { value: 2, message: 'Muy corto' } })}
          placeholder="Ej: Juan Pérez"
        />
        {errors.name ? <span className="field-error">{errors.name.message}</span> : null}
      </label>

      <label>
        Email
        <input
          type="email"
          {...register('email', {
            required: 'Ingresa tu email',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' },
          })}
          placeholder="juan@mail.com"
        />
        {errors.email ? <span className="field-error">{errors.email.message}</span> : null}
      </label>

      <label className="contact-form-span">
        Teléfono (opcional)
        <input
          {...register('phone', {
            pattern: { value: /^[0-9+()\-\s]{0,32}$/, message: 'Teléfono inválido' },
          })}
          placeholder="+54 9 11 ..."
        />
        {errors.phone ? <span className="field-error">{errors.phone.message}</span> : null}
      </label>

      <label className="contact-form-span">
        Consulta
        <textarea
          {...register('message', {
            required: 'Escribe tu consulta',
            minLength: { value: 10, message: 'Escribe al menos 10 caracteres' },
          })}
          rows={6}
          placeholder="Contanos qué necesitás y cómo preferís que te contacten."
        />
        {errors.message ? <span className="field-error">{errors.message.message}</span> : null}
      </label>

      <button className="btn btn-primary contact-form-span" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Enviando...' : 'Enviar consulta'}
      </button>
    </form>
  );
}
