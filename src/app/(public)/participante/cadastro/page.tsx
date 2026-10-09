import type { Metadata } from "next";
import { Suspense } from "react";
import { ParticipantRegisterFlow } from "@/components/participant-register-flow";

export const metadata: Metadata = {
  title: "Cadastro de Participante · RaroTickets",
  description: "Cadastre-se no RaroTickets para se inscrever e gerenciar seus ingressos.",
};

export default function ParticipantRegisterPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg p-6 text-center text-sm text-app-muted-foreground">Carregando formulário...</div>}>
      <ParticipantRegisterFlow />
    </Suspense>
  );
}

