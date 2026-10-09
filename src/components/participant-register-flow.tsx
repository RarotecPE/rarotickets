"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Mail, Send } from "lucide-react";
import {
  participantApi,
  type ActivationInfoResponse,
} from "@/client/services/participant-api.service";
import { useParticipantAuth } from "@/components/participant-auth-provider";
import {
  Button,
  Field,
  InlineAlert,
  Panel,
  PanelHeader,
  Spinner,
  inputCls,
} from "@/components/ui";
import { Cpf } from "@/modules/ticketing/domain/participants/value-objects/cpf.vo";
import { Email } from "@/modules/ticketing/domain/participants/value-objects/email.vo";
import { Phone } from "@/modules/ticketing/domain/participants/value-objects/phone.vo";
import { ParticipantName } from "@/modules/ticketing/domain/participants/value-objects/participant-name.vo";
import { ParticipantPassword } from "@/modules/ticketing/domain/participants/value-objects/participant-password.vo";

export function ParticipantRegisterFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token");
  const redirectParam = searchParams.get("redirect") || "/participante";
  const { isAuthenticated, refreshSession } = useParticipantAuth();

  // Redirect if already logged in and not completing a token
  useEffect(() => {
    if (isAuthenticated && !tokenParam) {
      router.replace(redirectParam);
    }
  }, [isAuthenticated, tokenParam, redirectParam, router]);

  if (tokenParam) {
    return (
      <CompleteRegistrationStep
        token={tokenParam}
        onSuccess={async () => {
          await refreshSession();
          router.replace(redirectParam);
        }}
      />
    );
  }

  return <RequestRegistrationStep redirect={redirectParam} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 1: SOLICITAÇÃO (CPF + E-MAIL)
// ─────────────────────────────────────────────────────────────────────────────

function RequestRegistrationStep({ redirect }: { redirect: string }) {
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setCpfError(null);
    setEmailError(null);
    setGeneralError(null);

    const cpfValidation = Cpf.create(cpf);
    if (cpfValidation.isFailure) {
      setCpfError("Informe um CPF válido.");
      return;
    }

    const emailValidation = Email.create(email);
    if (emailValidation.isFailure) {
      setEmailError("Informe um e-mail válido.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await participantApi.requestRegistration({
        cpf: cpfValidation.value.digits,
        email: emailValidation.value.value,
        redirect,
      });
      setSuccessEmail(response.email);
    } catch (caught) {
      setGeneralError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível enviar o link de cadastro.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (successEmail) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-8">
        <Panel className="p-6 text-center sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <Mail className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-app-foreground">
            Verifique seu e-mail
          </h1>
          <p className="mt-2 text-sm text-app-muted-foreground">
            Enviamos um link de confirmação para{" "}
            <strong className="text-app-foreground">{successEmail}</strong>.
          </p>
          <div className="my-6 rounded-app-md border border-app-border bg-app-surface-elevated/50 p-4 text-xs leading-relaxed text-app-muted-foreground">
            Abra a mensagem recebida e clique no botão para definir sua senha e
            preencher seus dados de participante. O link é válido por 24 horas.
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setSuccessEmail(null);
                setCpf("");
                setEmail("");
              }}
            >
              Reenviar ou usar outro e-mail
            </Button>
            <Link
              href={`/participante/login?redirect=${encodeURIComponent(redirect)}`}
              className="text-xs text-app-primary hover:underline"
            >
              Já confirmou sua conta? Fazer login
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Panel>
        <PanelHeader
          title="Cadastro de Participante"
          description="Informe seu CPF e e-mail para receber o link de conclusão de cadastro."
        />
        <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6" noValidate>
          {generalError && <InlineAlert tone="danger">{generalError}</InlineAlert>}

          <Field
            label="CPF *"
            htmlFor="register-cpf"
            error={cpfError || undefined}
            hint="Seus dados são protegidos e associados às suas inscrições."
          >
            <input
              id="register-cpf"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={cpf}
              onChange={(e) => {
                setCpf(e.target.value);
                if (cpfError) setCpfError(null);
              }}
              placeholder="000.000.000-00"
              className={inputCls}
              required
            />
          </Field>

          <Field
            label="E-mail *"
            htmlFor="register-email"
            error={emailError || undefined}
            hint="Enviaremos o link de confirmação para este e-mail."
          >
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              placeholder="seu.email@exemplo.com"
              className={inputCls}
              required
            />
          </Field>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>Enviando link…</>
            ) : (
              <>
                <Send className="h-4 w-4" aria-hidden="true" />
                Receber link de cadastro
              </>
            )}
          </Button>

          <div className="border-t border-app-border pt-4 text-center">
            <p className="text-xs text-app-muted-foreground">
              Já tem cadastro no RaroTickets?{" "}
              <Link
                href={`/participante/login?redirect=${encodeURIComponent(redirect)}`}
                className="font-semibold text-app-primary hover:underline"
              >
                Fazer login
              </Link>
            </p>
          </div>
        </form>
      </Panel>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 2: CONCLUSÃO (DADOS RESTANTES + NOVA SENHA)
// ─────────────────────────────────────────────────────────────────────────────

