"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Ban, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
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
  selectCls,
  textareaCls,
} from "@/components/ui";
import type {
  RegistrationListItem,
  RegistrationListResult,
} from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import { formatCurrency, formatDate } from "@/lib/utils";

const PAGE_SIZE = 20;
type RegistrationFilters = { query: string; status: string };

export function RegistrationsBrowser() {
  const auth = useAuth();
  const [result, setResult] = useState<RegistrationListResult>({
    items: [],
    total: 0,
  });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [filters, setFilters] = useState<RegistrationFilters>({
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
    async function loadRegistrations(): Promise<void> {
      try {
        const data = await ticketingApi.listRegistrations({
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
    setFilters({ query: query.trim(), status });
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

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <PanelHeader
          title="Inscrições"
          description="Consulte participantes, pagamentos e credenciamento."
        />
        <div className="p-4 sm:p-5">
          <form
            onSubmit={submitSearch}
            className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto]"
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
            <Field label="Status" htmlFor="registration-status">
              <select
                id="registration-status"
                value={status}
                onChange={(change) => setStatus(change.target.value)}
                className={selectCls}
              >
                <option value="">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="aguardando_pagamento">
                  Aguardando pagamento
                </option>
                <option value="confirmada">Confirmada</option>
                <option value="lista_espera">Lista de espera</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </Field>
            <Button type="submit">
              <Search className="h-4 w-4" aria-hidden="true" />
              Filtrar
            </Button>
          </form>
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
