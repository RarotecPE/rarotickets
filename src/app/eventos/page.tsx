import Link from "next/link";
import { Panel, PanelHeader, Badge, Empty } from "@/components/ui";
import { EventRepo } from "@/server/db/repositories";
import { EVENT_STATUS_LABELS, MODALITY_LABELS } from "@/lib/constants";
import { formatDate } from "@/shared/utils/format";
import { redirect } from "next/navigation";
import { getSession } from "@/server/session/session.service";

export const dynamic = "force-dynamic";

export default async function EventosPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  const events = await EventRepo.list();
  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <PanelHeader
          title="Eventos"
          description="Gerencie eventos, lotes e inscrições"
          right={
            <Link href="/eventos/novo" className="inline-flex h-9 items-center rounded-app-md bg-app-primary px-3 text-sm font-semibold text-white hover:brightness-110">
              + Novo evento
            </Link>
          }
        />
        {events.length === 0 ? (
          <div className="p-5"><Empty title="Nenhum evento" description="Comece criando seu primeiro evento." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-app-border">
                  {["Título", "Período", "Modalidade", "Status", "Capacidade"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-app-muted-foreground sm:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const s = EVENT_STATUS_LABELS[e.status] ?? { label: e.status, tone: "muted" as const };
                  return (
                    <tr key={e.id.toString()} className="border-b border-app-border last:border-0 hover:bg-app-surface-elevated/50">
                      <td className="px-4 py-3 sm:px-5">
                        <Link href={`/eventos/${e.id}`} className="font-semibold hover:text-app-primary hover:underline">{e.title}</Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-app-muted-foreground sm:px-5">{formatDate(e.dateRange.startsAt)} → {formatDate(e.dateRange.endsAt)}</td>
                      <td className="px-4 py-3 text-sm text-app-muted-foreground sm:px-5">{MODALITY_LABELS[e.modality]}</td>
                      <td className="px-4 py-3 sm:px-5"><Badge tone={s.tone}>{s.label}</Badge></td>
                      <td className="px-4 py-3 text-sm tabular-nums text-app-muted-foreground sm:px-5">{e.capacity}</td>
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
