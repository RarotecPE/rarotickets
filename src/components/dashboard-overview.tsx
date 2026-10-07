"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileClock,
  Plus,
  ScanLine,
  Ticket,
  Users,
} from "lucide-react";
import { ticketingApi } from "@/client/services/ticketing-api.service";
import { useAuth } from "@/components/auth-provider";
import {
  Badge,
  Button,
  Empty,
  InlineAlert,
  Panel,
  PanelHeader,
  Stat,
} from "@/components/ui";
import type { DashboardMetrics } from "@/modules/ticketing/domain/repositories/reporting-repository.interface";
import { formatCurrency, formatDate } from "@/lib/utils";

export function DashboardOverview() {
  const auth = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const permissions = auth.session?.permissions ?? [];

  useEffect(() => {
    let active = true;
    async function loadDashboard(): Promise<void> {
      try {
        const result = await ticketingApi.getDashboard();
        if (active) setMetrics(result);
      } catch (caught) {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : "Não foi possível carregar o painel.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadDashboard();
    return () => {
      active = false;
    };
  }, [reloadVersion]);

  function retry(): void {
    setLoading(true);
    setError(null);
    setReloadVersion((current) => current + 1);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-app-primary">
            Visão geral
          </p>
          <h2 className="mt-1 text-xl font-bold text-app-foreground">
            Painel RaroTickets
          </h2>
          <p className="mt-1 text-xs text-app-muted-foreground">
            Acompanhe eventos, inscrições, presença e receita em um só lugar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {permissions.includes("events:write") ? (
            <Link
              href="/painel/eventos/novo"
              className="inline-flex h-10 items-center gap-2 rounded-app-md bg-app-primary px-4 text-sm font-semibold text-app-primary-foreground hover:brightness-110"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Novo evento
            </Link>
          ) : null}
          {permissions.includes("registrations:read") ? (
            <Link
              href="/painel/inscricoes"
              className="inline-flex h-10 items-center gap-2 rounded-app-md border border-app-border bg-app-surface-elevated px-3 text-sm font-semibold text-app-foreground hover:bg-app-surface"
            >
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              Inscrições
            </Link>
          ) : null}
        </div>
      </div>

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
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
          aria-busy="true"
        >
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-app-lg border border-app-border bg-app-surface"
            />
          ))}
        </div>
      ) : error ? null : metrics ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Stat
              label="Eventos"
              value={metrics.events}
              icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
              tone="primary"
            />
            <Stat
              label="Inscrições"
              value={metrics.registrations}
              icon={<Users className="h-4 w-4" aria-hidden="true" />}
              tone="primary"
            />
            <Stat
              label="Confirmadas"
              value={metrics.confirmed}
              icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              tone="success"
            />
            <Stat
              label="Pendentes"
              value={metrics.pending}
              hint={`${metrics.waitlisted} na lista de espera`}
              icon={<Clock3 className="h-4 w-4" aria-hidden="true" />}
              tone="warning"
            />
            <Stat
              label="Receita recebida"
              value={formatCurrency({ cents: metrics.revenuePaidCents })}
              icon={<Ticket className="h-4 w-4" aria-hidden="true" />}
              tone="success"
            />
            <Stat
              label="Presença"
              value={`${formatPercent(metrics.attendanceRate)}%`}
              hint={`${metrics.checkedIn} check-ins realizados`}
              icon={<Activity className="h-4 w-4" aria-hidden="true" />}
              tone="primary"
            />
          </div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
            <UpcomingEventsPanel metrics={metrics} />
            <RecentRegistrationsPanel metrics={metrics} />
          </div>
          <QuickAccess permissions={permissions} />
        </>
      ) : (
        <Panel>
          <div className="p-5">
            <Empty
              title="Painel sem dados"
              description="Não há indicadores disponíveis para seu perfil neste momento."
            />
          </div>
        </Panel>
      )}
    </div>
  );
}

