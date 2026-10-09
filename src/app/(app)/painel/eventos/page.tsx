import type { Metadata } from "next";
import { ManagedEventsBrowser } from "@/components/managed-events-browser";

export const metadata: Metadata = { title: "Eventos · RaroTickets" };

export default function ManagedEventsPage() {
  return <ManagedEventsBrowser />;
}
