import type { Metadata } from "next";
import { PublicRegistrationConfirmationPage } from "@/components/public-registration-confirmation-page";

type ConfirmationPageParams = { slug: string };
type ConfirmationPageProps = { params: Promise<ConfirmationPageParams> };

export const metadata: Metadata = {
  title: "Confirmar Inscrição · RaroTickets",
  description: "Confirmação e finalização de inscrição no evento",
};

export default async function EventConfirmationPage({ params }: ConfirmationPageProps) {
  const { slug } = await params;
  return <PublicRegistrationConfirmationPage key={slug} slug={slug} />;
}

