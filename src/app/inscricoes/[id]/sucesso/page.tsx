import Link from "next/link";
import { CheckCircle2, QrCode } from "lucide-react";
import { Panel, PanelHeader, Badge, btnSecondary } from "@/components/ui";
import { RegistrationRepo, EventRepo, ParticipantRepo } from "@/server/db/repositories";
import { formatDate } from "@/shared/utils/format";

export const dynamic = "force-dynamic";

export default async function InscricaoSucessoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ waitlist?: string }> }) {
  const { id } = await params;
  const { waitlist } = await searchParams;
  const reg = await RegistrationRepo.findById(id);
  if (!reg) return <Panel><div className="p-5"><p>Inscrição não encontrada.</p></div></Panel>;
  const event = await EventRepo.findById(reg.eventId);
  const participant = await ParticipantRepo.findById(reg.participantId);

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <PanelHeader title="Inscrição registrada!" description={waitlist ? "Você está na lista de espera" : "Sua inscrição foi processada com sucesso"} />
        <div className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-app-success" />
            <div>
              <p className="font-semibold">Código: <span className="font-mono">{reg.code}</span></p>
              <p className="text-xs text-app-muted-foreground">Guarde este número. Ele é seu comprovante.</p>
            </div>
          </div>

          {!waitlist && (
            <div className="rounded-app-lg border border-app-primary/30 bg-app-primary/5 p-4">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-app-primary" />
                <p className="text-sm font-semibold">Credencial/QR Code</p>
              </div>
              <p className="mt-2 font-mono text-xs break-all">{reg.credentialQrPayload}</p>
              <p className="mt-2 text-xs text-app-muted-foreground">
                Apresente este QR Code no credenciamento do evento. Você também pode acessá-lo em
                {" "}<Link href="/meus-ingressos" className="text-app-primary hover:underline">Meus ingressos</Link>.
              </p>
            </div>
          )}

          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-xs uppercase text-app-muted-foreground">Participante</dt><dd>{participant?.name.value}</dd></div>
            <div><dt className="text-xs uppercase text-app-muted-foreground">Evento</dt><dd>{event?.title}</dd></div>
            <div><dt className="text-xs uppercase text-app-muted-foreground">Data</dt><dd>{event && formatDate(event.dateRange.startsAt)}</dd></div>
            <div><dt className="text-xs uppercase text-app-muted-foreground">Status</dt><dd><Badge tone={waitlist ? "warning" : "success"}>{waitlist ? "Lista de espera" : "Confirmada"}</Badge></dd></div>
          </dl>

          <div className="flex gap-2 border-t border-app-border pt-4">
            <Link href="/meus-ingressos" className={btnSecondary}>Ver meus ingressos</Link>
          </div>
        </div>
      </Panel>
    </div>
  );
}
