"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { authApi } from "@/client/services/auth-api.service";
import { ApiError } from "@/client/services/api-service.base";
import { Button, InlineAlert, Panel, Spinner, btnPrimary, btnSecondary } from "@/components/ui";

export type LoginPanelProps = { reason: string | null; nextPath: string; revocation?: string | null };
type LoginMessageParams = { reason: string | null; revocation: string | null };

export function LoginPanel({ reason, nextPath, revocation = null }: LoginPanelProps) {
  const router = useRouter();
  const started = useRef(false);
  const [checking, setChecking] = useState(reason === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reason || started.current) return;
    started.current = true;
    const validateLocalSession = async () => {
      try {
        await authApi.getSession();
        router.replace(nextPath);
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 401) {
          const query = new URLSearchParams({ mode: "silent", next: nextPath });
          window.location.replace(`/api/auth/raronexus/start?${query.toString()}`);
          return;
        }
        setError(caught instanceof Error ? caught.message : "Não foi possível validar o acesso.");
        setChecking(false);
      }
    };
    void validateLocalSession();
  }, [nextPath, reason, router]);

  const message = getLoginMessage({ reason, revocation });
  const loginUrl = `/api/auth/raronexus/start?${new URLSearchParams({ mode: "interactive", next: nextPath }).toString()}`;
  return <main className="grid min-h-screen place-items-center bg-app-background px-4 py-8">
    <div className="w-full max-w-md">
      <div className="mb-6 flex flex-col items-center text-center"><Image src="/rarotickets-mark.svg" width={64} height={64} alt="" priority className="mb-4 h-16 w-16 rounded-2xl" /><h1 className="text-2xl font-bold tracking-tight text-app-foreground">Acesso RaroTickets</h1><p className="mt-2 max-w-sm text-sm leading-relaxed text-app-muted-foreground">A equipe entra com sua conta corporativa RaroNexus. Não há senha local nesta aplicação.</p></div>
      <Panel className="p-5 sm:p-6">
        {message ? <InlineAlert tone={message.tone} className="mb-4">{message.text}</InlineAlert> : null}
        {error ? <InlineAlert tone="danger" className="mb-4">{error}</InlineAlert> : null}
        {checking && !reason ? <div className="mb-4"><Spinner label="Verificando sessão corporativa…" /></div> : null}
        <div className="space-y-3">
          <Link href={loginUrl} className={btnPrimary + " w-full"}><ShieldCheck className="h-4 w-4" aria-hidden="true" />Continuar com RaroNexus<ArrowRight className="ml-auto h-4 w-4" aria-hidden="true" /></Link>
          {error ? <Button variant="secondary" onClick={() => window.location.assign(loginUrl)} className="w-full">Tentar novamente</Button> : null}
          <Link href="/" className={btnSecondary + " w-full"}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Voltar à vitrine de eventos</Link>
        </div>
        <div className="mt-5 border-t border-app-border pt-4 text-xs leading-relaxed text-app-muted-foreground"><p>Seu papel no RaroNexus define as operações disponíveis no RaroTickets. Se você precisa de acesso, solicite a habilitação ao administrador da aplicação.</p></div>
      </Panel>
      <p className="mt-5 text-center text-[11px] text-app-muted-foreground">Sessões verificadas pelo RaroNexus em cada operação protegida.</p>
    </div>
  </main>;
}

function getLoginMessage(params: LoginMessageParams): { text: string; tone: "danger" | "success" | "info" } | null {
  if (params.reason === "sso_not_configured") return { tone: "danger", text: "A integração com RaroNexus ainda não está configurada. Preencha as variáveis de ambiente da implantação." };
  if (params.reason === "login_required") return { tone: "info", text: "Sua sessão central não está ativa. Entre com sua conta RaroNexus para continuar." };
  if (params.reason === "role_not_allowed") return { tone: "danger", text: "Sua conta foi reconhecida, mas o perfil não está habilitado no RaroTickets." };
  if (params.reason === "sso_state_invalid") return { tone: "danger", text: "Não foi possível validar o retorno de autenticação. Inicie o acesso novamente." };
  if (params.reason === "sso_cancelled") return { tone: "info", text: "O acesso foi cancelado. Você pode tentar novamente." };
  if (params.reason === "sso_unavailable") return { tone: "danger", text: "O RaroNexus está temporariamente indisponível ou não aceitou a autenticação." };
  if (params.reason === "logout" && params.revocation === "confirmed") return { tone: "success", text: "Sessão local encerrada e revogação confirmada pelo RaroNexus." };
  if (params.reason === "logout") return { tone: "info", text: "Sessão local encerrada. A revogação global não pôde ser confirmada." };
  return null;
}
