import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ArrowRight, UserRoundPlus } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiClientError } from '../../../../../client/services/api-service.base';
import { useParticipantAuth } from '../../state/participant-auth-context';
import { ParticipantAuthLayout } from '../components/participant-auth-layout.component';
import { validateRegisterParticipantForm } from '../forms/participant-account.form';
import type { RegisterParticipantFormValues } from '../forms/participant-account.form';

const INITIAL_REGISTRATION_VALUES: RegisterParticipantFormValues = {
  name: '',
  email: '',
  cpf: '',
  password: '',
  confirmPassword: '',
};

type UpdateRegistrationFieldParams = { field: keyof RegisterParticipantFormValues; value: string };
type UpdateRegistrationField = (params: UpdateRegistrationFieldParams) => void;
type RegistrationInputChangeHandler = (event: ChangeEvent<HTMLInputElement>) => void;

export function ParticipantRegisterPage() {
  const auth = useParticipantAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<RegisterParticipantFormValues>(INITIAL_REGISTRATION_VALUES);
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterParticipantFormValues, string>>>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (auth.status === 'loading') return <main className="login-loading"><span className="spinner" />Preparando seu cadastro…</main>;
  if (auth.status === 'authenticated') return <Navigate to="/account" replace />;

  const updateField: UpdateRegistrationField = (params) => {
    setValues({ ...values, [params.field]: params.value });
    setErrors({ ...errors, [params.field]: undefined });
    setFormError('');
  };
  const handleNameChange: RegistrationInputChangeHandler = (event) => updateField({ field: 'name', value: event.target.value });
  const handleEmailChange: RegistrationInputChangeHandler = (event) => updateField({ field: 'email', value: event.target.value });
  const handleCpfChange: RegistrationInputChangeHandler = (event) => updateField({ field: 'cpf', value: event.target.value });
  const handlePasswordChange: RegistrationInputChangeHandler = (event) => updateField({ field: 'password', value: event.target.value });
  const handlePasswordConfirmationChange: RegistrationInputChangeHandler = (event) => updateField({ field: 'confirmPassword', value: event.target.value });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateRegisterParticipantForm({ values });
    setErrors(validation.errors);
    setFormError('');
    if (!validation.payload) return;
    setIsSubmitting(true);
    try {
      await auth.register(validation.payload);
      navigate('/account', { replace: true });
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : 'Não foi possível criar sua conta. Tente novamente.';
      setFormError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <ParticipantAuthLayout
      eyebrow="CRIE SUA CONTA"
      title="Participe de experiências Raro."
      description="Use seus dados para criar uma conta de participante e acompanhar seus eventos."
    >
      {formError && <div className="callout callout-danger" role="alert">{formError}</div>}
      <form className="participant-auth-form" onSubmit={submit} noValidate>
        <div className="form-field">
          <label htmlFor="participant-name">Nome completo</label>
          <input id="participant-name" autoComplete="name" maxLength={120} value={values.name} onChange={handleNameChange} aria-invalid={Boolean(errors.name)} />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="participant-email">E-mail</label>
          <input id="participant-email" type="email" autoComplete="email" maxLength={254} value={values.email} onChange={handleEmailChange} aria-invalid={Boolean(errors.email)} />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="participant-cpf">CPF</label>
          <input id="participant-cpf" inputMode="numeric" autoComplete="off" maxLength={18} placeholder="000.000.000-00" value={values.cpf} onChange={handleCpfChange} aria-invalid={Boolean(errors.cpf)} />
          {errors.cpf && <span className="field-error">{errors.cpf}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="participant-password">Senha</label>
          <input id="participant-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={values.password} onChange={handlePasswordChange} aria-invalid={Boolean(errors.password)} />
          <span className="field-hint">Use entre 8 e 128 caracteres.</span>
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="participant-password-confirm">Confirme sua senha</label>
          <input id="participant-password-confirm" type="password" autoComplete="new-password" maxLength={128} value={values.confirmPassword} onChange={handlePasswordConfirmationChange} aria-invalid={Boolean(errors.confirmPassword)} />
          {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
        </div>
        <p className="participant-privacy-note">Seu CPF será armazenado para identificar seu cadastro de participante e não será exibido integralmente na interface.</p>
        <button className="button button-primary participant-auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? <span className="spinner spinner-small" /> : <UserRoundPlus size={16} />}
          {isSubmitting ? 'Criando conta…' : 'Criar conta de participante'}
          {!isSubmitting && <ArrowRight size={16} />}
        </button>
      </form>
      <p className="participant-auth-switch">Já tem uma conta? <Link to="/account/login">Entrar</Link></p>
      <p className="participant-staff-link"><Link to="/login">Acesso da equipe Raro via RaroNexus</Link></p>
    </ParticipantAuthLayout>
  );
}
