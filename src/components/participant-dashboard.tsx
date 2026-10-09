"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Award,
  CalendarDays,
  Clock3,
  CreditCard,
  LogOut,
  MapPin,
  MonitorPlay,
  QrCode,
  RefreshCw,
  User,
} from "lucide-react";
import { participantApi } from "@/client/services/participant-api.service";
import type { ParticipantEventItem } from "@/modules/ticketing/domain/participants/repositories/participant-auth-repository.interface";
import { useParticipantAuth } from "@/components/participant-auth-provider";
import {
  Badge,
  Button,
  Empty,
  InlineAlert,
  Spinner,
  Stat,
  btnPrimary,
  btnSecondary,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";

export function ParticipantDashboard() {
  const router = useRouter();
  const { participant, isAuthenticated, isLoading: authLoading, logout } = useParticipantAuth();

  const [events, setEvents] = useState<ParticipantEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/participante/login?redirect=/participante");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let active = true;
    async function fetchEvents() {
      try {
        const response = await participantApi.getMyEvents();
        if (active) setEvents(response.events);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Não foi possível carregar seus eventos.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchEvents();
    return () => {
      active = false;
    };
  }, [isAuthenticated, reloadVersion]);

  if (authLoading || (!isAuthenticated && !participant)) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center px-4 py-20">
        <Spinner label="Carregando Área do Participante…" />
      </div>
    );
  }

  const confirmedCount = events.filter((e) => e.status === "confirmada").length;
  const pendingCount = events.filter(
    (e) => e.status === "aguardando_pagamento" || e.status === "pendente",
  ).length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 pb-16 sm:px-6 lg:px-8 lg:py-8">
      {/* Banner do Perfil do Participante */}
      <section className="flex flex-col justify-between gap-4 rounded-app-lg border border-app-border bg-app-surface p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-app-primary/10 text-app-primary">
            <User className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-app-foreground sm:text-2xl">
                {participant?.name}
              </h1>
              <Badge tone="primary">Participante</Badge>
            </div>
            <p className="mt-1 text-xs text-app-muted-foreground sm:text-sm">
              {participant?.email}
              {participant?.cpf ? ` · CPF: ${participant.cpf}` : ""}
              {participant?.phone ? ` · Tel: ${participant.phone}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/eventos" className={`${btnSecondary} h-9 text-xs sm:text-sm`}>
            Explorar mais eventos
          </Link>
          <Button
            variant="ghost"
            compact
            onClick={async () => {
              await logout();
              router.push("/");
            }}
            className="text-app-muted-foreground hover:text-app-danger"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </Button>
        </div>
      </section>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Total de inscrições" value={events.length} />
        <Stat label="Inscrições confirmadas" value={confirmedCount} />
        <Stat label="Pendentes / Em espera" value={pendingCount} className="col-span-2 sm:col-span-1" />
      </div>

      {/* Lista de Inscrições / Eventos */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-app-foreground">
              Minhas Inscrições
            </h2>
            <p className="text-xs text-app-muted-foreground">
              Acompanhe o status, credenciais e certificados dos seus eventos.
            </p>
          </div>
          <Button
            variant="secondary"
            compact
            onClick={() => {
              setLoading(true);
              setError(null);
              setReloadVersion((v) => v + 1);
            }}
            disabled={loading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Atualizar
          </Button>
        </div>

        {error && (
          <InlineAlert tone="danger" className="flex items-center justify-between">
            {error}
            <Button
              compact
              variant="secondary"
              onClick={() => {
                setError(null);
                setLoading(true);
                setReloadVersion((v) => v + 1);
              }}
            >
              Tentar novamente
            </Button>
          </InlineAlert>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-app-lg border border-app-border bg-app-surface"
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <Empty
            title="Nenhuma inscrição encontrada"
            description="Você ainda não está inscrito em nenhum evento. Que tal explorar os eventos disponíveis agora mesmo?"
            action={
              <Link
                href="/eventos"
                className="inline-flex h-9 items-center justify-center rounded-app-md bg-app-primary px-4 text-xs font-semibold text-white hover:brightness-110"
              >
                Ver eventos disponíveis
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {events.map((eventItem) => (
              <ParticipantEventCard
                key={eventItem.registrationId}
                item={eventItem}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ParticipantEventCard({ item }: { item: ParticipantEventItem }) {
  const isOnline = item.modality === "online";
  const isConfirmed = item.status === "confirmada";
  const isPendingPayment =
    item.status === "aguardando_pagamento" || item.status === "pendente";
  const isWaitlist = item.status === "lista_espera";

  const statusTone = isConfirmed
    ? "success"
    : isPendingPayment
      ? "warning"
      : isWaitlist
        ? "primary"
        : "danger";

  const statusLabel = isConfirmed
    ? "Confirmada"
    : isPendingPayment
      ? "Aguardando pagamento"
      : isWaitlist
        ? "Lista de espera"
        : "Cancelada";

  return (
    <article className="flex flex-col justify-between overflow-hidden rounded-app-lg border border-app-border bg-app-surface p-5 transition hover:border-app-primary/40">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Badge tone={statusTone}>{statusLabel}</Badge>
          <span className="font-mono text-xs font-semibold text-app-muted-foreground">
            {item.registrationCode}
          </span>
        </div>

        <div>
          <Link
            href={`/eventos/${item.eventSlug}`}
            className="text-base font-bold text-app-foreground hover:text-app-primary hover:underline"
          >
            {item.eventTitle}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-app-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDate({ value: item.eventStartAt, withTime: true })}
            </span>
            <span className="inline-flex items-center gap-1">
              {isOnline ? (
                <>
                  <MonitorPlay className="h-3.5 w-3.5" aria-hidden="true" />
                  Online
                </>
              ) : (
                <>
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.location || "Presencial"}
                </>
              )}
            </span>
          </div>
        </div>

        {item.lotName && (
          <p className="text-xs text-app-muted-foreground">
            Lote: <strong className="text-app-foreground">{item.lotName}</strong>
            {item.finalCents > 0
              ? ` · ${formatCurrency({ cents: item.finalCents })}`
              : " · Gratuito"}
          </p>
        )}

        {isPendingPayment && item.reservationExpiresAt && (
          <div className="flex items-center gap-1.5 text-xs text-amber-500">
            <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Reserva válida até{" "}
              {formatDate({ value: item.reservationExpiresAt, withTime: true })}
            </span>
          </div>
        )}
      </div>

      {/* Ações da Inscrição */}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-app-border pt-4">
        {/* Link do Ingresso / QR Code */}
        {item.accessToken && (
          <Link
            href={`/ingressos/${item.accessToken}`}
            className={`${btnPrimary} h-8 gap-1.5 px-3 text-xs`}
          >
            <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
            Ver Ingresso / QR Code
          </Link>
        )}

        {/* Botão de Pagamento se pendente */}
        {isPendingPayment && item.checkoutUrl && (
          <a
            href={item.checkoutUrl}
            target="_blank"
            rel="noreferrer"
            className={`${btnSecondary} h-8 gap-1.5 px-3 text-xs`}
          >
            <CreditCard className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
            Pagar no PagBank
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </a>
        )}

        {/* Link da Transmissão se online e confirmado */}
        {isConfirmed && isOnline && item.onlineUrl && (
          <a
            href={item.onlineUrl}
            target="_blank"
            rel="noreferrer"
            className={`${btnSecondary} h-8 gap-1.5 px-3 text-xs`}
          >
            <MonitorPlay className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
            Acessar Transmissão
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </a>
        )}

        {/* Certificado se emitido */}
        {item.certificateCode && (
          <Link
            href={`/certificados/${item.certificateCode}`}
            className={`${btnSecondary} h-8 gap-1.5 px-3 text-xs`}
          >
            <Award className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
            Ver Certificado
          </Link>
        )}
      </div>
    </article>
  );
}
