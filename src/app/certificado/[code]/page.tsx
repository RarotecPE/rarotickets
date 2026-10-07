import Link from "next/link";
import { Panel, PanelHeader, Badge } from "@/components/ui";
import { CertificateRepo } from "@/server/db/repositories";
import { formatDate } from "@/shared/utils/format";
import { CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ValidarCertificadoPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const cert = await CertificateRepo.findByCode(code);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Panel>
        <PanelHeader title="Validação de certificado" description="Consulta pública de autenticidade" />
        <div className="p-5">
          {!cert ? (
            <p className="text-app-danger">Certificado não encontrado. Verifique o código.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-app-success" />
                <div>
                  <p className="text-sm font-semibold">Certificado autêntico</p>
                  <p className="text-xs text-app-muted-foreground">Emitido em {formatDate((cert as any).props.issuedAt ?? new Date())}</p>
                </div>
              </div>
              <div className="rounded-app-lg border border-app-border p-4">
                <p className="text-2xl font-bold">{(cert as any).props.participantName}</p>
                <p className="mt-2 text-sm">concluiu o evento</p>
                <p className="mt-1 text-lg font-semibold text-app-primary">{(cert as any).props.eventTitle}</p>
                <p className="mt-2 text-sm">Carga horária: {(cert as any).props.hours} horas</p>
              </div>
              <p className="text-xs text-app-muted-foreground">
                Código de validação: <span className="font-mono">{cert.code}</span>
              </p>
            </div>
          )}
          <div className="mt-6">
            <Link href="/" className="text-xs text-app-primary hover:underline">Voltar</Link>
          </div>
        </div>
      </Panel>
    </div>
  );
}