function UpcomingEventsPanel({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <Panel>
      <PanelHeader
        title="Próximos eventos"
        description="Eventos futuros e ocupação confirmada."
        right={
          <Link
            href="/painel/eventos"
            className="text-xs font-semibold text-app-primary hover:underline"
          >
            Ver todos
          </Link>
        }
      />
      {metrics.upcomingEvents.length ? (
        <div className="divide-y divide-app-border">
          {metrics.upcomingEvents.map((event) => {
            const occupied = event.confirmed + event.reserved;
            const occupancy =
              event.capacity > 0
                ? Math.min(100, Math.round((occupied / event.capacity) * 100))
                : 0;
            return (
              <article key={event.id} className="px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/painel/eventos/${event.id}`}
                      className="break-words text-sm font-semibold text-app-foreground hover:text-app-primary hover:underline"
                    >
                      {event.title}
                    </Link>
                    <p className="mt-1 text-xs text-app-muted-foreground">
                      {formatDate({ value: event.startAt, withTime: true })}
                    </p>
                  </div>
                  <EventStateBadge status={event.status} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-app-muted-foreground">
                  <span>
                    {occupied} de {event.capacity} vagas ocupadas
                  </span>
                  <span className="tabular-nums">{occupancy}%</span>
                </div>
                <div
                  className="mt-1.5 h-1.5 overflow-hidden rounded-app-pill bg-app-surface-elevated"
                  role="progressbar"
                  aria-label={`Ocupação de ${event.title}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={occupancy}
                >
                  <div
                    className="h-full rounded-app-pill bg-app-primary transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: `${occupancy}%` }}
                  />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="p-4 sm:p-5">
          <Empty
            title="Nenhum evento futuro"
            description="Eventos agendados aparecerão aqui."
            action={
              <Link
                href="/painel/eventos"
                className="text-xs font-semibold text-app-primary hover:underline"
              >
                Abrir eventos
              </Link>
            }
          />
        </div>
      )}
    </Panel>
  );
}

function RecentRegistrationsPanel({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <Panel>
      <PanelHeader
        title="Inscrições recentes"
        description="Últimos registros recebidos."
        right={
          <Link
            href="/painel/inscricoes"
            className="text-xs font-semibold text-app-primary hover:underline"
          >
            Ver inscrições
          </Link>
        }
      />
      {metrics.recentRegistrations.length ? (
        <div className="divide-y divide-app-border">
          {metrics.recentRegistrations.map((registration) => (
            <article
              key={`${registration.code}-${registration.createdAt}`}
              className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5"
            >
              <div className="min-w-0">
                <p className="break-all font-mono text-xs font-semibold text-app-primary">
                  {registration.code}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-app-foreground">
                  {registration.participantName}
                </p>
                <p className="mt-0.5 truncate text-xs text-app-muted-foreground">
                  {registration.eventTitle} ·{" "}
                  {formatDate({
                    value: registration.createdAt,
                    withTime: true,
                  })}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <RegistrationStateBadge status={registration.status} />
                <span className="text-xs font-semibold text-app-foreground">
                  {formatCurrency({ cents: registration.amountCents })}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="p-4 sm:p-5">
          <Empty
            title="Sem inscrições recentes"
            description="As inscrições recentes aparecerão nesta lista."
          />
        </div>
      )}
    </Panel>
  );
}

function QuickAccess({ permissions }: { permissions: string[] }) {
  const links = [
    ...(permissions.includes("checkin:write")
      ? [
          {
            href: "/painel/credenciamento",
            label: "Credenciamento",
            icon: ScanLine,
          },
        ]
      : []),
    ...(permissions.includes("reports:read")
      ? [{ href: "/painel/relatorios", label: "Relatórios", icon: BarChart3 }]
      : []),
    ...(permissions.includes("audit:read")
      ? [{ href: "/painel/auditoria", label: "Auditoria", icon: FileClock }]
      : []),
  ];
  if (!links.length) return null;
  return (
    <Panel>
      <PanelHeader
        title="Acesso rápido"
        description="Ferramentas disponíveis para seu perfil."
      />
      <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3 sm:p-5">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-11 items-center justify-between gap-3 rounded-app-md border border-app-border bg-app-surface-elevated px-3 text-sm font-semibold text-app-foreground transition-colors hover:bg-app-surface"
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-app-primary" aria-hidden="true" />
                {link.label}
              </span>
              <ArrowRight
                className="h-4 w-4 text-app-muted-foreground"
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}

function EventStateBadge({ status }: { status: string }) {
  if (status === "inscricoes_abertas")
    return <Badge tone="success">Inscrições abertas</Badge>;
  if (status === "rascunho") return <Badge tone="muted">Rascunho</Badge>;
  if (status === "cancelado") return <Badge tone="danger">Cancelado</Badge>;
  return <Badge tone="warning">{statusLabel(status)}</Badge>;
}

function RegistrationStateBadge({ status }: { status: string }) {
  if (status === "confirmada") return <Badge tone="success">Confirmada</Badge>;
  if (status === "cancelada") return <Badge tone="danger">Cancelada</Badge>;
  if (status === "lista_espera")
    return <Badge tone="primary">Lista de espera</Badge>;
  if (status === "aguardando_pagamento")
    return <Badge tone="warning">Aguardando pagamento</Badge>;
  return <Badge tone="muted">Pendente</Badge>;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    agendado: "Agendado",
    inscricoes_encerradas: "Inscrições encerradas",
    em_andamento: "Em andamento",
    finalizado: "Finalizado",
  };
  return labels[status] ?? status;
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(
    value,
  );
}
