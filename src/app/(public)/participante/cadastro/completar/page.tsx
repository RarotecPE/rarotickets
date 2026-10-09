import type { Metadata } from "next";
import { Suspense } from "react";
import { ParticipantRegisterFlow } from "@/components/participant-register-flow";

export const metadata: Metadata = {
  title: "Completar Cadastro · RaroTickets",
  description: "Conclua o seu cadastro e defina sua senha no RaroTickets.",
};

export default function CompleteRegistrationPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg p-6 text-center text-sm text-app-muted-foreground">Validando convite...</div>}>
      <ParticipantRegisterFlow />
    </Suspense>
  );
}

