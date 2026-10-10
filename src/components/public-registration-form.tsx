"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  LogIn,
  QrCode,
  TicketCheck,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { participantApi } from "@/client/services/participant-api.service";
import type { ParticipantEventItem } from "@/modules/ticketing/domain/participants/repositories/participant-auth-repository.interface";
import { useParticipantAuth } from "@/components/participant-auth-provider";
import { Badge, InlineAlert, Panel, PanelHeader, Spinner } from "@/components/ui";
import type { EventReadModel } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import { formatDate } from "@/lib/utils";

export type PublicRegistrationFormProps = { event: EventReadModel };

export function PublicRegistrationForm({ event }: PublicRegistrationFormProps) {
  const { participant: authParticipant, isAuthenticated, isLoading: authLoading } =
    useParticipantAuth();
  const [now, setNow] = useState(() => new Date());
  const [existingRegistration, setExistingRegistration] =
    useState<ParticipantEventItem | null>(null);
  const [loadedForKey, setLoadedForKey] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const lookupKey =
    isAuthenticated && authParticipant
      ? `${authParticipant.id}:${event.id}:${event.props.slug}`
      : null;

  useEffect(() => {
    if (!lookupKey) return;
    let active = true;

    participantApi
      .getMyEvents()
      .then((response) => {
        if (!active) return;
        const found =
          response.events.find(
            (item) =>
              (item.eventId === event.id ||
                item.eventSlug === event.props.slug) &&
              item.status !== "cancelada",
          ) ?? null;
        setExistingRegistration(found);
        setLoadedForKey(lookupKey);
      })
      .catch(() => {
        if (!active) return;
        setExistingRegistration(null);
        setLoadedForKey(lookupKey);
      });

    return () => {
      active = false;
    };
  }, [lookupKey, event.id, event.props.slug]);

  const checkingExistingRegistration =
    authLoading || (Boolean(lookupKey) && loadedForKey !== lookupKey);

  // If authenticated and still checking whether participant already registered
  if (checkingExistingRegistration) {
    return (
      <Panel>
        <PanelHeader title="Inscrição no evento" />
        <div className="p-5">
          <Spinner label="Verificando sua inscrição…" />
        </div>
      </Panel>
    );
  }

  // If participant already has an active registration for this event
  if (isAuthenticated && existingRegistration) {
    const isConfirmed = existingRegistration.status === "confirmada";
    const isPendingPayment =
      existingRegistration.status === "aguardando_pagamento" ||
      existingRegistration.status === "pendente";
    const isWaitlistStatus = existingRegistration.status === "lista_espera";

    return (
      <Panel className={isConfirmed ? "border-app-success/30" : undefined}>
        <PanelHeader
          title={
            isConfirmed
              ? "Inscrição já realizada"
              : isPendingPayment
                ? "Inscrição em andamento"
                : "Na lista de espera"
          }
          description={
            isConfirmed
              ? "Sua participação neste evento já está confirmada."
              : isPendingPayment
                ? "Você já possui uma inscrição aguardando confirmação de pagamento."
                : "Você já está registrado na lista de espera deste evento."
          }
          right={
            <Badge
              tone={
                isConfirmed
                  ? "success"
                  : isPendingPayment
                    ? "warning"
                    : "primary"
              }
            >
              {isConfirmed
                ? "Inscrito"
                : isPendingPayment
                  ? "Pendente"
                  : "Lista de espera"}
            </Badge>
          }
        />
        <div className="space-y-4 p-4 sm:p-5">
          <div
            className={`flex items-start gap-3 rounded-app-md border p-3.5 ${
              isConfirmed
                ? "border-app-success/30 bg-app-success/10 text-app-foreground"
                : isPendingPayment
                  ? "border-amber-500/30 bg-amber-500/10 text-app-foreground"
                  : "border-app-primary/30 bg-app-primary/10 text-app-foreground"
            }`}
          >
            {isConfirmed ? (
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-app-success"
                aria-hidden="true"
              />
            ) : (
              <Clock3
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"
                aria-hidden="true"
              />
            )}
            <div className="min-w-0 text-xs leading-relaxed">
              <p className="font-semibold text-app-foreground">
                {isConfirmed
                  ? "Inscrição realizada com sucesso!"
                  : isPendingPayment
                    ? "Inscrição registrada — aguardando pagamento"
                    : "Sua solicitação na lista de espera já foi registrada"}
              </p>
              <p className="mt-0.5 text-app-muted-foreground">
                Código:{" "}
                <strong className="font-mono text-app-foreground">
                  {existingRegistration.registrationCode}
                </strong>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {existingRegistration.accessToken ? (
              <Link
                href={`/ingressos/${existingRegistration.accessToken}`}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-app-md bg-app-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                {isPendingPayment ? (
                  <>
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                    Acompanhar pagamento / Ingresso
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4" aria-hidden="true" />
                    {isWaitlistStatus
                      ? "Acompanhar inscrição"
                      : "Ver ingresso e QR Code"}
                  </>
                )}
              </Link>
            ) : null}

            <Link
              href="/participante"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-app-md border border-app-border bg-app-surface-elevated px-4 text-sm font-semibold text-app-foreground transition hover:bg-app-surface"
            >
              Ir para Minhas Inscrições
            </Link>
          </div>
        </div>
      </Panel>
    );
  }

  const registrationStart = toDate(event.props.registrationStartAt);
  const registrationEnd = toDate(event.props.registrationEndAt);
  const eventPublished =
    event.props.status === "agendado" ||
    event.props.status === "inscricoes_abertas";
  const registrationOpen =
    eventPublished && now >= registrationStart && now <= registrationEnd;
  const remaining = Math.max(
    0,
    event.props.maxCapacity -
      event.capacity.confirmed -
      event.capacity.reserved,
  );
  const isWaitlist = remaining === 0 && event.props.allowsWaitlist;
  const availableLots = event.lots.filter(
    (lot) =>
      lot.active &&
      now >= toDate(lot.startAt) &&
      now <= toDate(lot.endAt) &&
      lot.soldCount < lot.maxQuantity,
  );
  const requiresLot = event.props.chargeType === "pago" && !isWaitlist;

  const confirmationUrl = `/eventos/${encodeURIComponent(event.props.slug)}/confirmacao`;

  if (!registrationOpen) {
    return <RegistrationAvailability event={event} now={now} />;
  }

  if (remaining === 0 && !event.props.allowsWaitlist) {
    return (
      <Panel>
        <PanelHeader title="Inscrições indisponíveis" />
        <div className="p-4 sm:p-5">
          <InlineAlert tone="danger">
            As vagas deste evento se esgotaram e não há lista de espera.
          </InlineAlert>
        </div>
      </Panel>
    );
  }

  if (requiresLot && availableLots.length === 0) {
    return (
      <Panel>
        <PanelHeader title="Lotes indisponíveis" />
        <div className="p-4 sm:p-5">
          <InlineAlert>
            Não há lotes com vagas disponíveis neste momento. Tente novamente mais tarde.
          </InlineAlert>
        </div>
      </Panel>
    );
  }

  // When not logged in, prompt user to register or log in
  if (!authLoading && !isAuthenticated) {
    return (
      <Panel>
        <PanelHeader
          title={isWaitlist ? "Entrar na lista de espera" : "Inscrição no evento"}
          description="Para participar dos eventos, é obrigatório estar cadastrado e conectado."
        />
        <div className="space-y-4 p-4 sm:p-5">
          <InlineAlert tone="info">
            Para garantir sua vaga e acessar sua credencial, você precisa estar conectado à sua conta de participante.
          </InlineAlert>
          <div className="space-y-2 pt-2">
            <Link
              href={`/participante/cadastro?redirect=${encodeURIComponent(confirmationUrl)}`}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-app-md bg-app-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Cadastre-se para se inscrever
            </Link>
            <Link
              href={`/participante/login?redirect=${encodeURIComponent(confirmationUrl)}`}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-app-md border border-app-border bg-app-surface-elevated px-4 text-sm font-semibold text-app-foreground transition hover:bg-app-surface"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Já possui cadastro? Fazer login
            </Link>
          </div>
          <p className="text-center text-xs text-app-muted-foreground">
            O cadastro leva menos de um minuto e é gratuito.
          </p>
        </div>
      </Panel>
    );
  }

  // When user is connected: ONLY ONE BUTTON to register, opens confirmation page
  return (
    <Panel>
      <PanelHeader
        title={isWaitlist ? "Lista de espera" : "Inscrição no evento"}
        description={
          isWaitlist
            ? "Vagas esgotadas. Garanta seu lugar na lista de espera."
            : event.props.chargeType === "gratuito"
              ? "Evento gratuito. Prossiga para confirmar sua inscrição."
              : "Vagas limitadas. Prossiga para confirmar seu ingresso."
        }
      />
      <div className="space-y-4 p-4 sm:p-5">
        {authParticipant ? (
          <div className="flex items-center gap-2.5 rounded-app-md border border-app-border bg-app-surface-elevated/60 px-3 py-2.5 text-xs text-app-muted-foreground">
            <UserCheck className="h-4 w-4 shrink-0 text-app-primary" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-app-foreground">
                {authParticipant.name}
              </p>
              <p className="truncate text-[11px] text-app-muted-foreground">
                {authParticipant.email}
              </p>
            </div>
          </div>
        ) : null}

        {isWaitlist ? (
          <InlineAlert tone="info">
            Você será posicionado na lista de espera por ordem de chegada e notificado se uma vaga abrir.
          </InlineAlert>
        ) : null}

        <Link
          href={confirmationUrl}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-app-md bg-app-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
        >
          <TicketCheck className="h-4 w-4" aria-hidden="true" />
          {isWaitlist ? "Entrar na lista de espera" : "Realizar inscrição"}
        </Link>

        <p className="text-center text-[11px] leading-tight text-app-muted-foreground">
          Seus dados cadastrais serão utilizados automaticamente na etapa de confirmação.
        </p>
      </div>
    </Panel>
  );
}

export type RegistrationAvailabilityProps = { event: EventReadModel; now: Date };
function RegistrationAvailability({ event, now }: RegistrationAvailabilityProps) {
  const starts = toDate(event.props.registrationStartAt);
  const ends = toDate(event.props.registrationEndAt);
  const message =
    now < starts
      ? `As inscrições abrem em ${formatDate({ value: starts, withTime: true })}.`
      : now > ends
        ? "O período de inscrições deste evento foi encerrado."
        : "As inscrições ainda não estão liberadas para este evento.";
  return (
    <Panel>
      <PanelHeader title="Inscrições" />
      <div className="space-y-3 p-4 sm:p-5">
        <InlineAlert>{message}</InlineAlert>
        {event.props.status === "agendado" ? (
          <p className="text-xs text-app-muted-foreground">
            Acompanhe esta página para saber quando as vagas forem liberadas.
          </p>
        ) : null}
      </div>
    </Panel>
  );
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
