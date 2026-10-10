import type { Metadata } from "next";
import { EventManagementForm } from "@/components/event-management-form";

type EditEventPageParams = { eventId: string };
type EditEventPageProps = { params: Promise<EditEventPageParams> };

export const metadata: Metadata = { title: "Editar evento · RaroTickets" };

export default async function EditManagedEventPage({
  params,
}: EditEventPageProps) {
  const { eventId } = await params;
  return <EventManagementForm key={eventId} eventId={eventId} />;
}

