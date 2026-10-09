import type { Metadata } from "next";
import { EventManagementForm } from "@/components/event-management-form";

export const metadata: Metadata = { title: "Criar evento · RaroTickets" };

export default function CreateManagedEventPage() {
  return <EventManagementForm />;
}
