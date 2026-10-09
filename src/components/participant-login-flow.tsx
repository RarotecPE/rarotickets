"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, LogIn, Mail, Send, ShieldCheck } from "lucide-react";
import { participantApi } from "@/client/services/participant-api.service";
import { useParticipantAuth } from "@/components/participant-auth-provider";
import {
  Button,
  Field,
  InlineAlert,
  Panel,
  PanelHeader,
  inputCls,
} from "@/components/ui";

type LoginTab = "password" | "otp";

export function ParticipantLoginFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "/participante";
  const { isAuthenticated, refreshSession } = useParticipantAuth();

  const [activeTab, setActiveTab] = useState<LoginTab>("password");

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectParam);
    }
  }, [isAuthenticated, redirectParam, router]);

  async function handleLoginSuccess() {
    await refreshSession();
    router.replace(redirectParam);
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Panel>
        <PanelHeader
          title="Acesso do Participante"
          description="Entre na sua conta para acessar seus eventos, ingressos e certificados."
        />

        {/* Abas de método de login */}
        <div className="flex border-b border-app-border bg-app-surface-elevated/40">
          <button
            type="button"
            onClick={() => setActiveTab("password")}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-xs font-semibold transition ${
              activeTab === "password"
                ? "border-app-primary bg-app-surface text-app-foreground"
                : "border-transparent text-app-muted-foreground hover:text-app-foreground"
            }`}
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            Entrar com senha
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("otp")}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-xs font-semibold transition ${
              activeTab === "otp"
                ? "border-app-primary bg-app-surface text-app-foreground"
                : "border-transparent text-app-muted-foreground hover:text-app-foreground"
            }`}
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Código por e-mail
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {activeTab === "password" ? (
            <PasswordLoginForm onSuccess={handleLoginSuccess} />
          ) : (
            <OtpLoginForm onSuccess={handleLoginSuccess} />
          )}

          <div className="mt-6 border-t border-app-border pt-4 text-center">
            <p className="text-xs text-app-muted-foreground">
              Ainda não possui conta?{" "}
              <Link
                href={`/participante/cadastro?redirect=${encodeURIComponent(redirectParam)}`}
                className="font-semibold text-app-primary hover:underline"
              >
                Cadastre-se aqui
              </Link>
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ABA 1: LOGIN COM SENHA
// ─────────────────────────────────────────────────────────────────────────────

function PasswordLoginForm({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError("Informe seu CPF ou e-mail e sua senha.");
      return;
    }

    setSubmitting(true);
    try {
      await participantApi.loginWithPassword({
        identifier: identifier.trim(),
        password,
      });
      await onSuccess();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível realizar o login.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && <InlineAlert tone="danger">{error}</InlineAlert>}

      <Field
        label="CPF ou E-mail *"
        htmlFor="login-identifier"
        hint="O CPF ou e-mail utilizado no seu cadastro."
      >
        <input
          id="login-identifier"
          type="text"
          autoComplete="username"
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value);
            if (error) setError(null);
          }}
          placeholder="000.000.000-00 ou voce@exemplo.com"
          className={inputCls}
          required
        />
      </Field>

      <Field label="Senha *" htmlFor="login-password">
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError(null);
          }}
          className={inputCls}
          required
        />
      </Field>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <>Entrando…</>
        ) : (
          <>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Entrar
          </>
        )}
      </Button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ABA 2: LOGIN COM CÓDIGO POR E-MAIL (OTP)
// ─────────────────────────────────────────────────────────────────────────────

function OtpLoginForm({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [identifier, setIdentifier] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleRequestOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError("Informe seu CPF ou e-mail.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await participantApi.requestOtp({
        identifier: identifier.trim(),
      });
      setMaskedEmail(response.emailMasked);
      setStep("verify");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível enviar o código.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!code.trim() || code.trim().length !== 6) {
      setError("Informe o código de 6 dígitos recebido por e-mail.");
      return;
    }

    setSubmitting(true);
    try {
      await participantApi.verifyOtp({
        identifier: identifier.trim(),
        code: code.trim(),
      });
      await onSuccess();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Código incorreto ou expirado.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "verify") {
    return (
      <form onSubmit={handleVerifyOtp} className="space-y-4" noValidate>
        {error && <InlineAlert tone="danger">{error}</InlineAlert>}

        <div className="rounded-app-md border border-app-border bg-app-surface-elevated/40 p-3 text-xs leading-relaxed text-app-muted-foreground">
          Enviamos um código de 6 dígitos para{" "}
          <strong className="text-app-foreground">{maskedEmail}</strong>. Verifique
          sua caixa de entrada e spam.
        </div>

        <Field
          label="Código de confirmação (6 dígitos) *"
          htmlFor="otp-code"
          hint="O código expira em 15 minutos."
        >
          <input
            id="otp-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              if (error) setError(null);
            }}
            placeholder="000000"
            className={`${inputCls} text-center font-mono text-lg font-bold tracking-widest`}
            required
            autoFocus
          />
        </Field>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <>Verificando código…</>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Confirmar e acessar
            </>
          )}
        </Button>

        <div className="flex justify-between pt-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setStep("request");
              setCode("");
              setError(null);
            }}
            className="text-app-muted-foreground hover:text-app-foreground hover:underline"
          >
            Alterar CPF/e-mail
          </button>
          <button
            type="button"
            onClick={(e) => void handleRequestOtp(e)}
            disabled={submitting}
            className="font-medium text-app-primary hover:underline"
          >
            Reenviar código
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleRequestOtp} className="space-y-4" noValidate>
      {error && <InlineAlert tone="danger">{error}</InlineAlert>}

      <p className="text-xs text-app-muted-foreground">
        Informe seu CPF ou e-mail cadastrado para receber um código de uso único por e-mail.
      </p>

      <Field label="CPF ou E-mail *" htmlFor="otp-identifier">
        <input
          id="otp-identifier"
          type="text"
          autoComplete="username"
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value);
            if (error) setError(null);
          }}
          placeholder="000.000.000-00 ou voce@exemplo.com"
          className={inputCls}
          required
        />
      </Field>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <>Enviando código…</>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" />
            Enviar código de confirmação
          </>
        )}
      </Button>
    </form>
  );
}
