"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  CalendarCheck,
  CalendarDays,
  ExternalLink,
  Flag,
  Lock,
  MapPin,
  MonitorPlay,
  Pencil,
  Play,
  RefreshCw,
  Ticket,
  Unlock,
} from "lucide-react";
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
import { EventStatusBadge } from "@/components/managed-events-browser";
import type { EventReadModel } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import type { EventStatus } from "@/modules/ticketing/domain/events/entities/event.aggregate";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export type ManagedEventDetailProps = { eventId: string };
type EventStatusOption = {
  value: EventStatus;
  label: string;
  icon: typeof CalendarDays;
  buttonClassName: string;
};

const ACTION_CONFIG: Record<
  Exclude<EventStatus, "rascunho">,
  EventStatusOption
> = {
  agendado: {
    value: "agendado",
    label: "Publicar / agendar",
    icon: CalendarCheck,
    buttonClassName:
      "bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:outline-blue-600",
  },
  inscricoes_abertas: {
    value: "inscricoes_abertas",
    label: "Abrir inscrições",
    icon: Unlock,
    buttonClassName:
      "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-emerald-600",
  },
  inscricoes_encerradas: {
    value: "inscricoes_encerradas",
    label: "Encerrar inscrições",
    icon: Lock,
    buttonClassName:
      "bg-amber-600 text-white shadow-sm hover:bg-amber-700 focus-visible:outline-amber-600",
  },
  em_andamento: {
    value: "em_andamento",
    label: "Iniciar evento",
    icon: Play,
    buttonClassName:
      "bg-violet-600 text-white shadow-sm hover:bg-violet-700 focus-visible:outline-violet-600",
  },
  finalizado: {
    value: "finalizado",
    label: "Finalizar evento",
    icon: Flag,
    buttonClassName:
      "bg-teal-600 text-white shadow-sm hover:bg-teal-700 focus-visible:outline-teal-600",
  },
  cancelado: {
    value: "cancelado",
    label: "Cancelar evento",
    icon: Ban,
    buttonClassName:
      "bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:outline-rose-600",
  },
};

const NEXT_STATUSES: Record<EventStatus, EventStatusOption[]> = {
  rascunho: [ACTION_CONFIG.agendado, ACTION_CONFIG.cancelado],
  agendado: [ACTION_CONFIG.inscricoes_abertas, ACTION_CONFIG.cancelado],
  inscricoes_abertas: [
    ACTION_CONFIG.inscricoes_encerradas,
    ACTION_CONFIG.cancelado,
  ],
  inscricoes_encerradas: [ACTION_CONFIG.em_andamento, ACTION_CONFIG.cancelado],
  em_andamento: [ACTION_CONFIG.finalizado, ACTION_CONFIG.cancelado],
  finalizado: [],
  cancelado: [],
};

