"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  Ban,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  MonitorPlay,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { ticketingApi } from "@/client/services/ticketing-api.service";
import type { CertificateWorkflowStatus } from "@/modules/ticketing/domain/certificates/services/certificate-text.domain-service";
import type {
  CertificateEventSummaryReadModel,
  CertificateHubReadModel,
  CertificatePresetReadModel,
} from "@/modules/ticketing/domain/repositories/certificate-repository.interface";
import {
  Badge,
  Button,
  Empty,
  InlineAlert,
  Panel,
  PanelHeader,
  Spinner,
  Stat,
  btnPrimary,
  btnSecondary,
  inputCls,
} from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";

type HubTab = "pendente" | "concluido" | "dispensado" | "presets";

export function CertificatesHub() {
  const [hub, setHub] = useState<CertificateHubReadModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HubTab>("pendente");
  const [searchQuery, setSearchQuery] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadHub(): Promise<void> {
      try {
        const result = await ticketingApi.listCertificateHub();
        if (active) setHub(result);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Não foi possível carregar a central de certificados.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadHub();
    return () => {
      active = false;
    };
  }, [reloadVersion]);

  function retry(): void {
    setLoading(true);
    setError(null);
    setReloadVersion((current) => current + 1);
  }

  async function handleChangeEventStatus(params: {
    eventId: string;
    title: string;
    nextStatus: CertificateWorkflowStatus;
  }): Promise<void> {
    if (updatingEventId) return;
    setUpdatingEventId(params.eventId);
    setError(null);
    setNotice(null);

    try {
      await ticketingApi.updateEventCertificateStatus({
        eventId: params.eventId,
        workflowStatus: params.nextStatus,
      });

      const refreshed = await ticketingApi.listCertificateHub();
      setHub(refreshed);

      if (params.nextStatus === "dispensado") {
        setNotice(
          `O evento “${params.title}” foi marcado como “Não precisa de certificado”.`,
        );
      } else if (params.nextStatus === "pendente") {
        setNotice(
          `O evento “${params.title}” retornou para a fila de Certificados Pendentes.`,
        );
      } else {
        setNotice(
          `O evento “${params.title}” foi marcado como Concluído.`,
        );
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível alterar o status de certificação deste evento.",
      );
    } finally {
      setUpdatingEventId(null);
    }
  }

  async function handleDeletePreset(
    preset: CertificatePresetReadModel,
  ): Promise<void> {
    if (deletingPresetId) return;
    setDeletingPresetId(preset.id);
    setError(null);
    setNotice(null);

    try {
      await ticketingApi.deleteCertificatePreset({ presetId: preset.id });
      const refreshed = await ticketingApi.listCertificateHub();
      setHub(refreshed);
      setNotice(`Modelo “${preset.name}” excluído.`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível excluir o modelo salvo.",
      );
    } finally {
      setDeletingPresetId(null);
    }
  }

  const filteredEvents = useMemo(() => {
    if (!hub || activeTab === "presets") return [];
    const q = searchQuery.trim().toLowerCase();
    return hub.events.filter((item) => {
      if (item.workflowStatus !== activeTab) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q)
      );
    });
  }, [hub, activeTab, searchQuery]);

  if (loading) {
    return (
      <Panel>
        <div className="p-5">
          <Spinner label="Carregando central de certificados…" />
        </div>
      </Panel>
    );
  }

  const counts = hub?.counts ?? {
    pendingEvents: 0,
    completedEvents: 0,
    dismissedEvents: 0,
    totalIssued: 0,
    totalSent: 0,
  };

  const tabs: Array<{
    id: HubTab;
    label: string;
    count: number;
    icon: typeof Clock3;
  }> = [
    {
      id: "pendente",
      label: "Pendentes",
      count: counts.pendingEvents,
      icon: Clock3,
    },
    {
      id: "concluido",
      label: "Concluídos / Enviados",
      count: counts.completedEvents,
      icon: CheckCircle2,
    },
    {
      id: "dispensado",
      label: "Não precisa de certificado",
      count: counts.dismissedEvents,
      icon: Ban,
    },
    {
      id: "presets",
      label: "Modelos Salvos",
      count: hub?.presets.length ?? 0,
      icon: Bookmark,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Eventos pendentes" value={counts.pendingEvents} />
        <Stat label="Eventos concluídos" value={counts.completedEvents} />
        <Stat
          label="Emitidos / Enviados"
          value={`${counts.totalIssued} / ${counts.totalSent}`}
        />
        <Stat label="Dispensados" value={counts.dismissedEvents} />
      </div>

      {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
      {error ? (
        <InlineAlert
          tone="danger"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          {error}
          <Button compact variant="secondary" onClick={retry}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Tentar novamente
          </Button>
        </InlineAlert>
      ) : null}

      <Panel>
        <PanelHeader
          title="Certificados"
          right={
            <Button type="button" compact variant="secondary" onClick={retry}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Atualizar
            </Button>
          }
        />

        <div className="border-b border-app-border px-4 py-3 sm:px-5">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-wrap gap-1.5" role="tablist">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-app-md px-3 text-xs font-semibold transition-colors cursor-pointer",
                      active
                        ? "bg-app-primary text-white"
                        : "bg-app-surface-elevated text-app-muted-foreground hover:text-app-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
                        active
                          ? "bg-white/20 text-white"
                          : "bg-app-surface text-app-foreground",
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {activeTab !== "presets" ? (
              <div className="relative w-full lg:w-72">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-app-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar evento encerrado…"
                  className={cn(inputCls, "pl-9")}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {activeTab === "presets" ? (
            <PresetsTabContent
              presets={hub?.presets ?? []}
              deletingPresetId={deletingPresetId}
              onDelete={handleDeletePreset}
            />
          ) : filteredEvents.length === 0 ? (
            <Empty
              title={
                activeTab === "pendente"
                  ? "Nenhum evento encerrado pendente de certificado"
                  : activeTab === "concluido"
                    ? "Nenhum evento com certificação concluída ainda"
                    : "Nenhum evento marcado como dispensado"
              }
              description={
                activeTab === "pendente"
                  ? "Assim que um evento for finalizado, ele aparecerá automaticamente nesta fila."
                  : activeTab === "concluido"
                    ? "Eventos cujos certificados forem enviados aparecerão aqui."
                    : "Eventos marcados como 'Não precisa de certificado' ficam aqui e podem ser reativados quando desejar."
              }
              action={
                <Link href="/painel/eventos" className={btnSecondary}>
                  Ver todos os eventos
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-app-border rounded-app-lg border border-app-border">
              {filteredEvents.map((item) => (
                <EventCertificateRow
                  key={item.eventId}
                  item={item}
                  isUpdating={updatingEventId === item.eventId}
                  onChangeStatus={handleChangeEventStatus}
                />
              ))}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

function EventCertificateRow({
  item,
  isUpdating,
  onChangeStatus,
}: {
  item: CertificateEventSummaryReadModel;
  isUpdating: boolean;
  onChangeStatus: (params: {
    eventId: string;
    title: string;
    nextStatus: CertificateWorkflowStatus;
  }) => Promise<void>;
}) {
  const statusBadge =
    item.workflowStatus === "concluido" ? (
      <Badge tone="success">Certificados enviados</Badge>
    ) : item.workflowStatus === "dispensado" ? (
      <Badge tone="muted">Não precisa de certificado</Badge>
    ) : (
      <Badge tone="warning">Certificado pendente</Badge>
    );

  return (
    <article className="flex flex-col justify-between gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge}
          <Badge tone="primary">
            {item.modality === "online" ? "Online" : "Presencial"}
          </Badge>
          {item.hasCustomTemplate ? (
            <Badge tone="success">
              Modelo PDF: {item.templatePdfName || "Anexado"}
            </Badge>
          ) : null}
        </div>

        <div>
          <Link
            href={`/painel/certificados/${item.eventId}`}
            className="text-base font-bold text-app-foreground hover:text-app-primary hover:underline"
          >
            {item.title}
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-app-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              Encerrado em {formatDate({ value: item.endAt, withTime: true })}
            </span>
            <span className="inline-flex items-center gap-1">
              {item.modality === "online" ? (
                <MonitorPlay className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Carga horária: {item.workloadHours}h
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {item.confirmedCount} confirmados · {item.checkedInCount} check-ins
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-app-foreground">
              <Award className="h-3.5 w-3.5 text-app-primary" aria-hidden="true" />
              {item.issuedCount} emitidos · {item.sentCount} enviados
              {item.failedCount > 0 ? (
                <span className="text-app-danger">
                  ({item.failedCount} falhas)
                </span>
              ) : null}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {item.workflowStatus === "pendente" ? (
          <>
            <Link
              href={`/painel/certificados/${item.eventId}`}
              className={btnPrimary}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {item.issuedCount > 0 || item.hasCustomTemplate
                ? "Continuar / Enviar Certificados"
                : "Enviar Certificados"}
            </Link>
            <Button
              type="button"
              variant="secondary"
              disabled={isUpdating}
              onClick={() =>
                void onChangeStatus({
                  eventId: item.eventId,
                  title: item.title,
                  nextStatus: "dispensado",
                })
              }
            >
              <Ban className="h-4 w-4" aria-hidden="true" />
              {isUpdating ? "Atualizando…" : "Não precisa de certificado"}
            </Button>
          </>
        ) : item.workflowStatus === "dispensado" ? (
          <>
            <Button
              type="button"
              variant="primary"
              disabled={isUpdating}
              onClick={() =>
                void onChangeStatus({
                  eventId: item.eventId,
                  title: item.title,
                  nextStatus: "pendente",
                })
              }
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {isUpdating ? "Reativando…" : "Reativar / Exigir Certificado"}
            </Button>
            <Link
              href={`/painel/certificados/${item.eventId}`}
              className={btnSecondary}
            >
              Abrir Estúdio
            </Link>
          </>
        ) : (
          <>
            <Link
              href={`/painel/certificados/${item.eventId}`}
              className={btnPrimary}
            >
              <Award className="h-4 w-4" aria-hidden="true" />
              Abrir Estúdio / Reenviar
            </Link>
            <Button
              type="button"
              variant="secondary"
              disabled={isUpdating}
              onClick={() =>
                void onChangeStatus({
                  eventId: item.eventId,
                  title: item.title,
                  nextStatus: "pendente",
                })
              }
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Voltar para Pendentes
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

function PresetsTabContent({
  presets,
  deletingPresetId,
  onDelete,
}: {
  presets: CertificatePresetReadModel[];
  deletingPresetId: string | null;
  onDelete: (preset: CertificatePresetReadModel) => Promise<void>;
}) {
  if (presets.length === 0) {
    return (
      <Empty
        title="Nenhum modelo salvo"
        description="Ao configurar o certificado de qualquer evento no Estúdio, você pode salvar o layout e o PDF como um modelo reutilizável."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {presets.map((preset) => (
        <div
          key={preset.id}
          className="flex flex-col justify-between gap-4 rounded-app-lg border border-app-border bg-app-surface-elevated/40 p-4"
        >
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText
                  className="h-4 w-4 text-app-primary shrink-0"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-bold text-app-foreground">
                  {preset.name}
                </h3>
              </div>
              <Button
                type="button"
                compact
                variant="danger"
                disabled={deletingPresetId === preset.id}
                onClick={() => void onDelete(preset)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                {deletingPresetId === preset.id ? "Excluindo…" : "Excluir"}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-app-muted-foreground">
              <span>
                {preset.layoutConfig.fields.length} campo(s) posicionado(s)
              </span>
              <span>·</span>
              <span>
                QR Code:{" "}
                {preset.layoutConfig.qrCode?.enabled
                  ? "Ativado"
                  : "Desativado"}
              </span>
              {preset.templatePdfName ? (
                <>
                  <span>·</span>
                  <span>PDF base: {preset.templatePdfName}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
