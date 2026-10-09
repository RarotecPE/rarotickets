import type { Metadata } from "next";
import { PublicEventsBrowser } from "@/components/public-events-browser";

export const metadata: Metadata = { title: "Explore eventos" };

export default function EventsPage() {
  return <PublicEventsBrowser variant="listing" />;
}
