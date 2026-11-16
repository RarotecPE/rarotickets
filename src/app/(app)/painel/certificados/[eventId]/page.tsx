import { EventCertificateStudio } from "@/components/event-certificate-studio";

type EventCertificateStudioPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventCertificateStudioPage({
  params,
}: EventCertificateStudioPageProps) {
  const { eventId } = await params;
  return <EventCertificateStudio eventId={eventId} />;
}
