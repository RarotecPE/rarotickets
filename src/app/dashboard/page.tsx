import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock, Wallet } from "lucide-react";
import { Panel, PanelHeader, Stat, Badge, Empty } from "@/components/ui";
import { EventRepo } from "@/server/db/repositories";
import { EVENT_STATUS_LABELS, MODALITY_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/shared/utils/format";
import { redirect } from "next/navigation";
import { getSession } from "@/server/session/session.service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const stats = await EventRepo.dashboardStats();
  const events = await EventRepo.list();
  for (const e of events) {
    const p = e.status;
    e.autoEvaluateByTime(new Date());
    if (p !== e.status) await EventRepo.update(e);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Eventos" value={stats.totalEvents} icon={<CalendarDays className="h-4 w-4" aria-hidden />} tone="primary" />
        <Stat label="Inscrições abertas" value={stats.openEvents} icon={<Clock className="h-4 w-4" aria-hidden />} tone="warning" />
        <Stat label="Confirmadas" value={stats.confirmedRegistrations} icon={<CheckCircle2 className="h-4 w-4" aria-hidden />} tone="success" />
        <Stat label="Receita liquidada" value={formatCurrency(stats.revenueCents)} icon={<Wallet className="h-4 w-4" aria-hidden />} />
      </div>

      <Panel>
        <PanelHeader
          title="Próximos eventos"
          description="Eventos cadastrados no sistema"
          right={
            <Link href="/eventos/novo" className="inline-flex h-9 items-center rounded-app-md bg-app-primary px-3 text-sm font-semibold text-white hover:brightness-110">
              + Novo evento
            </Link>
          }
        />
        {events.length === 0 ? (
          <div className="p-5"><Empty title="Nenhum evento cadastrado" description="Crie um evento para começar." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-app-border">
                  {["Evento", "Período", "Modalidade", "Status"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-app-muted-foreground sm:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 8).map((e) => {
                  const s = EVENT_STATUS_LABELS[e.status] ?? { label: e.status, tone: "muted" as const };
                  return (
                    <tr key={e.id.toString()} className="border-b border-app-border transition-colors last:border-0 hover:bg-app-surface-elevated/50">
                      <td className="px-4 py-3 sm:px-5">
                        <Link href={`/eventos/${e.id}`} className="font-semibold text-app-foreground hover:text-app-primary hover:underline">{e.title}</Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-app-muted-foreground sm:px-5">
                        {formatDate(e.dateRange.startsAt)} → {formatDate(e.dateRange.endsAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-app-muted-foreground sm:px-5">{MODALITY_LABELS[e.modality]}</td>
                      <td className="px-4 py-3 sm:px-5"><Badge tone={s.tone}>{s.label}</Badge></td>
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
