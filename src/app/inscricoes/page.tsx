import { redirect } from "next/navigation";
import Link from "next/link";
import { Panel, PanelHeader, Badge, Empty } from "@/components/ui";
import { RegistrationRepo, EventRepo, ParticipantRepo } from "@/server/db/repositories";
import { REGISTRATION_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/shared/utils/format";
import { getSession } from "@/server/session/session.service";

export const dynamic = "force-dynamic";

export default async function InscricoesPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login");
  const { eventId } = await searchParams;
  const events = await EventRepo.list();
  const registrations = eventId ? await RegistrationRepo.listByEvent(eventId) : [];

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <PanelHeader title="Inscrições" description="Filtrar por evento" />
        <div className="flex flex-wrap gap-2 p-4 sm:p-5">
          <Link href="/inscricoes" className={`rounded-app-pill border px-3 py-1 text-xs ${!eventId ? "border-app-primary bg-app-primary/15 text-app-primary" : "border-app-border"}`}>Todos</Link>
          {events.map((e) => (
            <Link key={e.id.toString()} href={`/inscricoes?eventId=${e.id}`}
              className={`rounded-app-pill border px-3 py-1 text-xs ${eventId === e.id.toString() ? "border-app-primary bg-app-primary/15 text-app-primary" : "border-app-border text-app-muted-foreground hover:bg-app-surface-elevated"}`}>
              {e.title}
            </Link>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title={eventId ? "Inscritos no evento" : "Selecione um evento"} />
        {!eventId ? (
          <div className="p-5"><Empty title="Escolha um evento para ver as inscrições" /></div>
        ) : registrations.length === 0 ? (
          <div className="p-5"><Empty title="Nenhuma inscrição" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-app-border">
                  {["Código", "Participante", "Status", "Valor", "Reserva", "Ações"].map((h) => (
                    <th key={h} className="px-4 py-2 text-xs font-semibold uppercase text-app-muted-foreground sm:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => {
                  const s = REGISTRATION_STATUS_LABELS[r.status] ?? { label: r.status, tone: "muted" as const };
                  return (
                    <tr key={r.id.toString()} className="border-b border-app-border last:border-0 hover:bg-app-surface-elevated/50">
                      <td className="px-4 py-3 font-mono text-xs sm:px-5">{r.code}</td>
                      <td className="px-4 py-3 text-xs sm:px-5">
                        <ParticipantCell id={r.participantId} />
                      </td>
                      <td className="px-4 py-3 sm:px-5"><Badge tone={s.tone}>{s.label}</Badge></td>
                      <td className="px-4 py-3 text-sm tabular-nums sm:px-5">{formatCurrency(r.finalPrice.cents)}</td>
                      <td className="px-4 py-3 text-xs text-app-muted-foreground sm:px-5">
                        {r.reservationExpiresAt ? formatDateTime(r.reservationExpiresAt) : "—"}
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <Link href={`/inscricoes/${r.id}`} className="text-xs text-app-primary hover:underline">Detalhes</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

async function ParticipantCell({ id }: { id: string }) {
  const p = await ParticipantRepo.findById(id);
  return <span>{p?.name.value ?? "—"}</span>;
}
