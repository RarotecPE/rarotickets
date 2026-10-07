import type { Metadata } from "next";
import { CertificateVerification } from "@/components/certificate-verification";

type CertificatePageParams = { code: string };
type CertificatePageProps = { params: Promise<CertificatePageParams> };

export const metadata: Metadata = {
  title: "Validar certificado · RaroTickets",
};

export default async function CertificatePage({
  params,
}: CertificatePageProps) {
  const { code } = await params;
  return <CertificateVerification key={code} code={code} />;
}