function CompleteRegistrationStep({
  token,
  onSuccess,
}: {
  token: string;
  onSuccess: () => Promise<void>;
}) {
  const [tokenInfo, setTokenInfo] = useState<ActivationInfoResponse | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsConsent, setTermsConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    participantApi
      .getActivationInfo(token)
      .then((data) => {
        if (active) setTokenInfo(data);
      })
      .catch((caught) => {
        if (active) {
          setTokenError(
            caught instanceof Error
              ? caught.message
              : "Link de ativação inválido ou expirado.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingToken(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setGeneralError(null);
    const errors: Record<string, string> = {};

    const nameResult = ParticipantName.create(name);
    if (nameResult.isFailure) errors.name = nameResult.error.message;

    const phoneResult = Phone.create(phone);
    if (phoneResult.isFailure) errors.phone = "Informe um celular válido com DDD.";

    const passResult = ParticipantPassword.create(password);
    if (passResult.isFailure) errors.password = passResult.error.message;

    if (password !== confirmPassword) {
      errors.confirmPassword = "As senhas não coincidem.";
    }

    if (!termsConsent) {
      errors.termsConsent = "Você deve concordar com os termos de participação.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await participantApi.completeRegistration({
        token,
        name: name.trim(),
        phone: phone.trim(),
        birthDate: birthDate || null,
        company: company.trim() || null,
        jobTitle: jobTitle.trim() || null,
        password,
        termsConsent: true,
        marketingConsent,
      });

      await onSuccess();
    } catch (caught) {
      setGeneralError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível concluir seu cadastro.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingToken) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center px-4 py-16">
        <Spinner label="Validando link de cadastro…" />
      </div>
    );
  }

  if (tokenError || !tokenInfo) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-8">
        <Panel className="p-6 text-center sm:p-8">
          <InlineAlert tone="danger">{tokenError || "Link inválido."}</InlineAlert>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/participante/cadastro"
              className="inline-flex h-10 items-center justify-center rounded-app-md bg-app-primary px-4 text-sm font-semibold text-white hover:brightness-110"
            >
              Solicitar novo link de cadastro
            </Link>
            <Link
              href="/participante/login"
              className="text-xs text-app-muted-foreground hover:underline"
            >
              Ir para a tela de login
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <Panel>
        <PanelHeader
          title="Concluir Cadastro"
          description="Preencha seus dados de participante e cadastre sua senha de acesso."
        />
        <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6" noValidate>
          {generalError && <InlineAlert tone="danger">{generalError}</InlineAlert>}

          {/* Dados confirmados */}
          <div className="grid grid-cols-1 gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/40 p-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-medium text-app-muted-foreground">E-mail</p>
              <p className="truncate text-xs font-semibold text-app-foreground">
                {tokenInfo.email}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-app-muted-foreground">CPF</p>
              <p className="text-xs font-semibold text-app-foreground">
                {tokenInfo.cpf || "Não informado"}
              </p>
            </div>
          </div>

          <Field
            label="Nome completo *"
            htmlFor="complete-name"
            error={fieldErrors.name}
          >
            <input
              id="complete-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: "" }));
              }}
              placeholder="Ex.: Maria da Silva"
              className={inputCls}
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Celular com DDD *"
              htmlFor="complete-phone"
              error={fieldErrors.phone}
            >
              <input
                id="complete-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: "" }));
                }}
                placeholder="(81) 99999-9999"
                className={inputCls}
                required
              />
            </Field>

            <Field label="Data de nascimento" htmlFor="complete-birthdate">
              <input
                id="complete-birthdate"
                type="date"
                autoComplete="bday"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Empresa / instituição" htmlFor="complete-company">
              <input
                id="complete-company"
                type="text"
                autoComplete="organization"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Onde você trabalha/estuda"
                className={inputCls}
              />
            </Field>

            <Field label="Cargo / ocupação" htmlFor="complete-jobtitle">
              <input
                id="complete-jobtitle"
                type="text"
                autoComplete="organization-title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Seu cargo"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="border-t border-app-border pt-3">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-app-muted-foreground">
              Cadastre sua senha
            </h3>

            <div className="space-y-3">
              <Field
                label="Nova senha *"
                htmlFor="complete-password"
                error={fieldErrors.password}
                hint="Mínimo de 6 caracteres."
              >
                <input
                  id="complete-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password)
                      setFieldErrors((p) => ({ ...p, password: "" }));
                  }}
                  className={inputCls}
                  required
                />
              </Field>

              <Field
                label="Confirme a nova senha *"
                htmlFor="complete-confirm-password"
                error={fieldErrors.confirmPassword}
              >
                <input
                  id="complete-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword)
                      setFieldErrors((p) => ({ ...p, confirmPassword: "" }));
                  }}
                  className={inputCls}
                  required
                />
              </Field>
            </div>
          </div>

          <div className="space-y-2.5 border-t border-app-border pt-3 text-xs text-app-muted-foreground">
            <label className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={termsConsent}
                onChange={(e) => {
                  setTermsConsent(e.target.checked);
                  if (fieldErrors.termsConsent)
                    setFieldErrors((p) => ({ ...p, termsConsent: "" }));
                }}
                className="mt-0.5 h-4 w-4 shrink-0 accent-app-primary"
              />
              <span>
                Li e aceito os termos de participação e a Política de Privacidade do
                RaroTickets. <span className="text-app-danger">*</span>
              </span>
            </label>
            {fieldErrors.termsConsent && (
              <p className="text-xs text-app-danger">{fieldErrors.termsConsent}</p>
            )}

            <label className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-app-primary"
              />
              <span>Quero receber avisos sobre novos eventos e novidades. (opcional)</span>
            </label>
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>Salvando cadastro…</>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Concluir cadastro e acessar
                </>
              )}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
