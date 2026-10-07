import Link from "next/link";
import { redirect } from "next/navigation";
import { Panel, PanelHeader, Badge, btnPrimary, btnSecondary, btnXs, Field, inputCls, Stat, Empty } from "@/components/ui";
import { EventRepo, LotRepo, RegistrationRepo } from "@/server/db/repositories";
import { EVENT_STATUS_LABELS, MODALITY_LABELS, REGISTRATION_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/shared/utils/format";
import { getSession } from "@/server/session/session.service";

export const dynamic = "force-dynamic";

async function publishEvent(id: string) {
  "use server";
  await fetch(`${process.env.APP_BASE_URL || "http://localhost:3000"}/api/events/${id}/publish`, { method: "POST" });
  redirect(`/eventos/${id}`);
}

async function createLot(id: string, formData: FormData) {
  "use server";
  await fetch(`${process.env.APP_BASE_URL || "http://localhost:3000"}/api/events/${id}/lots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: formData.get("name"),
      priceCents: Math.round(Number(formData.get("price")) * 100),
      startsAt: formData.get("startsAt"),
      endsAt: formData.get("endsAt"),
      totalSpots: Number(formData.get("totalSpots")),
    }),
  });
  redirect(`/eventos/${id}`);
}

export default async function EventoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login");
  const { id } = await params;

  // Fetch via server-side repo (passando por auto-avaliação)
  const res = await fetch(`${process.env.APP_BASE_URL || "http://localhost:3000"}/api/events/${id}`, { cache: "no-store" });
  if (!res.ok) redirect("/eventos");
  const event = (await res.json()).data;

  const regsResp = await fetch(`${process.env.APP_BASE_URL || "http://localhost:3000"}/api/registrations?eventId=${id}`, { cache: "no-store" });
  const registrations = regsResp.ok ? (await regsResp.json()).data : [];

  const canPublish = event.status === "RASCUNHO" || event.status === "AGENDADO";

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <PanelHeader
          title={event.title}
          description={`${MODALITY_LABELS[event.modality]} • ${formatDate(event.startsAt)} → ${formatDate(event.endsAt)}`}
          right={
            <div className="flex gap-2">
              {canPublish && (
                <form action={publishEvent.bind(null, id)}>
                  <button type="submit" className={btnPrimary}>Publicar evento</button>
                </form>
              )}
              <Badge tone={EVENT_STATUS_LABELS[event.status].tone}>{EVENT_STATUS_LABELS[event.status].label}</Badge>
            </div>
          }
        />
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Capacidade" value={event.capacity} />
            <Stat label="Confirmadas" value={event.stats.confirmed} tone="success" />
            <Stat label="Reservas ativas" value={event.stats.reserved} tone="warning" />
            <Stat label="Vagas restantes" value={event.stats.available} tone={event.stats.available > 0 ? "primary" : "danger"} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-app-muted-foreground">Descrição</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{event.description}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-app-muted-foreground">Local / Link</p>
              <p className="mt-1 text-sm">
                {event.modality === "PRESENCIAL"
                  ? `${event.address || ""} — ${event.city || ""}/${event.state || ""}`
                  : event.streamUrl || "(a ser exibido para inscritos confirmados)"}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-app-muted-foreground">
              Link público de inscrição:{" "}
              <Link className="text-app-primary hover:underline" href={`/inscricoes/novo?eventId=${id}`}>
                /inscricoes/novo?eventId={id}
              </Link>
            </p>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Lotes" description="Crie e gerencie lotes com preços e períodos" />
        {event.financialType === "GRATUITO" ? (
          <div className="p-5"><Empty title="Evento gratuito" description="Não é necessário configurar lotes." /></div>
        ) : (
          <div className="space-y-4 p-4 sm:p-5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="border-b border-app-border">
                    {["Nome", "Valor", "Vigência", "Vagas", "Status"].map((h) => (
                      <th key={h} className="px-2 py-2 text-xs font-semibold uppercase text-app-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {event.lots.length === 0 ? (
                    <tr><td colSpan={5} className="p-3 text-sm text-app-muted-foreground">Nenhum lote cadastrado.</td></tr>
                  ) : event.lots.map((l: any) => (
                    <tr key={l.id} className="border-b border-app-border last:border-0">
                      <td className="px-2 py-3 text-sm font-semibold">{l.name}</td>
                      <td className="px-2 py-3 text-sm tabular-nums">{formatCurrency(l.priceCents)}</td>
                      <td className="px-2 py-3 text-xs text-app-muted-foreground">
                        {formatDate(l.startsAt)} → {formatDate(l.endsAt)}
                      </td>
                      <td className="px-2 py-3 text-xs tabular-nums text-app-muted-foreground">
                        {l.spotsTaken}/{l.totalSpots}
                      </td>
                      <td className="px-2 py-3">
                        <Badge tone={l.isAvailableNow ? "success" : "muted"}>{l.active ? (l.isAvailableNow ? "Ativo" : "Futuro/Encerrado") : "Inativo"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form action={createLot.bind(null, id)} className="grid grid-cols-1 gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/40 p-4 sm:grid-cols-5">
              <Field label="Nome"><input name="name" required className={inputCls} placeholder="1º lote" /></Field>
              <Field label="Preço (R$)"><input name="price" type="number" step="0.01" min={0} required className={inputCls} defaultValue={0} /></Field>
              <Field label="Início"><input name="startsAt" type="datetime-local" required className={inputCls} /></Field>
              <Field label="Término"><input name="endsAt" type="datetime-local" required className={inputCls} /></Field>
              <Field label="Vagas"><input name="totalSpots" type="number" min={1} required className={inputCls} defaultValue={event.capacity} /></Field>
              <div className="sm:col-span-5 flex justify-end">
                <button type="submit" className={btnSecondary}>Adicionar lote</button>
              </div>
            </form>
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader title="Inscrições" description={`${registrations.length} registros`} />
        {registrations.length === 0 ? (
          <div className="p-5"><Empty title="Nenhuma inscrição" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-app-border">
                  {["Código", "Status", "Valor", "Reserva expira", "Confirmada em"].map((h) => (
                    <th key={h} className="px-4 py-2 text-xs font-semibold uppercase text-app-muted-foreground sm:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrations.map((r: any) => {
                  const s = REGISTRATION_STATUS_LABELS[r.status] ?? { label: r.status, tone: "muted" as const };
                  return (
                    <tr key={r.id} className="border-b border-app-border last:border-0 hover:bg-app-surface-elevated/50">
                      <td className="px-4 py-3 font-mono text-xs sm:px-5">
                        <Link href={`/inscricoes/${r.id}`} className="hover:text-app-primary hover:underline">{r.code}</Link>
                      </td>
                      <td className="px-4 py-3 sm:px-5"><Badge tone={s.tone}>{s.label}</Badge></td>
                      <td className="px-4 py-3 text-sm tabular-nums sm:px-5">{formatCurrency(r.finalPriceCents)}</td>
                      <td className="px-4 py-3 text-xs text-app-muted-foreground sm:px-5">{r.reservationExpiresAt ? formatDateTime(r.reservationExpiresAt) : "—"}</td>
                      <td className="px-4 py-3 text-xs text-app-muted-foreground sm:px-5">{r.confirmedAt ? formatDateTime(r.confirmedAt) : "—"}</td>
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