export function ManagedEventDetail({ eventId }: ManagedEventDetailProps) {
  const auth = useAuth();
  const [event, setEvent] = useState<EventReadModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [justification, setJustification] = useState("");
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [transitioningStatus, setTransitioningStatus] =
    useState<EventStatus | null>(null);
  const [transitionNotice, setTransitionNotice] = useState<string | null>(null);
  const canWrite = Boolean(auth.session?.permissions.includes("events:write"));

  useEffect(() => {
    let active = true;
    async function loadEvent(): Promise<void> {
      try {
        const result = await ticketingApi.getManagedEvent({ eventId });
        if (active) setEvent(result);
      } catch (caught) {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : "Não foi possível carregar este evento.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadEvent();
    return () => {
      active = false;
    };
  }, [eventId, reloadVersion]);

  function retry(): void {
    setLoading(true);
    setError(null);
    setReloadVersion((current) => current + 1);
  }

  async function executeTransition(targetStatus: EventStatus): Promise<void> {
    if (!event || transitioningStatus) return;
    setTransitionError(null);
    setTransitionNotice(null);
    if (targetStatus === "cancelado" && !justification.trim()) {
      setTransitionError(
        "Informe a justificativa obrigatória para cancelar o evento.",
      );
      return;
    }
    setTransitioningStatus(targetStatus);
    try {
      const updated = await ticketingApi.transitionEvent({
        eventId,
        nextStatus: targetStatus,
        justification:
          targetStatus === "cancelado"
            ? justification.trim() || undefined
            : undefined,
      });
      setEvent(updated);
      setShowCancelForm(false);
      setJustification("");
      setTransitionNotice(
        `Status atualizado para ${statusLabel(updated.props.status)}.`,
      );
    } catch (caught) {
      setTransitionError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível alterar o status do evento.",
      );
    } finally {
      setTransitioningStatus(null);
    }
  }

  function handleActionClick(targetStatus: EventStatus): void {
    setTransitionError(null);
    setTransitionNotice(null);
    if (targetStatus === "cancelado") {
      setShowCancelForm(true);
      return;
    }
    setShowCancelForm(false);
    void executeTransition(targetStatus);
  }

  function submitCancellation(formEvent: FormEvent<HTMLFormElement>): void {
    formEvent.preventDefault();
    void executeTransition("cancelado");
  }

  if (loading)
    return (
      <Panel>
        <div className="p-5">
          <Spinner label="Carregando evento…" />
        </div>
      </Panel>
    );
  if (error)
    return (
      <div className="flex flex-col gap-4">
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
        <Link
          href="/painel/eventos"
          className="text-sm font-semibold text-app-primary hover:underline"
        >
          Voltar à lista de eventos
        </Link>
      </div>
    );
  if (!event)
    return (
      <Panel>
        <div className="p-5">
          <Empty
            title="Evento não encontrado"
            description="O evento pode ter sido removido ou você não tem acesso a ele."
            action={
              <Link
                href="/painel/eventos"
                className="text-sm font-semibold text-app-primary hover:underline"
              >
                Voltar aos eventos
              </Link>
            }
          />
        </div>
      </Panel>
    );

  const registeredCount = event.capacity.confirmed + event.capacity.reserved;
  const transitionOptions = NEXT_STATUSES[event.props.status];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/painel/eventos"
            className="inline-flex min-h-8 items-center gap-2 text-xs font-semibold text-app-muted-foreground hover:text-app-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Todos os eventos
          </Link>
          <h2 className="mt-2 break-words text-xl font-bold text-app-foreground">
            {event.props.title}
          </h2>
          <p className="mt-1 text-xs text-app-muted-foreground">
            /{event.props.slug} · Criado em{" "}
            {formatDate({ value: event.createdAt })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EventStatusBadge status={event.props.status} />
          {event.props.status !== "finalizado" && canWrite ? (
            <Link
              href={`/painel/eventos/${event.id}/editar`}
              className="inline-flex h-9 items-center gap-2 rounded-app-md border border-app-border bg-app-surface-elevated px-3 text-xs font-semibold text-app-foreground hover:bg-app-surface"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Editar evento
            </Link>
          ) : null}
          {event.props.status !== "rascunho" &&
          event.props.status !== "cancelado" ? (
            <Link
              href={`/eventos/${event.props.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-app-md border border-app-border bg-app-surface-elevated px-3 text-xs font-semibold text-app-foreground hover:bg-app-surface"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Ver página pública
            </Link>
          ) : null}
        </div>
      </div>
      {transitionNotice ? (
        <InlineAlert tone="success">{transitionNotice}</InlineAlert>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Capacidade ocupada"
          value={`${registeredCount} / ${event.props.maxCapacity}`}
          hint={`${event.capacity.confirmed} confirmadas · ${event.capacity.reserved} reservadas`}
        />
        <MetricCard
          label="Lista de espera"
          value={event.capacity.waitlisted}
          hint={
            event.props.allowsWaitlist
              ? "Lista de espera habilitada"
              : "Lista de espera desabilitada"
          }
        />
        <MetricCard
          label="Lotes configurados"
          value={event.lots.length}
          hint={
            event.props.chargeType === "pago"
              ? "Ingressos pagos"
              : "Inscrições gratuitas"
          }
        />
      </div>
      {canWrite && transitionOptions.length ? (
        <Panel>
          <PanelHeader
            title="Transição de status"
            description="Selecione uma ação abaixo para atualizar o status do evento."
          />
          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              {transitionOptions.map((option) => {
                const Icon = option.icon;
                const isLoading = transitioningStatus === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={transitioningStatus !== null}
                    onClick={() => handleActionClick(option.value)}
                    className={cn(
                      "inline-flex h-10 items-center justify-center gap-2 rounded-app-md px-4 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                      option.buttonClassName,
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {isLoading ? "Atualizando…" : option.label}
                  </button>
                );
              })}
            </div>

            {showCancelForm ? (
              <form
                onSubmit={submitCancellation}
                className="grid grid-cols-1 gap-3 rounded-app-md border border-rose-500/30 bg-rose-500/5 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
              >
                <Field
                  label="Justificativa do cancelamento *"
                  htmlFor="event-cancel-justification"
                  error={transitionError ?? undefined}
                >
                  <input
                    id="event-cancel-justification"
                    value={justification}
                    onChange={(change) => setJustification(change.target.value)}
                    placeholder="Descreva o motivo do cancelamento do evento"
                    maxLength={500}
                    className={inputCls}
                    autoFocus
                  />
                </Field>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={transitioningStatus !== null}
                  onClick={() => {
                    setShowCancelForm(false);
                    setTransitionError(null);
                  }}
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  disabled={transitioningStatus !== null}
                >
                  <Ban className="h-4 w-4" aria-hidden="true" />
                  {transitioningStatus === "cancelado"
                    ? "Cancelando…"
                    : "Confirmar cancelamento"}
                </Button>
              </form>
            ) : null}

            {transitionError && !showCancelForm ? (
              <InlineAlert tone="danger">{transitionError}</InlineAlert>
            ) : null}
          </div>
        </Panel>
      ) : null}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <EventFacts event={event} />
        <EventOwner event={event} />
      </div>
      <LotsPanel event={event} />
      <FormFieldsPanel event={event} />
      <ActivitiesPanel event={event} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <Panel>
      <div className="p-4">
        <p className="text-xs font-semibold text-app-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-app-foreground">
          {value}
        </p>
        <p className="mt-1 text-xs text-app-muted-foreground">{hint}</p>
      </div>
    </Panel>
  );
}

function EventFacts({ event }: { event: EventReadModel }) {
  const place =
    event.props.modality === "online"
      ? event.props.onlineUrl
      : event.props.address
        ? [
            event.props.address.street,
            event.props.address.number,
            event.props.address.complement,
            event.props.address.neighborhood,
            event.props.address.municipality,
            event.props.address.state,
          ]
            .filter(Boolean)
            .join(", ")
        : "—";
  return (
    <Panel>
      <PanelHeader title="Detalhes" />
      <dl className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <DetailValue
          label="Modalidade"
          value={event.props.modality === "online" ? "Online" : "Presencial"}
          icon={
            event.props.modality === "online" ? (
              <MonitorPlay className="h-4 w-4" aria-hidden="true" />
            ) : (
              <MapPin className="h-4 w-4" aria-hidden="true" />
            )
          }
        />
        <DetailValue
          label="Cobrança"
          value={event.props.chargeType === "gratuito" ? "Gratuito" : "Pago"}
          icon={<Ticket className="h-4 w-4" aria-hidden="true" />}
        />
        <DetailValue
          label="Início"
          value={formatDate({ value: event.props.startAt, withTime: true })}
          icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
        />
        <DetailValue
          label="Término"
          value={formatDate({ value: event.props.endAt, withTime: true })}
        />
        <DetailValue
          label="Inscrições"
          value={`${formatDate({ value: event.props.registrationStartAt, withTime: true })} – ${formatDate({ value: event.props.registrationEndAt, withTime: true })}`}
        />
        <DetailValue
          label={event.props.modality === "online" ? "Link privado" : "Local"}
          value={place ?? "—"}
          className="sm:col-span-2"
        />
        <DetailValue
          label="Resumo"
          value={event.props.summary}
          className="sm:col-span-2"
        />
        <DetailValue
          label="Descrição"
          value={event.props.description}
          className="sm:col-span-2"
        />
      </dl>
    </Panel>
  );
}

function EventOwner({ event }: { event: EventReadModel }) {
  return (
    <Panel>
      <PanelHeader title="Responsável e certificados" />
      <dl className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <DetailValue label="Responsável" value={event.props.responsibleName} />
        <DetailValue label="E-mail" value={event.props.responsibleEmail} />
        <DetailValue
          label="Emissão de certificados"
          value={event.props.certificateEnabled ? "Habilitada" : "Desabilitada"}
        />
        <DetailValue
          label="Carga horária"
          value={
            event.props.certificateEnabled
              ? `${event.props.workloadHours} h`
              : "—"
          }
        />
        <DetailValue
          label="Lista de espera"
          value={event.props.allowsWaitlist ? "Habilitada" : "Desabilitada"}
        />
        <DetailValue
          label="Criado por"
          value={event.props.createdByGlobalUserId}
        />
      </dl>
    </Panel>
  );
}

function DetailValue({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="flex items-center gap-1.5 text-xs text-app-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 break-words whitespace-pre-line text-sm font-medium text-app-foreground">
        {value}
      </dd>
    </div>
  );
}

function LotsPanel({ event }: { event: EventReadModel }) {
  return (
    <Panel>
      <PanelHeader
        title="Lotes"
        description={
          event.lots.length
            ? `${event.lots.length} lote(s) configurado(s)`
            : "Sem lotes cadastrados"
        }
      />
      {event.lots.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <caption className="sr-only">Lotes do evento</caption>
            <thead>
              <tr className="border-b border-app-border">
                {["Nome", "Preço", "Vendidos", "Período", "Situação"].map(
                  (label) => (
                    <th
                      key={label}
                      scope="col"
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-app-muted-foreground"
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {event.lots.map((lot) => (
                <tr
                  key={lot.id}
                  className="border-b border-app-border last:border-0"
                >
                  <td className="px-4 py-3 text-sm font-semibold text-app-foreground">
                    {lot.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-app-muted-foreground">
                    {formatCurrency({ cents: lot.priceCents })}
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums text-app-muted-foreground">
                    {lot.soldCount} / {lot.maxQuantity}
                  </td>
                  <td className="px-4 py-3 text-xs text-app-muted-foreground">
                    {formatDate({ value: lot.startAt, withTime: true })}
                    <br />
                    até {formatDate({ value: lot.endAt, withTime: true })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={lot.active ? "success" : "muted"}>
                      {lot.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 sm:p-5">
          <Empty
            title="Nenhum lote"
            description={
              event.props.chargeType === "pago"
                ? "Este evento pago ainda não tem lotes configurados."
                : "Eventos gratuitos não precisam de lotes."
            }
          />
        </div>
      )}
    </Panel>
  );
}

function FormFieldsPanel({ event }: { event: EventReadModel }) {
  return (
    <Panel>
      <PanelHeader
        title="Formulário de inscrição"
        description={`${event.formFields.length} campo(s) adicional(is)`}
      />
      {event.formFields.length ? (
        <div className="divide-y divide-app-border">
          {event.formFields.map((field, index) => (
            <div
              key={field.id}
              className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 sm:px-5"
            >
              <div>
                <p className="text-sm font-semibold text-app-foreground">
                  {index + 1}. {field.label}{" "}
                  {field.required ? (
                    <span className="text-app-danger" aria-label="obrigatório">
                      *
                    </span>
                  ) : null}
                </p>
                {field.description ? (
                  <p className="mt-1 text-xs text-app-muted-foreground">
                    {field.description}
                  </p>
                ) : null}
                {field.options.length ? (
                  <p className="mt-1 text-xs text-app-muted-foreground">
                    Opções: {field.options.join(" · ")}
                  </p>
                ) : null}
              </div>
              <Badge tone="muted">{field.type.replaceAll("_", " ")}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 sm:p-5">
          <Empty
            title="Sem campos adicionais"
            description="O formulário de inscrição utilizará os dados padrão da pessoa participante."
          />
        </div>
      )}
    </Panel>
  );
}

function ActivitiesPanel({ event }: { event: EventReadModel }) {
  return (
    <Panel>
      <PanelHeader
        title="Programação"
        description={`${event.activities.length} atividade(s)`}
      />
      {event.activities.length ? (
        <div className="divide-y divide-app-border">
          {event.activities.map((activity) => (
            <article key={activity.id} className="space-y-1 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-app-foreground">
                  {activity.title}
                </h3>
                <span className="text-xs text-app-muted-foreground">
                  {formatDate({ value: activity.startAt, withTime: true })} –{" "}
                  {formatDate({ value: activity.endAt, withTime: true })}
                </span>
              </div>
              <p className="text-xs text-app-muted-foreground">
                {activity.speakerName}
                {activity.room ? ` · ${activity.room}` : ""}
              </p>
              {activity.description ? (
                <p className="whitespace-pre-line text-xs text-app-muted-foreground">
                  {activity.description}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="p-4 sm:p-5">
          <Empty
            title="Programação não cadastrada"
            description="Nenhuma atividade foi adicionada a este evento."
          />
        </div>
      )}
    </Panel>
  );
}

function statusLabel(status: EventStatus): string {
  const labels: Record<EventStatus, string> = {
    rascunho: "Rascunho",
    agendado: "Agendado",
    inscricoes_abertas: "Inscrições abertas",
    inscricoes_encerradas: "Inscrições encerradas",
    em_andamento: "Em andamento",
    finalizado: "Finalizado",
    cancelado: "Cancelado",
  };
  return labels[status];
}
