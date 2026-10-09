import type { Metadata } from "next";
import { PublicEventDetail } from "@/components/public-event-detail";

type EventPageParams = { slug: string };
type EventPageProps = { params: Promise<EventPageParams> };

export const metadata: Metadata = { title: "Detalhes do evento" };

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  return <PublicEventDetail key={slug} slug={slug} />;
}
