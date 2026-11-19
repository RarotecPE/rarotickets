import type { Metadata } from "next";
import { CertificateVerification } from "@/components/certificate-verification";

type CertificatesPageProps = {
  searchParams: Promise<{ code?: string }>;
};

export const metadata: Metadata = {
  title: "Validar certificado · RaroTickets",
};

export default async function CertificatesPage({
  searchParams,
}: CertificatesPageProps) {
  const { code } = await searchParams;
  const normalizedCode = typeof code === "string" ? code.trim() : "";
  return <CertificateVerification key={normalizedCode} code={normalizedCode} />;
}
