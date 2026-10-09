import type { Metadata } from "next";
import { PublicEventsBrowser } from "@/components/public-events-browser";

export const metadata: Metadata = { title: "Eventos e inscrições", description: "Descubra eventos e faça sua inscrição pelo RaroTickets." };

export default function HomePage() {
  return <PublicEventsBrowser variant="home" />;
}
