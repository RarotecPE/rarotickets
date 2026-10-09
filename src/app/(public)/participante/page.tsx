import type { Metadata } from "next";
import { ParticipantDashboard } from "@/components/participant-dashboard";

export const metadata: Metadata = {
  title: "Painel do Participante · RaroTickets",
  description: "Consulte suas inscrições, ingressos, credenciais e certificados no RaroTickets.",
};

export default function ParticipantPage() {
  return <ParticipantDashboard />;
}

