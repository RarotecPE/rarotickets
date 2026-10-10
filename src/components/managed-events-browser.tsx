"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CalendarPlus, Search, Tickets } from "lucide-react";
import { ticketingApi } from "@/client/services/ticketing-api.service";
import { useAuth } from "@/components/auth-provider";
import {
  Badge,
  Button,
  Empty,
  Field,
  InlineAlert,
  Panel,
  PanelHeader,
  Spinner,
  inputCls,
} from "@/components/ui";
import type { EventReadModel } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import { formatCurrency, formatDate } from "@/lib/utils";

export function ManagedEventsBrowser() {
  const auth = useAuth();
  const [events, setEvents] = useState<EventReadModel[]>([]);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const canWrite = Boolean(auth.session?.permissions.includes("events:write"));

  useEffect(() => {
    let active = true;
    async function loadEvents(): Promise<void> {
      try {
        const result = await ticketingApi.listManagedEvents({
          query: submittedQuery || undefined,
        });
        if (active) setEvents(result);
      } catch (caught) {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : "Não foi possível carregar seus eventos.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadEvents();
    return () => {
      active = false;
    };
  }, [submittedQuery, reloadVersion]);

  function submitSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSubmittedQuery(query.trim());
    setReloadVersion((current) => current + 1);
  }

  function retry(): void {
    setLoading(true);
    setError(null);
    setReloadVersion((current) => current + 1);
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <PanelHeader
          title="Eventos"
          description="Crie eventos e acompanhe inscrições, lotes e capacidade."
          right={
            canWrite ? (
              <Link
                href="/painel/eventos/novo"
                className="inline-flex h-10 items-center gap-2 rounded-app-md bg-app-primary px-4 text-sm font-semibold text-white hover:brightness-110"
              >
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                Novo evento
              </Link>
            ) : undefined
          }
        />
        <div className="p-4 sm:p-5">
          <form
            onSubmit={submitSearch}
            className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <Field label="Buscar evento" htmlFor="managed-event-query">
              <input
                id="managed-event-query"
                value={query}
                onChange={(change) => setQuery(change.target.value)}
                placeholder="Nome do evento"
                className={inputCls}
              />
            </Field>
            <Button type="submit">
              <Search className="h-4 w-4" aria-hidden="true" />
              Buscar
            </Button>
          </form>
        </div>
      </Panel>
      {error ? (
        <InlineAlert
          tone="danger"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          {error}
          <Button compact variant="secondary" onClick={retry}>
            Tentar novamente
          </Button>
        </InlineAlert>
      ) : null}
      {loading ? (
        <Panel>
          <div className="p-5">
            <Spinner label="Carregando eventos…" />
          </div>
        </Panel>
      ) : error ? null : events.length ? (
        <EventsTable events={events} canWrite={canWrite} />
      ) : (
        <Panel>
          <div className="p-4 sm:p-5">
            <Empty
              title="Nenhum evento encontrado"
              description={
                canWrite
                  ? "Crie seu primeiro evento ou ajuste a busca."
                  : "Não há eventos disponíveis para os filtros atuais."
              }
              action={
                canWrite ? (
                  <Link
                    href="/painel/eventos/novo"
                    className="inline-flex h-10 items-center rounded-app-md bg-app-primary px-4 text-sm font-semibold text-white"
                  >
                    Criar evento
                  </Link>
                ) : undefined
              }
            />
          </div>
        </Panel>
      )}
    </div>
  );
}

export type EventsTableProps = {
  events: EventReadModel[];
  canWrite?: boolean;
};
function EventsTable({ events, canWrite }: EventsTableProps) {
  return (
    <Panel>
      <PanelHeader
        title="Lista de eventos"
        description={`${events.length} evento${events.length === 1 ? "" : "s"}`}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <caption className="sr-only">
            Eventos gerenciados no RaroTickets
          </caption>
          <thead>
            <tr className="border-b border-app-border">
              {[
                "Evento",
                "Situação",
                "Data",
                "Inscritos",
                "Valor inicial",
                "Ações",
              ].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-app-muted-foreground sm:px-5"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <EventTableRow
                key={event.id}
                event={event}
                canWrite={canWrite}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export type EventTableRowProps = {
  event: EventReadModel;
  canWrite?: boolean;
};
function EventTableRow({ event, canWrite }: EventTableRowProps) {
  const registered = event.capacity.confirmed + event.capacity.reserved;
  const price =
    event.props.chargeType === "gratuito"
      ? "Gratuito"
      : event.lots
          .filter((lot) => lot.active)
          .reduce<
            number | null
          >((lowest, lot) => (lowest === null ? lot.priceCents : Math.min(lowest, lot.priceCents)), null);
  return (
    <tr className="border-b border-app-border last:border-0 hover:bg-app-surface-elevated/40">
      <td className="px-4 py-3 sm:px-5">
        <Link
          href={`/painel/eventos/${event.id}`}
          className="font-semibold text-app-foreground hover:text-app-primary hover:underline"
        >
          {event.props.title}
        </Link>
        <p className="mt-0.5 text-xs text-app-muted-foreground">
          /{event.props.slug} ·{" "}
          {event.props.modality === "online" ? "Online" : "Presencial"}
        </p>
      </td>
      <td className="px-4 py-3 sm:px-5">
        <EventStatusBadge status={event.props.status} />
      </td>
      <td className="px-4 py-3 text-xs text-app-muted-foreground sm:px-5">
        {formatDate({ value: event.props.startAt, withTime: true })}
      </td>
      <td className="px-4 py-3 text-xs tabular-nums text-app-muted-foreground sm:px-5">
        <span className="inline-flex items-center gap-1.5">
          <Tickets className="h-3.5 w-3.5" aria-hidden="true" />
          {registered}/{event.props.maxCapacity}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-app-muted-foreground sm:px-5">
        {typeof price === "number"
          ? formatCurrency({ cents: price })
          : (price ?? "—")}
      </td>
      <td className="px-4 py-3 text-right sm:px-5">
        <div className="flex items-center justify-end gap-3">
          {event.props.status !== "finalizado" && canWrite ? (
            <Link
              href={`/painel/eventos/${event.id}/editar`}
              className="text-xs font-semibold text-app-foreground hover:text-app-primary hover:underline"
            >
              Editar
            </Link>
          ) : null}
          <Link
            href={`/painel/eventos/${event.id}`}
            className="text-xs font-semibold text-app-primary hover:underline"
          >
            Abrir
          </Link>
        </div>
      </td>
    </tr>
  );
}

export type EventStatusBadgeProps = { status: string };
export function EventStatusBadge({ status }: EventStatusBadgeProps) {
  const statusLabels: Record<string, string> = {
    rascunho: "Rascunho",
    agendado: "Agendado",
    inscricoes_abertas: "Inscrições abertas",
    inscricoes_encerradas: "Encerradas",
    em_andamento: "Em andamento",
    finalizado: "Finalizado",
    cancelado: "Cancelado",
  };
  const tone =
    status === "inscricoes_abertas" || status === "finalizado"
      ? "success"
      : status === "cancelado"
        ? "danger"
        : status === "rascunho"
          ? "muted"
          : "warning";
  return <Badge tone={tone}>{statusLabels[status] ?? status}</Badge>;
}
