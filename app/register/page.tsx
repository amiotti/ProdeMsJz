import { RegisterForm } from '@/components/register-form';

export default function RegisterPage() {
  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>Registro de participantes</h2>
        <p className="muted">
          Crea tu cuenta para empezar a cargar pronosticos. Se guarda nombre, apellido, telefono, email y contraseña.
        </p>
      </div>
      <RegisterForm />
    </section>
  );
}
