"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  MonitorPlay,
  RefreshCw,
  Ticket,
} from "lucide-react";
import { PublicRegistrationForm } from "@/components/public-registration-form";
import {
  Badge,
  Button,
  Empty,
  InlineAlert,
  Panel,
  PanelHeader,
  Spinner,
} from "@/components/ui";
import { ticketingApi } from "@/client/services/ticketing-api.service";
import type { EventReadModel } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import { formatCurrency, formatDate } from "@/lib/utils";

export type PublicEventDetailProps = { slug: string };

export function PublicEventDetail({ slug }: PublicEventDetailProps) {
  const [event, setEvent] = useState<EventReadModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    ticketingApi
      .getPublicEvent({ slug })
      .then((result) => {
        if (active) setEvent(result);
      })
      .catch((caught: unknown) => {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : "Não foi possível carregar o evento.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, attempt]);

  function retryEvent(): void {
    setEvent(null);
    setLoading(true);
    setError(null);
    setAttempt((current) => current + 1);
  }

  if (loading)
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
        <Spinner label="Carregando detalhes do evento…" />
        <div className="h-80 animate-pulse rounded-app-lg border border-app-border bg-app-surface" />
      </div>
    );
  if (error)
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <InlineAlert
          tone="danger"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          {error}
          <Button compact variant="secondary" onClick={retryEvent}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Tentar novamente
          </Button>
        </InlineAlert>
      </div>
    );
  if (!event)
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <Empty
          title="Evento não encontrado"
          description="O evento pode ter sido removido ou não estar mais disponível para consulta."
          action={
            <Link
              href="/eventos"
              className="text-sm font-semibold text-app-primary hover:underline"
            >
              Voltar aos eventos
            </Link>
          }
        />
      </div>
    );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 pb-12 sm:px-6 lg:px-8 lg:py-8">
      <div>
        <Link
          href="/eventos"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-app-muted-foreground hover:text-app-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Todos os eventos
        </Link>
      </div>
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <EventHero event={event} />
          <Panel>
            <PanelHeader title="Sobre o evento" />
            <div className="space-y-4 p-4 text-sm leading-relaxed text-app-muted-foreground sm:p-5">
              <p className="whitespace-pre-line text-app-foreground">
                {event.props.description}
              </p>
              <EventLocation event={event} />
              <EventActivities event={event} />
            </div>
          </Panel>
        </div>
        <aside className="flex flex-col gap-5">
          <EventSummary event={event} />
          <PublicRegistrationForm event={event} />
        </aside>
      </section>
    </div>
  );
}

