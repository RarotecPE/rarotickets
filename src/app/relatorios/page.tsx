import { Panel, PanelHeader, Stat } from "@/components/ui";
import { EventRepo } from "@/server/db/repositories";
import { formatCurrency } from "@/shared/utils/format";
import { redirect } from "next/navigation";
import { getSession } from "@/server/session/session.service";
import { CalendarDays, CheckCircle2, Clock, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  const stats = await EventRepo.dashboardStats();
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Eventos cadastrados" value={stats.totalEvents} icon={<CalendarDays className="h-4 w-4" />} tone="primary" />
        <Stat label="Inscrições abertas" value={stats.openEvents} icon={<Clock className="h-4 w-4" />} tone="warning" />
        <Stat label="Confirmadas" value={stats.confirmedRegistrations} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
        <Stat label="Receita liquidada" value={formatCurrency(stats.revenueCents)} icon={<Wallet className="h-4 w-4" />} />
      </div>
      <Panel>
        <PanelHeader title="Indicadores operacionais" description="Resumo consolidado do sistema" />
        <div className="p-4 sm:p-5">
          <p className="text-sm text-app-muted-foreground">
            Taxa de comparecimento e segmentação por lote/município serão calculados a partir dos dados de check-in
            assim que o evento for finalizado. Esta página é atualizada em tempo real.
          </p>
        </div>
      </Panel>
    </div>
  );
}
