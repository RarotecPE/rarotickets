import Link from "next/link";
import { Panel, PanelHeader, Field, btnPrimary, inputCls, textareaCls, InlineAlert } from "@/components/ui";
import { EventRepo, LotRepo } from "@/server/db/repositories";
import { formatCurrency, formatDate } from "@/shared/utils/format";
import { MODALITY_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

async function submitRegistration(formData: FormData) {
  "use server";
  const body = Object.fromEntries(formData.entries());
  const res = await fetch(`${process.env.APP_BASE_URL || "http://localhost:3000"}/api/registrations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId: body.eventId,
      name: body.name,
      email: body.email,
      documentKind: body.documentKind,
      document: body.document,
      phone: body.phone,
      company: body.company,
      participantRole: body.participantRole,
      couponCode: body.couponCode || null,
      answers: [],
      consentTerms: body.consentTerms === "on",
      consentMarketing: body.consentMarketing === "on",
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Erro ao criar inscrição");
  }
  const data = await res.json();
  const id = data.data.id;
  if (data.data.status === "AGUARDANDO_PAGAMENTO") {
    // Redireciona para a página de pagamento
    const h = (await import("next/headers")) as any;
    h.redirect(`/inscricoes/${id}/pagamento`);
  } else if (data.data.status === "CONFIRMADA") {
    const h = (await import("next/headers")) as any;
    h.redirect(`/inscricoes/${id}/sucesso`);
  } else {
    const h = (await import("next/headers")) as any;
    h.redirect(`/inscricoes/${id}/sucesso?waitlist=1`);
  }
}

export default async function NovaInscricaoPage({ searchParams }: { searchParams: Promise<{ eventId?: string; error?: string }> }) {
  const { eventId } = await searchParams;
  if (!eventId) {
    return (
      <div className="flex flex-col gap-5">
        <Panel>
          <PanelHeader title="Inscrever-se" description="Escolha um evento" />
          <div className="p-5">
            <EventList />
          </div>
        </Panel>
      </div>
    );
  }

  const event = await EventRepo.findById(eventId);
  if (!event) {
    return (
      <div className="flex flex-col gap-5"><Panel><div className="p-5"><InlineAlert tone="danger">Evento não encontrado.</InlineAlert></div></Panel></div>
    );
  }
  event.autoEvaluateByTime(new Date());
  const lot = event.financialType === "PAGO" ? await LotRepo.findCurrentForEvent(eventId) : null;

  return (
    <div className="flex flex-col gap-5">
      <Link href="/inscricoes/novo" className="text-xs text-app-muted-foreground hover:text-app-primary">← Voltar para eventos</Link>
      <Panel>
        <PanelHeader title={event.title} description={`${MODALITY_LABELS[event.modality]} • ${formatDate(event.dateRange.startsAt)} → ${formatDate(event.dateRange.endsAt)}`} />
        <div className="p-4 sm:p-5">
          {event.status !== "INSCRICOES_ABERTAS" ? (
            <InlineAlert tone="warning">Inscrições não estão abertas no momento.</InlineAlert>
          ) : (
            <form action={submitRegistration} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <input type="hidden" name="eventId" value={eventId} />
              <Field label="Nome completo" className="sm:col-span-2">
                <input name="name" required className={inputCls} />
              </Field>
              <Field label="E-mail">
                <input name="email" type="email" required className={inputCls} />
              </Field>
              <Field label="Telefone">
                <input name="phone" className={inputCls} placeholder="(11) 99999-9999" />
              </Field>
              <Field label="Tipo de documento">
                <select name="documentKind" required className={inputCls}>
                  <option value="CPF">CPF</option>
                  <option value="PASSAPORTE">Passaporte</option>
                </select>
              </Field>
              <Field label="Número do documento">
                <input name="document" required className={inputCls} placeholder="000.000.000-00" />
              </Field>
              <Field label="Empresa/Órgão">
                <input name="company" className={inputCls} />
              </Field>
              <Field label="Cargo/Função">
                <input name="participantRole" className={inputCls} />
              </Field>
              <Field label="Cupom de desconto (opcional)" className="sm:col-span-2">
                <input name="couponCode" className={inputCls} placeholder="Digite o código" />
              </Field>
              {event.financialType === "PAGO" && lot && (
                <div className="sm:col-span-2 rounded-app-md border border-app-border bg-app-surface-elevated/40 p-3 text-sm">
                  <p className="text-app-muted-foreground">Lote atual: <strong className="text-app-foreground">{lot.name}</strong></p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-app-primary">{formatCurrency(lot.price.cents)}</p>
                </div>
              )}
              <label className="flex items-start gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="consentTerms" required className="mt-1" />
                <span>Li e concordo com os Termos de Uso e Política de Privacidade.</span>
              </label>
              <label className="flex items-start gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="consentMarketing" className="mt-1" />
                <span className="text-app-muted-foreground">Desejo receber comunicações de marketing (opcional).</span>
              </label>
              <div className="sm:col-span-2 flex justify-end border-t border-app-border pt-4">
                <button type="submit" className={btnPrimary}>
                  {event.financialType === "PAGO" && lot ? "Ir para pagamento" : "Confirmar inscrição"}
                </button>
              </div>
            </form>
          )}
        </div>
      </Panel>
    </div>
  );
}

async function EventList() {
  const events = await EventRepo.findPublicOpen();
  if (events.length === 0) {
    return <p className="text-sm text-app-muted-foreground">Nenhum evento com inscrições abertas no momento.</p>;
  }
  return (
    <div className="space-y-3">
      {events.map((e) => (
        <Link key={e.id.toString()} href={`/inscricoes/novo?eventId=${e.id}`}
          className="block rounded-app-md border border-app-border p-4 hover:bg-app-surface-elevated/40">
          <p className="font-semibold">{e.title}</p>
          <p className="text-xs text-app-muted-foreground">{formatDate(e.dateRange.startsAt)} → {formatDate(e.dateRange.endsAt)}</p>
        </Link>
      ))}
    </div>
  );
}
