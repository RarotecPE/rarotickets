import Link from "next/link";
import { Panel, PanelHeader, btnPrimary, Badge } from "@/components/ui";
import { RegistrationRepo, PaymentRepo, EventRepo, ParticipantRepo } from "@/server/db/repositories";
import { formatCurrency, formatDateTime } from "@/shared/utils/format";
import { REGISTRATION_STATUS_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PagamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reg = await RegistrationRepo.findById(id);
  if (!reg) {
    return (
      <Panel><div className="p-5"><p className="text-app-danger">Inscrição não encontrada.</p></div></Panel>
    );
  }
  const event = await EventRepo.findById(reg.eventId);
  const participant = await ParticipantRepo.findById(reg.participantId);
  const payment = await PaymentRepo.findByRegistration(id);
  const statusMeta = REGISTRATION_STATUS_LABELS[reg.status];

  // Cria sessão de checkout se ainda não existir
  let checkoutData: any = null;
  if (reg.status === "AGUARDANDO_PAGAMENTO" && payment) {
    const r = await fetch(`${process.env.APP_BASE_URL || "http://localhost:3000"}/api/payments/${id}/checkout`, { method: "POST" });
    if (r.ok) checkoutData = await r.json();
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <PanelHeader
          title="Pagamento da inscrição"
          description={`Código: ${reg.code}`}
          right={<Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>}
        />
        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-app-muted-foreground">Participante</p>
              <p className="font-semibold">{participant?.name.value}</p>
              <p className="text-xs text-app-muted-foreground">{participant?.email.value}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-app-muted-foreground">Evento</p>
              <p className="font-semibold">{event?.title}</p>
            </div>
          </div>

          <div className="rounded-app-md border border-app-border bg-app-surface-elevated/40 p-4">
            <p className="text-xs uppercase text-app-muted-foreground">Valor a pagar</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-app-primary">{formatCurrency(reg.finalPrice.cents)}</p>
            {reg.reservationExpiresAt && (
              <p className="mt-2 text-xs text-app-warning">
                Sua reserva expira em {formatDateTime(reg.reservationExpiresAt)}. Após esse prazo a vaga é liberada.
              </p>
            )}
          </div>

          {checkoutData?.data && (
            <div className="space-y-3">
              <p className="text-sm text-app-muted-foreground">
                Clique no botão abaixo para abrir o checkout seguro do PagBank (ou simulação no modo desenvolvimento):
              </p>
              <div className="flex flex-wrap gap-2">
                <a href={checkoutData.data.checkoutUrl} className={btnPrimary}>
                  Pagar com PagBank
                </a>
                <Link href={`/inscricoes/${id}`} className="inline-flex h-10 items-center rounded-app-md border border-app-border px-4 text-sm font-semibold text-app-foreground hover:bg-app-surface-elevated">
                  Ver inscrição
                </Link>
              </div>
              {checkoutData.data.sandbox && (
                <p className="text-xs text-app-muted-foreground">
                  Ambiente de sandbox: clicar no botão simulará a confirmação automática do pagamento para fins de teste.
                </p>
              )}
            </div>
          )}

          {reg.status === "CONFIRMADA" && (
            <div className="rounded-app-md border border-app-success/30 bg-app-success/10 p-3 text-sm text-app-success">
              Pagamento já confirmado! Sua credencial está disponível.
            </div>
          )}
          {reg.status === "CANCELADA" && (
            <div className="rounded-app-md border border-app-danger/30 bg-app-danger/10 p-3 text-sm text-app-danger">
              Esta inscrição foi cancelada.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
