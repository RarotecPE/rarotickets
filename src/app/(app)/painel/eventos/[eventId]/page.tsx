import type { Metadata } from "next";
import { ManagedEventDetail } from "@/components/managed-event-detail";

type ManagedEventPageParams = { eventId: string };
type ManagedEventPageProps = { params: Promise<ManagedEventPageParams> };

export const metadata: Metadata = { title: "Detalhes do evento · RaroTickets" };

export default async function ManagedEventPage({
  params,
}: ManagedEventPageProps) {
  const { eventId } = await params;
  return <ManagedEventDetail key={eventId} eventId={eventId} />;
}
