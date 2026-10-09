import type { Metadata } from "next";
import { ParticipantPortal } from "@/components/participant-portal";

type ParticipantPageParams = { accessToken: string };
type ParticipantPageProps = { params: Promise<ParticipantPageParams> };

export const metadata: Metadata = {
  title: "Área do Participante · RaroTickets",
};

export default async function ParticipantPage({
  params,
}: ParticipantPageProps) {
  const { accessToken } = await params;
  return <ParticipantPortal key={accessToken} accessToken={accessToken} />;
}
