import type { Metadata } from "next";
import { RegistrationsBrowser } from "@/components/registrations-browser";

export const metadata: Metadata = { title: "Inscrições · RaroTickets" };

export default function RegistrationsPage() {
  return <RegistrationsBrowser />;
}
