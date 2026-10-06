import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ArrowRight, CircleHelp, LockKeyhole } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiClientError } from '../../../../../client/services/api-service.base';
import { useParticipantAuth } from '../../state/participant-auth-context';
import { ParticipantAuthLayout } from '../components/participant-auth-layout.component';
import { validateLoginParticipantForm } from '../forms/participant-account.form';
import type { LoginParticipantFormValues } from '../forms/participant-account.form';

type UpdateLoginFieldParams = { field: keyof LoginParticipantFormValues; value: string };
type UpdateLoginField = (params: UpdateLoginFieldParams) => void;
type LoginInputChangeHandler = (event: ChangeEvent<HTMLInputElement>) => void;

export function ParticipantLoginPage() {
  const auth = useParticipantAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<LoginParticipantFormValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginParticipantFormValues, string>>>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (auth.status === 'loading') return <main className="login-loading"><span className="spinner" />Preparando sua conta…</main>;
  if (auth.status === 'authenticated') return <Navigate to="/account" replace />;

  const updateField: UpdateLoginField = (params) => {
    setValues({ ...values, [params.field]: params.value });
    setErrors({ ...errors, [params.field]: undefined });
    setFormError('');
  };
  const handleEmailChange: LoginInputChangeHandler = (event) => updateField({ field: 'email', value: event.target.value });
  const handlePasswordChange: LoginInputChangeHandler = (event) => updateField({ field: 'password', value: event.target.value });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateLoginParticipantForm({ values });
    setErrors(validation.errors);
    setFormError('');
    if (!validation.payload) return;
    setIsSubmitting(true);
    try {
      await auth.login(validation.payload);
      navigate('/account', { replace: true });
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : 'Não foi possível entrar. Tente novamente.';
      setFormError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <ParticipantAuthLayout
      eyebrow="ÁREA DO PARTICIPANTE"
      title="Acesse sua conta"
      description="Entre com o e-mail e a senha cadastrados para acompanhar sua participação nos eventos."
    >
      {formError && <div className="callout callout-danger" role="alert">{formError}</div>}
      {auth.status === 'unavailable' && <div className="callout callout-warning" role="status">Não foi possível consultar uma sessão existente. Você ainda pode tentar entrar.</div>}
      <form className="participant-auth-form" onSubmit={submit} noValidate>
        <div className="form-field">
          <label htmlFor="participant-login-email">E-mail</label>
          <input id="participant-login-email" type="email" autoComplete="email" maxLength={254} value={values.email} onChange={handleEmailChange} aria-invalid={Boolean(errors.email)} />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="participant-login-password">Senha</label>
          <input id="participant-login-password" type="password" autoComplete="current-password" maxLength={128} value={values.password} onChange={handlePasswordChange} aria-invalid={Boolean(errors.password)} />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>
        <button className="button button-primary participant-auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? <span className="spinner spinner-small" /> : <LockKeyhole size={16} />}
          {isSubmitting ? 'Entrando…' : 'Entrar com e-mail e senha'}
          {!isSubmitting && <ArrowRight size={16} />}
        </button>
      </form>
      <p className="participant-auth-switch">Ainda não tem conta? <Link to="/account/register">Cadastre-se</Link></p>
      <Link className="participant-staff-link" to="/login"><CircleHelp size={14} /> Sou da equipe Raro — entrar com RaroNexus</Link>
    </ParticipantAuthLayout>
  );
}
