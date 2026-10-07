import Link from "next/link";
import { Panel, PanelHeader, Badge, btnSecondary } from "@/components/ui";
import { RegistrationRepo, EventRepo, ParticipantRepo, PaymentRepo } from "@/server/db/repositories";
import { REGISTRATION_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/shared/utils/format";

export const dynamic = "force-dynamic";

export default async function InscricaoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reg = await RegistrationRepo.findById(id);
  if (!reg) return <Panel><div className="p-5"><p>Inscrição não encontrada.</p></div></Panel>;
  const event = await EventRepo.findById(reg.eventId);
  const participant = await ParticipantRepo.findById(reg.participantId);
  const payment = await PaymentRepo.findByRegistration(id);
  const rs = REGISTRATION_STATUS_LABELS[reg.status] ?? { label: reg.status, tone: "muted" as const };

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <PanelHeader
          title={`Inscrição ${reg.code}`}
          description={event?.title}
          right={<Badge tone={rs.tone}>{rs.label}</Badge>}
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <div>
            <p className="text-xs uppercase text-app-muted-foreground">Participante</p>
            <p className="font-semibold">{participant?.name.value}</p>
            <p className="text-xs text-app-muted-foreground">{participant?.email.value}</p>
            {participant?.phone && <p className="text-xs text-app-muted-foreground">{participant.phone.value}</p>}
          </div>
          <div>
            <p className="text-xs uppercase text-app-muted-foreground">Valores</p>
            <p className="text-sm">Lote: <span className="font-mono">{reg.lotId ?? "—"}</span></p>
            <p className="text-sm">Valor do lote: {formatCurrency(reg.contractedPrice.cents)}</p>
            <p className="text-sm">Desconto: {formatCurrency(reg.discountAmount.cents)}</p>
            <p className="text-lg font-bold text-app-primary">Total: {formatCurrency(reg.finalPrice.cents)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs uppercase text-app-muted-foreground">Datas</p>
            <p className="text-xs">Reserva expira: {reg.reservationExpiresAt ? formatDateTime(reg.reservationExpiresAt) : "—"}</p>
            <p className="text-xs">Confirmada em: {reg.confirmedAt ? formatDateTime(reg.confirmedAt) : "—"}</p>
            <p className="text-xs">Cancelada em: {(reg as any).props.canceledAt ? formatDateTime((reg as any).props.canceledAt) : "—"}</p>
          </div>
          {reg.status === "CONFIRMADA" && (reg as any).props.credentialQrPayload && (
            <div className="sm:col-span-2 rounded-app-md border border-app-primary/30 bg-app-primary/5 p-4">
              <p className="text-sm font-semibold">Credencial / QR Code</p>
              <p className="mt-2 font-mono text-xs break-all">{(reg as any).props.credentialQrPayload}</p>
            </div>
          )}
          <div className="sm:col-span-2 flex gap-2 border-t border-app-border pt-4">
            {reg.status === "AGUARDANDO_PAGAMENTO" && (
              <Link href={`/inscricoes/${id}/pagamento`} className="inline-flex h-10 items-center rounded-app-md bg-app-primary px-4 text-sm font-semibold text-white hover:brightness-110">
                Ir para pagamento
              </Link>
            )}
            <Link href={event ? `/eventos/${event.id}` : "#"} className={btnSecondary}>Voltar para evento</Link>
          </div>
          {payment && (
            <div className="sm:col-span-2 rounded-app-md border border-app-border bg-app-surface-elevated/40 p-3 text-xs">
              <p>Pagamento: status <strong>{payment.status}</strong> • gateway <span className="font-mono">{payment.gatewayOrderId ?? "—"}</span></p>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
