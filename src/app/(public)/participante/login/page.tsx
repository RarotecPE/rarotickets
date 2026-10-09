import type { Metadata } from "next";
import { Suspense } from "react";
import { ParticipantLoginFlow } from "@/components/participant-login-flow";

export const metadata: Metadata = {
  title: "Entrar como Participante · RaroTickets",
  description: "Acesse seu painel de participante no RaroTickets via senha ou código de verificação por e-mail.",
};

export default function ParticipantLoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md p-6 text-center text-sm text-app-muted-foreground">Carregando login...</div>}>
      <ParticipantLoginFlow />
    </Suspense>
  );
}