export type EventHeroProps = { event: EventReadModel };
function EventHero({ event }: EventHeroProps) {
  const online = event.props.modality === "online";
  return (
    <Panel className="overflow-hidden">
      <div className="relative flex min-h-56 items-end overflow-hidden bg-[radial-gradient(circle_at_80%_10%,rgba(37,99,235,.36),transparent_44%),linear-gradient(145deg,#111827,#0b0f17)] sm:min-h-80">
        {event.props.bannerUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.props.bannerUrl}
              alt={`Banner do evento ${event.props.title}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-blue-200">
            <Ticket className="h-14 w-14 opacity-70" aria-hidden="true" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />
        <div className="relative z-10 flex w-full flex-col gap-3 p-5 sm:p-7">
          <div className="flex flex-wrap gap-2">
            <Badge tone="primary">{online ? "Online" : "Presencial"}</Badge>
            <Badge
              tone={event.props.chargeType === "gratuito" ? "success" : "muted"}
            >
              {event.props.chargeType === "gratuito" ? "Gratuito" : "Pago"}
            </Badge>
            <EventStatusBadge status={event.props.status} />
          </div>
          <h1 className="max-w-3xl break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {event.props.title}
          </h1>
          <p className="max-w-2xl text-sm text-slate-200">
            {event.props.summary}
          </p>
        </div>
      </div>
    </Panel>
  );
}

export type EventSummaryProps = { event: EventReadModel };
function EventSummary({ event }: EventSummaryProps) {
  const remaining = Math.max(
    0,
    event.props.maxCapacity -
      event.capacity.confirmed -
      event.capacity.reserved,
  );
  const place =
    event.props.modality === "online"
      ? "Online"
      : event.props.address
        ? `${event.props.address.municipality}, ${event.props.address.state}`
        : "Local a definir";
  const minimumPrice =
    event.props.chargeType === "gratuito"
      ? 0
      : event.lots
          .filter((lot) => lot.active)
          .reduce<
            number | null
          >((minimum, lot) => (minimum === null ? lot.priceCents : Math.min(minimum, lot.priceCents)), null);
  return (
    <Panel>
      <PanelHeader title="Informações" />
      <div className="space-y-4 p-4 sm:p-5">
        <SummaryLine
          icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
          label="Data e hora"
          value={formatDate({ value: event.props.startAt, withTime: true })}
        />
        <SummaryLine
          icon={<Clock3 className="h-4 w-4" aria-hidden="true" />}
          label="Término"
          value={formatDate({ value: event.props.endAt, withTime: true })}
        />
        <SummaryLine
          icon={
            event.props.modality === "online" ? (
              <MonitorPlay className="h-4 w-4" aria-hidden="true" />
            ) : (
              <MapPin className="h-4 w-4" aria-hidden="true" />
            )
          }
          label="Local"
          value={place}
        />
        <div className="border-t border-app-border pt-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-app-muted-foreground">Investimento</p>
              <p className="mt-1 text-lg font-bold text-app-foreground">
                {minimumPrice === 0
                  ? "Gratuito"
                  : minimumPrice !== null
                    ? `A partir de ${formatCurrency({ cents: minimumPrice })}`
                    : "Consulte"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-app-muted-foreground">
                Vagas disponíveis
              </p>
              <p className="mt-1 text-lg font-bold text-app-foreground tabular-nums">
                {remaining}
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-app-muted-foreground">
          Inscrições até{" "}
          {formatDate({ value: event.props.registrationEndAt, withTime: true })}
        </p>
      </div>
    </Panel>
  );
}

export type SummaryLineProps = {
  icon: ReactNode;
  label: string;
  value: string;
};
function SummaryLine({ icon, label, value }: SummaryLineProps) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-app-primary">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-app-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium text-app-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

export type EventLocationProps = { event: EventReadModel };
function EventLocation({ event }: EventLocationProps) {
  if (event.props.modality === "online")
    return (
      <div className="rounded-app-md border border-app-border bg-app-surface-elevated/60 p-3">
        <p className="font-semibold text-app-foreground">Evento online</p>
        <p className="mt-1 text-xs">
          O link de acesso será disponibilizado na Área do Participante após a
          confirmação da inscrição.
        </p>
      </div>
    );
  if (!event.props.address) return null;
  const address = event.props.address;
  return (
    <div className="rounded-app-md border border-app-border bg-app-surface-elevated/60 p-3">
      <p className="font-semibold text-app-foreground">Local do evento</p>
      <p className="mt-1">
        {[
          address.street,
          address.number,
          address.complement,
          address.neighborhood,
          address.municipality,
          address.state,
        ]
          .filter(Boolean)
          .join(", ")}
      </p>
    </div>
  );
}

export type EventActivitiesProps = { event: EventReadModel };
function EventActivities({ event }: EventActivitiesProps) {
  if (!event.activities.length) return null;
  return (
    <section className="border-t border-app-border pt-4">
      <h2 className="text-sm font-bold text-app-foreground">Programação</h2>
      <div className="mt-3 space-y-3">
        {event.activities.map((activity) => (
          <article
            key={activity.id}
            className="rounded-app-md border border-app-border bg-app-surface-elevated/40 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-app-foreground">
                {activity.title}
              </h3>
              <span className="text-xs text-app-muted-foreground">
                {formatDate({ value: activity.startAt, withTime: true })}
              </span>
            </div>
            {activity.description ? (
              <p className="mt-2 whitespace-pre-line text-xs leading-relaxed">
                {activity.description}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-app-muted-foreground">
              {activity.speakerName}
              {activity.room ? ` · ${activity.room}` : ""}
            </p>
            {activity.speakerBio ? (
              <p className="mt-1 text-xs text-app-muted-foreground">
                {activity.speakerBio}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export type EventStatusBadgeProps = { status: string };
function EventStatusBadge({ status }: EventStatusBadgeProps) {
  const label =
    status === "inscricoes_abertas"
      ? "Inscrições abertas"
      : status === "agendado"
        ? "Em breve"
        : "Inscrições encerradas";
  const tone =
    status === "inscricoes_abertas"
      ? "success"
      : status === "agendado"
        ? "warning"
        : "muted";
  return <Badge tone={tone}>{label}</Badge>;
}
