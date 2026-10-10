"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Ban,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { ticketingApi } from "@/client/services/ticketing-api.service";
import { useAuth } from "@/components/auth-provider";
import { Dialog } from "@/components/dialog";
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
  textareaCls,
} from "@/components/ui";
import type { Tone } from "@/lib/constants";
import type { EventReadModel } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import type {
  RegistrationListItem,
  RegistrationListResult,
} from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const PAGE_SIZE = 20;
type RegistrationFilters = {
  eventIds: string[];
  query: string;
  status: string;
};

const STATUS_FILTER_OPTIONS: Array<{
  value: string;
  label: string;
  tone: Tone;
}> = [
  { value: "", label: "Todos", tone: "muted" },
  { value: "confirmada", label: "Confirmada", tone: "success" },
  {
    value: "aguardando_pagamento",
    label: "Aguardando pagamento",
    tone: "warning",
  },
  { value: "pendente", label: "Pendente", tone: "warning" },
  { value: "lista_espera", label: "Lista de espera", tone: "primary" },
  { value: "cancelada", label: "Cancelada", tone: "danger" },
];

export function RegistrationsBrowser() {
  const auth = useAuth();
  const [events, setEvents] = useState<EventReadModel[]>([]);
  const [result, setResult] = useState<RegistrationListResult>({
    items: [],
    total: 0,
  });
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);
  const eventDropdownRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [filters, setFilters] = useState<RegistrationFilters>({
    eventIds: [],
    query: "",
    status: "",
  });
  const [page, setPage] = useState(1);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<RegistrationListItem | null>(
    null,
  );
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const canCancel = Boolean(
    auth.session?.permissions.includes("registrations:cancel"),
  );
  const pageCount = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  useEffect(() => {
    let active = true;
    async function loadEvents(): Promise<void> {
      try {
        const eventList = await ticketingApi.listManagedEvents();
        if (active) setEvents(eventList);
      } catch {
        // Caso o perfil não possua events:read ou ocorra falha, mantém a lista vazia.
      }
    }
    void loadEvents();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!eventDropdownOpen) return;
    function handlePointerDown(mouseEvent: MouseEvent): void {
      if (
        eventDropdownRef.current &&
        !eventDropdownRef.current.contains(mouseEvent.target as Node)
      ) {
        setEventDropdownOpen(false);
      }
    }
    function handleKeyDown(keyEvent: KeyboardEvent): void {
      if (keyEvent.key === "Escape") {
        setEventDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [eventDropdownOpen]);

  useEffect(() => {
    let active = true;
    async function loadRegistrations(): Promise<void> {
      try {
        const data = await ticketingApi.listRegistrations({
          eventIds: filters.eventIds.length ? filters.eventIds : undefined,
          query: filters.query || undefined,
          status: filters.status || undefined,
          page,
          pageSize: PAGE_SIZE,
        });
        if (active) setResult(data);
      } catch (caught) {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : "Não foi possível carregar as inscrições.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadRegistrations();
    return () => {
      active = false;
    };
  }, [filters, page, reloadVersion]);

  function submitSearch(formEvent: FormEvent<HTMLFormElement>): void {
    formEvent.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    setPage(1);
    setFilters({ eventIds, query: query.trim(), status });
    setReloadVersion((current) => current + 1);
  }

  function applyEventFilters(nextEventIds: string[]): void {
    setEventIds(nextEventIds);
    setError(null);
    setNotice(null);
    setLoading(true);
    setPage(1);
    setFilters({ eventIds: nextEventIds, query: query.trim(), status });
    setReloadVersion((current) => current + 1);
  }

  function toggleEventFilter(targetEventId: string): void {
    const nextEventIds = eventIds.includes(targetEventId)
      ? eventIds.filter((id) => id !== targetEventId)
      : [...eventIds, targetEventId];
    applyEventFilters(nextEventIds);
  }

  function clearEventFilters(): void {
    if (eventIds.length === 0) return;
    applyEventFilters([]);
  }

  function selectStatusFilter(nextValue: string): void {
    const resolvedStatus =
      status === nextValue && nextValue !== "" ? "" : nextValue;
    if (resolvedStatus === status && filters.status === resolvedStatus) return;
    setStatus(resolvedStatus);
    setError(null);
    setNotice(null);
    setLoading(true);
    setPage(1);
    setFilters({ eventIds, query: query.trim(), status: resolvedStatus });
    setReloadVersion((current) => current + 1);
  }

  function retry(): void {
    setError(null);
    setLoading(true);
    setReloadVersion((current) => current + 1);
  }

  const closeCancelDialog = useCallback(() => {
    if (cancelling) return;
    setCancelTarget(null);
    setCancelReason("");
    setCancelError(null);
  }, [cancelling]);

  async function confirmCancellation(
    formEvent: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    formEvent.preventDefault();
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      setCancelError("Informe o motivo do cancelamento.");
      return;
    }
    setCancelling(true);
    setCancelError(null);
    try {
      await ticketingApi.cancelRegistration({
        registrationId: cancelTarget.id,
        reason: cancelReason.trim(),
      });
      setNotice(`Inscrição ${cancelTarget.code} cancelada.`);
      setCancelTarget(null);
      setCancelReason("");
      setLoading(true);
      setReloadVersion((current) => current + 1);
    } catch (caught) {
      setCancelError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível cancelar a inscrição.",
      );
    } finally {
      setCancelling(false);
    }
  }

  const selectedEventsLabel =
    eventIds.length === 0
      ? "Todos os eventos"
      : eventIds.length === 1
        ? (events.find((item) => item.id === eventIds[0])?.props.title ??
          "1 evento selecionado")
        : `${eventIds.length} eventos selecionados`;

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <PanelHeader
          title="Inscrições"
          description="Consulte participantes, pagamentos e credenciamento."
        />
        <div className="space-y-4 p-4 sm:p-5">
          <form
            onSubmit={submitSearch}
            className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,300px)_auto]"
          >
            <Field label="Buscar inscrição" htmlFor="registration-query">
              <input
                id="registration-query"
                value={query}
                onChange={(change) => setQuery(change.target.value)}
                className={inputCls}
                placeholder="Código, nome, e-mail ou CPF"
              />
            </Field>
            <Field label="Eventos" htmlFor="registration-events-trigger">
              <div ref={eventDropdownRef} className="relative">
                <button
                  id="registration-events-trigger"
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={eventDropdownOpen}
                  onClick={() => setEventDropdownOpen((open) => !open)}
                  className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-app-border bg-app-surface px-3 text-left text-sm text-app-foreground transition-colors hover:border-app-muted-foreground/40 focus:border-app-primary focus:outline-none focus:ring-2 focus:ring-app-ring/30"
                >
                  <span className="truncate">{selectedEventsLabel}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {eventIds.length > 0 ? (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-app-primary/15 px-1.5 text-xs font-semibold text-app-primary">
                        {eventIds.length}
                      </span>
                    ) : null}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-app-muted-foreground transition-transform",
                        eventDropdownOpen && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                  </span>
                </button>

                {eventDropdownOpen ? (
                  <div
                    role="listbox"
                    aria-label="Selecionar eventos"
                    aria-multiselectable="true"
                    className="absolute right-0 left-0 z-30 mt-1.5 max-h-72 overflow-y-auto rounded-md border border-app-border bg-app-surface p-1.5 shadow-lg"
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={eventIds.length === 0}
                      onClick={clearEventFilters}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                        eventIds.length === 0
                          ? "bg-app-primary/10 text-app-primary"
                          : "text-app-muted-foreground hover:bg-app-surface-2 hover:text-app-foreground",
                      )}
                    >
                      <span>Todos os eventos</span>
                      {eventIds.length > 0 ? (
                        <span className="text-[11px] underline">
                          Limpar ({eventIds.length})
                        </span>
                      ) : (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </button>

                    {events.length > 0 ? (
                      <div className="my-1 border-t border-app-border" />
                    ) : null}

                    {events.length === 0 ? (
                      <p className="px-2.5 py-2 text-xs text-app-muted-foreground">
                        Nenhum evento disponível.
                      </p>
                    ) : (
                      events.map((event) => {
                        const isChecked = eventIds.includes(event.id);
                        return (
                          <button
                            key={event.id}
                            type="button"
                            role="option"
                            aria-selected={isChecked}
                            onClick={() => toggleEventFilter(event.id)}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-sm transition-colors",
                              isChecked
                                ? "bg-app-primary/10 font-medium text-app-foreground"
                                : "text-app-foreground hover:bg-app-surface-2",
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                                isChecked
                                  ? "border-app-primary bg-app-primary text-white"
                                  : "border-app-border bg-app-surface",
                              )}
                              aria-hidden="true"
                            >
                              {isChecked ? (
                                <Check className="h-3 w-3 stroke-[2.5]" />
                              ) : null}
                            </span>
                            <span className="truncate">
                              {event.props.title}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </div>
            </Field>
            <Button type="submit">
              <Search className="h-4 w-4" aria-hidden="true" />
              Buscar
            </Button>
          </form>

          {eventIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-app-muted-foreground">
                Eventos filtrados:
              </span>
              {eventIds.map((selectedId) => {
                const matchedEvent = events.find(
                  (item) => item.id === selectedId,
                );
                return (
                  <button
                    key={selectedId}
                    type="button"
                    onClick={() => toggleEventFilter(selectedId)}
                    className="inline-flex items-center gap-1 rounded-md border border-app-primary/30 bg-app-primary/10 px-2 py-0.5 text-xs font-medium text-app-primary transition-colors hover:bg-app-primary/20"
                  >
                    <span className="max-w-[220px] truncate">
                      {matchedEvent?.props.title ?? selectedId}
                    </span>
                    <X className="h-3 w-3 shrink-0" aria-hidden="true" />
                  </button>
                );
              })}
              <button
                type="button"
                onClick={clearEventFilters}
                className="text-xs font-medium text-app-muted-foreground underline hover:text-app-foreground"
              >
                Limpar todos
              </button>
            </div>
          ) : null}

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-app-muted-foreground">
              Filtrar por status
            </span>
            <div
              role="radiogroup"
              aria-label="Filtrar inscrições por status"
              className="flex flex-wrap items-center gap-2"
            >
              {STATUS_FILTER_OPTIONS.map((option) => {
                const isSelected = status === option.value;
                return (
                  <button
                    key={option.value || "all"}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => selectStatusFilter(option.value)}
                    className={cn(
                      "rounded-app-pill transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary",
                      isSelected
                        ? "ring-2 ring-app-primary/40 ring-offset-1 ring-offset-app-surface"
                        : "opacity-75 hover:opacity-100",
                    )}
                  >
                    <Badge
                      tone={option.tone}
                      solid={isSelected}
                      className="cursor-pointer px-3 py-1 text-xs"
                    >
                      {option.label}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Panel>
      {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
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
            <Spinner label="Carregando inscrições…" />
          </div>
        </Panel>
      ) : error ? null : result.items.length ? (
        <RegistrationTable
          items={result.items}
          canCancel={canCancel}
          onCancel={setCancelTarget}
        />
      ) : (
        <Panel>
          <div className="p-4 sm:p-5">
            <Empty
              title="Nenhuma inscrição encontrada"
              description="Ajuste a busca ou os filtros para consultar outros registros."
            />
          </div>
        </Panel>
      )}
      {!loading && !error && result.total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-app-muted-foreground">
            {result.total} inscrição(ões) · Página {page} de {pageCount}
          </p>
          <nav
            className="flex items-center gap-2"
            aria-label="Paginação de inscrições"
          >
            <Button
              type="button"
              compact
              variant="secondary"
              disabled={page <= 1}
              onClick={() => {
                setLoading(true);
                setPage((current) => Math.max(1, current - 1));
              }}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Anterior
            </Button>
            <Button
              type="button"
              compact
              variant="secondary"
              disabled={page >= pageCount}
              onClick={() => {
                setLoading(true);
                setPage((current) => Math.min(pageCount, current + 1));
              }}
            >
              Próxima
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </nav>
        </div>
      ) : null}
      <Dialog
        open={Boolean(cancelTarget)}
        onClose={closeCancelDialog}
        title="Cancelar inscrição"
        description={
          cancelTarget
            ? `Confirme o cancelamento de ${cancelTarget.code}, de ${cancelTarget.participantName}.`
            : undefined
        }
      >
        <form
          onSubmit={(formEvent) => void confirmCancellation(formEvent)}
          className="flex flex-col gap-4"
        >
          <Field
            label="Motivo do cancelamento *"
            htmlFor="registration-cancel-reason"
            hint="O motivo será incluído na trilha de auditoria."
            error={cancelError ?? undefined}
          >
            <textarea
              id="registration-cancel-reason"
              value={cancelReason}
              onChange={(change) => setCancelReason(change.target.value)}
              maxLength={500}
              rows={4}
              className={textareaCls}
            />
          </Field>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={closeCancelDialog}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Voltar
            </Button>
            <Button type="submit" variant="danger" disabled={cancelling}>
              {cancelling ? (
                "Cancelando…"
              ) : (
                <>
                  <Ban className="h-4 w-4" aria-hidden="true" />
                  Confirmar cancelamento
                </>
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function RegistrationTable({
  items,
  canCancel,
  onCancel,
}: {
  items: RegistrationListItem[];
  canCancel: boolean;
  onCancel: (item: RegistrationListItem) => void;
}) {
  return (
    <Panel>
      <PanelHeader
        title="Registros"
        description={`${items.length} nesta página`}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <caption className="sr-only">Inscrições de eventos</caption>
          <thead>
            <tr className="border-b border-app-border">
              {[
                "Código",
                "Participante",
                "Evento",
                "Status",
                "Valor",
                "Data",
                "Check-in",
                ...(canCancel ? ["Ações"] : []),
              ].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-app-muted-foreground"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <RegistrationRow
                key={item.id}
                item={item}
                canCancel={canCancel}
                onCancel={onCancel}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function RegistrationRow({
  item,
  canCancel,
  onCancel,
}: {
  item: RegistrationListItem;
  canCancel: boolean;
  onCancel: (item: RegistrationListItem) => void;
}) {
  return (
    <tr className="border-b border-app-border last:border-0 hover:bg-app-surface-elevated/40">
      <td className="px-4 py-3 font-mono text-xs font-semibold text-app-primary">
        {item.code}
      </td>
      <td className="px-4 py-3">
        <p className="max-w-48 truncate text-sm font-semibold text-app-foreground">
          {item.participantName}
        </p>
        <p className="max-w-48 truncate text-xs text-app-muted-foreground">
          {item.participantEmail}
        </p>
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/painel/eventos/${item.eventId}`}
          className="max-w-48 text-xs font-medium text-app-foreground hover:text-app-primary hover:underline"
        >
          {item.eventTitle}
        </Link>
      </td>
      <td className="px-4 py-3">
        <RegistrationStatusBadge status={item.status} />
      </td>
      <td className="px-4 py-3 text-xs font-medium tabular-nums text-app-foreground">
        {formatCurrency({ cents: item.finalCents })}
      </td>
      <td className="px-4 py-3 text-xs text-app-muted-foreground">
        {formatDate({ value: item.createdAt, withTime: true })}
      </td>
      <td className="px-4 py-3 text-xs text-app-muted-foreground">
        {item.checkInAt ? (
          <span title={item.checkInBy ?? undefined}>
            {formatDate({ value: item.checkInAt, withTime: true })}
          </span>
        ) : (
          "—"
        )}
      </td>
      {canCancel ? (
        <td className="px-4 py-3">
          {item.status !== "cancelada" ? (
            <Button
              type="button"
              compact
              variant="secondary"
              aria-label={`Cancelar inscrição ${item.code}`}
              onClick={() => onCancel(item)}
            >
              <Ban className="h-3.5 w-3.5" aria-hidden="true" />
              Cancelar
            </Button>
          ) : (
            <span className="text-xs text-app-muted-foreground">—</span>
          )}
        </td>
      ) : null}
    </tr>
  );
}

export function RegistrationStatusBadge({ status }: { status: string }) {
  const configs: Record<
    string,
    {
      label: string;
      tone: "success" | "warning" | "danger" | "primary" | "muted";
    }
  > = {
    pendente: { label: "Pendente", tone: "warning" },
    aguardando_pagamento: { label: "Aguardando pagamento", tone: "warning" },
    confirmada: { label: "Confirmada", tone: "success" },
    lista_espera: { label: "Lista de espera", tone: "primary" },
    cancelada: { label: "Cancelada", tone: "danger" },
  };
  const config = configs[status] ?? { label: status, tone: "muted" as const };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
