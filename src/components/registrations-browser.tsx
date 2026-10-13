"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Award,
  Ban,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Eye,
  FileText,
  Search,
  User,
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
  btnSecondary,
  inputCls,
  textareaCls,
} from "@/components/ui";
import type { Tone } from "@/lib/constants";
import type { EventReadModel } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import type {
  RegistrationAnswerDetail,
  RegistrationListItem,
  RegistrationListResult,
} from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import { cn, formatCpf, formatCurrency, formatDate, formatPhone } from "@/lib/utils";

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
  const [detailTarget, setDetailTarget] = useState<RegistrationListItem | null>(
    null,
  );
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmPaymentTarget, setConfirmPaymentTarget] =
    useState<RegistrationListItem | null>(null);
  const [confirmPaymentError, setConfirmPaymentError] = useState<string | null>(
    null,
  );
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const canCancel = Boolean(
    auth.session?.permissions.includes("registrations:cancel"),
  );
  const canManage = Boolean(
    auth.session?.permissions.includes("registrations:manage"),
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

  async function confirmManualPayment(): Promise<void> {
    if (!confirmPaymentTarget) return;
    setConfirmingPayment(true);
    setConfirmPaymentError(null);
    try {
      await ticketingApi.confirmManualPayment({
        registrationId: confirmPaymentTarget.id,
      });
      setNotice(
        `Pagamento da inscrição ${confirmPaymentTarget.code} confirmado com sucesso. A inscrição agora está confirmada e a credencial foi enviada por e-mail.`,
      );
      setConfirmPaymentTarget(null);
      setDetailTarget(null);
      setLoading(true);
      setReloadVersion((current) => current + 1);
    } catch (caught) {
      setConfirmPaymentError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível confirmar o pagamento da inscrição.",
      );
    } finally {
      setConfirmingPayment(false);
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
          canManage={canManage}
          onSelectDetail={setDetailTarget}
          onCancel={setCancelTarget}
          onConfirmPayment={setConfirmPaymentTarget}
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

      <RegistrationDetailModal
        item={detailTarget}
        canCancel={canCancel}
        canManage={canManage}
        onClose={() => setDetailTarget(null)}
        onRequestCancel={(item) => {
          setDetailTarget(null);
          setCancelTarget(item);
        }}
        onRequestConfirmPayment={(item) => {
          setConfirmPaymentTarget(item);
        }}
      />

      <Dialog
        open={Boolean(confirmPaymentTarget)}
        onClose={() => {
          if (!confirmingPayment) {
            setConfirmPaymentTarget(null);
            setConfirmPaymentError(null);
          }
        }}
        title="Confirmar pagamento da inscrição"
        description={
          confirmPaymentTarget
            ? `Confirme o recebimento do pagamento da inscrição ${confirmPaymentTarget.code} (${confirmPaymentTarget.participantName}) no valor de ${formatCurrency({ cents: confirmPaymentTarget.finalCents })}.`
            : undefined
        }
      >
        <div className="flex flex-col gap-4">
          <InlineAlert tone="info">
            Ao confirmar, o status da inscrição passará para <strong>Confirmada</strong>, a vaga será garantida e a credencial com QR Code de acesso será emitida e enviada por e-mail para o participante.
          </InlineAlert>
          {confirmPaymentError ? (
            <InlineAlert tone="danger">{confirmPaymentError}</InlineAlert>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={confirmingPayment}
              onClick={() => {
                setConfirmPaymentTarget(null);
                setConfirmPaymentError(null);
              }}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={confirmingPayment}
              onClick={() => void confirmManualPayment()}
            >
              {confirmingPayment ? (
                "Confirmando…"
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Confirmar recebimento
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>

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
  canManage,
  onSelectDetail,
  onCancel,
  onConfirmPayment,
}: {
  items: RegistrationListItem[];
  canCancel: boolean;
  canManage: boolean;
  onSelectDetail: (item: RegistrationListItem) => void;
  onCancel: (item: RegistrationListItem) => void;
  onConfirmPayment: (item: RegistrationListItem) => void;
}) {
  return (
    <Panel>
      <PanelHeader
        title="Registros"
        description={`${items.length} nesta página`}
      />
      <div className="overflow-x-auto min-h-[320px]">
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
                "Ações",
              ].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className={cn(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-app-muted-foreground",
                    heading === "Ações" && "text-right",
                  )}
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
                canManage={canManage}
                onSelectDetail={onSelectDetail}
                onCancel={onCancel}
                onConfirmPayment={onConfirmPayment}
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
  canManage,
  onSelectDetail,
  onCancel,
  onConfirmPayment,
}: {
  item: RegistrationListItem;
  canCancel: boolean;
  canManage: boolean;
  onSelectDetail: (item: RegistrationListItem) => void;
  onCancel: (item: RegistrationListItem) => void;
  onConfirmPayment: (item: RegistrationListItem) => void;
}) {
  return (
    <tr className="border-b border-app-border last:border-0 hover:bg-app-surface-elevated/40">
      <td className="px-4 py-3 font-mono text-xs font-semibold">
        <button
          type="button"
          onClick={() => onSelectDetail(item)}
          className="cursor-pointer font-mono text-xs font-semibold text-app-primary underline-offset-2 hover:underline"
          title="Ver detalhes completos da inscrição"
        >
          {item.code}
        </button>
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
      <td className="px-4 py-3 text-right">
        <RegistrationActionsDropdown
          item={item}
          canCancel={canCancel}
          canManage={canManage}
          onSelectDetail={onSelectDetail}
          onCancel={onCancel}
          onConfirmPayment={onConfirmPayment}
        />
      </td>
    </tr>
  );
}

function RegistrationActionsDropdown({
  item,
  canCancel,
  canManage,
  onSelectDetail,
  onCancel,
  onConfirmPayment,
}: {
  item: RegistrationListItem;
  canCancel: boolean;
  canManage: boolean;
  onSelectDetail: (item: RegistrationListItem) => void;
  onCancel: (item: RegistrationListItem) => void;
  onConfirmPayment: (item: RegistrationListItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const canConfirmManual =
    canManage &&
    (item.status === "aguardando_pagamento" || item.status === "pendente");
  const canCancelRegistration = canCancel && item.status !== "cancelada";

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <Button
        type="button"
        compact
        variant="secondary"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Ações para a inscrição ${item.code}`}
        onClick={() => setOpen((prev) => !prev)}
        className="gap-1.5"
      >
        <span>Ações</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-app-muted-foreground transition-transform duration-150",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </Button>

      {open ? (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full z-40 mt-1.5 w-48 origin-top-right rounded-app-md border border-app-border bg-app-surface p-1 shadow-lg ring-1 ring-black/5 dark:ring-white/10"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSelectDetail(item);
            }}
            className="flex w-full items-center gap-2 rounded-app-sm px-2.5 py-2 text-left text-xs font-medium text-app-foreground transition-colors hover:bg-app-surface-elevated hover:text-app-primary"
          >
            <Eye className="h-3.5 w-3.5 text-app-muted-foreground" aria-hidden="true" />
            Ver detalhes
          </button>

          {canConfirmManual ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onConfirmPayment(item);
              }}
              className="flex w-full items-center gap-2 rounded-app-sm px-2.5 py-2 text-left text-xs font-medium text-app-primary transition-colors hover:bg-app-primary/10"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-app-primary" aria-hidden="true" />
              Confirmar pagamento
            </button>
          ) : null}

          {canCancelRegistration ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onCancel(item);
              }}
              className="flex w-full items-center gap-2 rounded-app-sm px-2.5 py-2 text-left text-xs font-medium text-app-danger transition-colors hover:bg-app-danger/10"
            >
              <Ban className="h-3.5 w-3.5 text-app-danger" aria-hidden="true" />
              Cancelar inscrição
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function RegistrationDetailModal({
  item,
  canCancel,
  canManage,
  onClose,
  onRequestCancel,
  onRequestConfirmPayment,
}: {
  item: RegistrationListItem | null;
  canCancel: boolean;
  canManage: boolean;
  onClose: () => void;
  onRequestCancel: (item: RegistrationListItem) => void;
  onRequestConfirmPayment: (item: RegistrationListItem) => void;
}) {
  if (!item) return null;

  return (
    <Dialog
      open={Boolean(item)}
      onClose={onClose}
      maxWidth="max-w-3xl"
      title={`Inscrição ${item.code}`}
      description={`${item.participantName} · ${item.eventTitle}`}
    >
      <div className="space-y-5">
        {/* Cabeçalho de status e motivo de cancelamento */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/60 p-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <RegistrationStatusBadge status={item.status} />
            <span className="text-xs text-app-muted-foreground">
              Realizada em{" "}
              <strong className="text-app-foreground">
                {formatDate({ value: item.createdAt, withTime: true })}
              </strong>
            </span>
            {item.confirmedAt ? (
              <span className="text-xs text-app-muted-foreground">
                · Confirmada em{" "}
                <strong className="text-app-foreground">
                  {formatDate({ value: item.confirmedAt, withTime: true })}
                </strong>
              </span>
            ) : null}
          </div>
          <Link
            href={`/painel/eventos/${item.eventId}`}
            className="text-xs font-semibold text-app-primary hover:underline"
          >
            Abrir evento →
          </Link>
        </div>

        {(item.status === "cancelada" || item.cancellationReason) && (
          <InlineAlert tone="danger">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wide">
                Motivo do cancelamento
              </p>
              <p className="text-sm">
                {item.cancellationReason?.trim() ||
                  "Cancelada sem justificativa detalhada registrada."}
              </p>
            </div>
          </InlineAlert>
        )}

        {/* Seção 1: Dados do Participante */}
        <section className="space-y-2.5 rounded-app-md border border-app-border bg-app-surface p-4">
          <div className="flex items-center gap-2 border-b border-app-border pb-2.5">
            <User className="h-4 w-4 text-app-primary" aria-hidden="true" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-app-foreground">
              Dados do Participante
            </h3>
          </div>
          <dl className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Nome completo" value={item.participantName} />
            <DetailItem
              label={item.cpf ? "CPF" : "Passaporte"}
              value={
                item.cpf
                  ? formatCpf(item.cpf)
                  : item.passport || "Não informado"
              }
              mono
            />
            <DetailItem label="E-mail" value={item.participantEmail} />
            <DetailItem
              label="Telefone"
              value={
                item.participantPhone
                  ? formatPhone(item.participantPhone)
                  : "—"
              }
            />
            <DetailItem
              label="Data de nascimento"
              value={
                item.participantBirthDate
                  ? formatDate({ value: item.participantBirthDate })
                  : "—"
              }
            />
            <DetailItem
              label="Empresa / Órgão"
              value={item.participantCompany || "—"}
            />
            <DetailItem
              label="Cargo / Função"
              value={item.participantJobTitle || "—"}
            />
            <DetailItem
              label="Termos e Privacidade (LGPD)"
              value={item.termsConsent ? "Aceito" : "Pendente"}
            />
            <DetailItem
              label="Comunicações / Marketing"
              value={
                item.marketingConsent ? "Autorizado (Opt-in)" : "Não autorizado"
              }
            />
          </dl>
        </section>

        {/* Seção 2: Evento, Lote e Financeiro */}
        <section className="space-y-2.5 rounded-app-md border border-app-border bg-app-surface p-4">
          <div className="flex items-center gap-2 border-b border-app-border pb-2.5">
            <CreditCard className="h-4 w-4 text-app-primary" aria-hidden="true" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-app-foreground">
              Evento, Lote e Informações Financeiras
            </h3>
          </div>
          <dl className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Evento" value={item.eventTitle} />
            <DetailItem
              label="Modalidade / Cobrança"
              value={`${item.eventModality === "online" ? "Online" : "Presencial"} · ${item.eventChargeType === "pago" ? "Pago" : "Gratuito"}`}
            />
            <DetailItem
              label="Início do evento"
              value={formatDate({ value: item.eventStartAt, withTime: true })}
            />
            <DetailItem
              label="Lote"
              value={
                item.lotName ||
                (item.eventChargeType === "gratuito" ? "Gratuito" : "—")
              }
            />
            <DetailItem
              label="Valor original"
              value={formatCurrency({ cents: item.originalCents })}
            />
            <DetailItem
              label="Desconto aplicado"
              value={
                item.discountCents > 0
                  ? `${formatCurrency({ cents: item.discountCents })}${item.couponCode ? ` (${item.couponCode})` : ""}`
                  : "R$ 0,00"
              }
            />
            <DetailItem
              label="Valor final"
              value={formatCurrency({ cents: item.finalCents })}
              highlight
            />
            {item.reservationExpiresAt &&
            (item.status === "pendente" ||
              item.status === "aguardando_pagamento") ? (
              <DetailItem
                label="Reserva expira em"
                value={formatDate({
                  value: item.reservationExpiresAt,
                  withTime: true,
                })}
              />
            ) : null}
            {item.waitlistExpiresAt && item.status === "pendente" ? (
              <DetailItem
                label="Prazo convocação fila"
                value={formatDate({
                  value: item.waitlistExpiresAt,
                  withTime: true,
                })}
              />
            ) : null}
          </dl>

          {item.eventPaymentMode === "pix_manual" ? (
            <div className="mt-3 rounded-app-md border border-app-primary/30 bg-app-primary/5 p-3 text-xs">
              <span className="font-semibold text-app-primary">
                Modo de cobrança: PIX Direto
              </span>
              <p className="mt-1 text-app-muted-foreground">
                O participante realiza a transferência diretamente na conta da organização. Verifique o comprovante ou extrato bancário antes de confirmar o recebimento.
              </p>
            </div>
          ) : null}

          {item.payment ? (
            <div className="mt-3 rounded-app-md border border-app-border bg-app-surface-elevated/50 p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-app-muted-foreground">
                Transação de Pagamento
              </p>
              <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem
                  label="Provedor"
                  value={item.payment.provider.toUpperCase()}
                />
                <DetailItem
                  label="Status financeiro"
                  value={formatPaymentStatusLabel(item.payment.status)}
                />
                <DetailItem
                  label="Método"
                  value={item.payment.method || "—"}
                />
                <DetailItem
                  label="ID da transação / Checkout"
                  value={item.payment.externalId || "—"}
                  mono
                />
                <DetailItem
                  label="Pago em"
                  value={
                    item.payment.paidAt
                      ? formatDate({
                          value: item.payment.paidAt,
                          withTime: true,
                        })
                      : "—"
                  }
                />
                {item.payment.refundedCents > 0 || item.payment.refundedAt ? (
                  <DetailItem
                    label="Estorno"
                    value={`${formatCurrency({ cents: item.payment.refundedCents })}${item.payment.refundReason ? ` — ${item.payment.refundReason}` : ""}`}
                  />
                ) : null}
              </dl>
            </div>
          ) : null}
        </section>

        {/* Seção 3: Informações Adicionais (Formulário Customizado e Anexos) */}
        <section className="space-y-2.5 rounded-app-md border border-app-border bg-app-surface p-4">
          <div className="flex items-center gap-2 border-b border-app-border pb-2.5">
            <FileText className="h-4 w-4 text-app-primary" aria-hidden="true" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-app-foreground">
              Informações Adicionais do Formulário
            </h3>
          </div>
          {item.answers.length === 0 ? (
            <p className="py-1 text-xs text-app-muted-foreground">
              Este evento não possui campos adicionais configurados ou nenhuma
              resposta adicional foi registrada.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
              {item.answers.map((answer) => (
                <div
                  key={answer.fieldId}
                  className="rounded-app-md border border-app-border bg-app-surface-elevated/40 p-3"
                >
                  <p className="text-xs font-semibold text-app-muted-foreground">
                    {answer.label}
                  </p>
                  <div className="mt-1 text-sm text-app-foreground">
                    {renderAnswerValue(answer)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Seção 4: Credenciamento (Check-in) e Certificado */}
        <section className="space-y-2.5 rounded-app-md border border-app-border bg-app-surface p-4">
          <div className="flex items-center gap-2 border-b border-app-border pb-2.5">
            <CalendarDays
              className="h-4 w-4 text-app-primary"
              aria-hidden="true"
            />
            <h3 className="text-xs font-bold uppercase tracking-wider text-app-foreground">
              Credenciamento (Check-in) e Certificado
            </h3>
          </div>
          <div className="space-y-3 pt-1">
            {item.checkIns.length === 0 ? (
              <p className="text-xs text-app-muted-foreground">
                Nenhum check-in registrado na portaria até o momento.
              </p>
            ) : (
              <div className="space-y-2">
                {item.checkIns.map((ci) => (
                  <div
                    key={ci.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-app-success"
                        aria-hidden="true"
                      />
                      <div>
                        <span className="font-semibold text-app-foreground">
                          {ci.type === "reentrada_autorizada"
                            ? "Reentrada autorizada"
                            : "Check-in na portaria"}
                        </span>
                        <span className="text-app-muted-foreground">
                          {" "}
                          · Operador: {ci.operatorName}
                        </span>
                        {ci.justification ? (
                          <p className="mt-0.5 text-app-muted-foreground">
                            Justificativa: {ci.justification}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <span className="font-mono text-app-muted-foreground">
                      {formatDate({ value: ci.happenedAt, withTime: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {item.certificate ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-app-md border border-app-success/30 bg-app-success/10 px-3 py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <Award
                    className="h-4 w-4 shrink-0 text-app-success"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-semibold text-app-foreground">
                      Certificado emitido ({item.certificate.workloadHours}h)
                    </p>
                    <p className="font-mono text-[11px] text-app-muted-foreground">
                      Código: {item.certificate.code} · Emitido em{" "}
                      {formatDate({
                        value: item.certificate.issuedAt,
                        withTime: true,
                      })}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/certificados?code=${encodeURIComponent(item.certificate.code)}`}
                  target="_blank"
                  className="font-semibold text-app-primary hover:underline"
                >
                  Verificar certificado →
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        {/* Rodapé de ações */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-app-border pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {canManage &&
            (item.status === "aguardando_pagamento" ||
              item.status === "pendente") ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => onRequestConfirmPayment(item)}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Confirmar pagamento
              </Button>
            ) : null}
            {canCancel && item.status !== "cancelada" ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => onRequestCancel(item)}
              >
                <Ban className="h-4 w-4" aria-hidden="true" />
                Cancelar inscrição
              </Button>
            ) : null}
          </div>
          <Button type="button" variant="secondary" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
            Fechar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-app-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 break-words text-xs font-semibold text-app-foreground",
          mono && "font-mono",
          highlight && "text-sm font-bold text-app-primary",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function renderAnswerValue(answer: RegistrationAnswerDetail) {
  if (answer.file) {
    const sizeKb = Math.max(1, Math.round(answer.file.sizeBytes / 1024));
    return (
      <a
        href={`/api/v1/admin/files/${encodeURIComponent(answer.file.id)}`}
        target="_blank"
        rel="noreferrer"
        className={cn(btnSecondary, "mt-1 inline-flex h-8 gap-1.5 px-2.5 text-xs")}
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="max-w-[220px] truncate">{answer.file.originalName}</span>
        <span className="text-[11px] text-app-muted-foreground">
          ({sizeKb} KB)
        </span>
      </a>
    );
  }

  const val = answer.value;
  if (
    val === null ||
    val === undefined ||
    val === "" ||
    (Array.isArray(val) && val.length === 0)
  ) {
    return (
      <span className="italic text-xs text-app-muted-foreground">
        Não preenchido
      </span>
    );
  }

  if (typeof val === "boolean") {
    return <span>{val ? "Sim" : "Não"}</span>;
  }

  if (Array.isArray(val)) {
    return (
      <div className="mt-1 flex flex-wrap gap-1.5">
        {val.map((option, idx) => (
          <Badge key={`${answer.fieldId}-${idx}`} tone="muted">
            {String(option)}
          </Badge>
        ))}
      </div>
    );
  }

  const text = String(val);
  if (answer.type === "cpf") {
    return <span className="font-mono">{formatCpf(text)}</span>;
  }
  if (answer.type === "telefone") {
    return <span>{formatPhone(text)}</span>;
  }
  if (answer.type === "data" && /^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-");
    return <span>{`${day}/${month}/${year}`}</span>;
  }

  return <span className="whitespace-pre-wrap break-words">{text}</span>;
}

function formatPaymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    aguardando: "Aguardando pagamento",
    pago: "Pago",
    recusado: "Recusado",
    cancelado: "Cancelado",
    expirado: "Expirado",
    estornado: "Estornado",
  };
  return labels[status] ?? status;
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
