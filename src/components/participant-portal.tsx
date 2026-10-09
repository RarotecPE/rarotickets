"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  Clock3,
  Download,
  MapPin,
  MonitorPlay,
  Printer,
  RefreshCw,
  Ticket,
} from "lucide-react";
import { ticketingApi } from "@/client/services/ticketing-api.service";
import type { ParticipantPortalView } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import {
  Badge,
  Button,
  Empty,
  InlineAlert,
  Panel,
  PanelHeader,
  Spinner,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";

export type ParticipantPortalProps = { accessToken: string };

export function ParticipantPortal({ accessToken }: ParticipantPortalProps) {
  const [portal, setPortal] = useState<ParticipantPortalView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadPortal(): Promise<void> {
      try {
        const result = await ticketingApi.getParticipantPortal({ accessToken });
        if (active) setPortal(result);
      } catch (caught) {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : "Não foi possível abrir sua Área do Participante.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadPortal();
    return () => {
      active = false;
    };
  }, [accessToken, reloadVersion]);

  async function startCheckout(): Promise<void> {
    setCheckoutError(null);
    setCheckoutLoading(true);
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    try {
      const checkout = await ticketingApi.startParticipantCheckout({
        accessToken,
      });
      if (popup) popup.location.href = checkout.checkoutUrl;
      else window.location.assign(checkout.checkoutUrl);
    } catch (caught) {
      popup?.close();
      setCheckoutError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível iniciar o pagamento.",
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function copyCode(): Promise<void> {
    if (!portal) return;
    try {
      await navigator.clipboard.writeText(portal.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCheckoutError(
        "Não foi possível copiar o código. Selecione-o manualmente.",
      );
    }
  }

  function retry(): void {
    setLoading(true);
    setError(null);
    setReloadVersion((current) => current + 1);
  }

  if (loading)
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-8 sm:px-6">
        <Spinner label="Carregando Área do Participante…" />
        <Panel>
          <div className="h-56 animate-pulse rounded-app-md bg-app-surface-elevated" />
        </Panel>
      </div>
    );
  if (error)
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
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
      </div>
    );
  if (!portal)
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <Panel>
          <div className="p-5">
            <Empty
              title="Link indisponível"
              description="Este link não é válido ou expirou. Consulte o e-mail da inscrição para obter um novo acesso."
              action={
                <Link
                  href="/eventos"
                  className="text-sm font-semibold text-app-primary hover:underline"
                >
                  Explorar eventos
                </Link>
              }
            />
          </div>
        </Panel>
      </div>
    );

  const confirmed = portal.status === "confirmada";
  const waitingPayment =
    portal.status === "aguardando_pagamento" || portal.status === "pendente";
  const status = statusConfig(portal.status);
  const place = portal.modality === "online" ? null : portal.location;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6 pb-12 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-app-primary">
            Área do Participante
          </p>
          <h1 className="mt-1 text-xl font-bold text-app-foreground">
            Olá, {portal.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-xs text-app-muted-foreground">
            Acompanhe sua inscrição, pagamento e credencial.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={retry}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Atualizar
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Imprimir
          </Button>
        </div>
      </div>
      {checkoutError ? (
        <InlineAlert tone="danger">{checkoutError}</InlineAlert>
      ) : null}
      <Panel>
        <PanelHeader
          title={portal.eventTitle}
          description={formatDate({
            value: portal.eventStartAt,
            withTime: true,
          })}
          right={<Badge tone={status.tone}>{status.label}</Badge>}
        />
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <PortalDetail
            icon={<Ticket className="h-4 w-4" aria-hidden="true" />}
            label="Código da inscrição"
            value={portal.code}
          />
          <PortalDetail
            icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
            label="Data do evento"
            value={`${formatDate({ value: portal.eventStartAt, withTime: true })} – ${formatDate({ value: portal.eventEndAt, withTime: true })}`}
          />
          <PortalDetail
            icon={
              portal.modality === "online" ? (
                <MonitorPlay className="h-4 w-4" aria-hidden="true" />
              ) : (
                <MapPin className="h-4 w-4" aria-hidden="true" />
              )
            }
            label={portal.modality === "online" ? "Modalidade" : "Local"}
            value={
              portal.modality === "online" ? "Online" : (place ?? "A confirmar")
            }
          />
          <PortalDetail
            label="Ingresso"
            value={
              portal.lotName ?? (portal.finalCents === 0 ? "Gratuito" : "—")
            }
          />
          <PortalDetail
            label="Valor"
            value={formatCurrency({ cents: portal.finalCents })}
          />
          <PortalDetail label="E-mail" value={portal.email} />
        </div>
      </Panel>

      {waitingPayment ? (
        <Panel>
          <PanelHeader
            title="Pagamento"
            description={
              portal.waitlistExpiresAt
                ? "Uma vaga foi liberada para você. Conclua o pagamento em até 24 horas."
                : "A reserva temporária da vaga tem duração de 15 minutos."
            }
          />
          <div className="space-y-3 p-4 sm:p-5">
            {portal.reservationExpiresAt ? (
              <p className="inline-flex items-center gap-2 text-sm text-app-muted-foreground">
                <Clock3
                  className="h-4 w-4 text-app-warning"
                  aria-hidden="true"
                />
                {portal.waitlistExpiresAt
                  ? "Prazo para confirmar a vaga: "
                  : "Prazo da reserva: "}
                {formatDate({
                  value: portal.waitlistExpiresAt ?? portal.reservationExpiresAt,
                  withTime: true,
                })}
              </p>
            ) : null}
            <p className="text-xs leading-relaxed text-app-muted-foreground">
              Finalize o pagamento pelo checkout seguro para confirmar sua
              participação. O RaroTickets não coleta dados de cartão.
            </p>
            <Button
              type="button"
              disabled={checkoutLoading}
              onClick={() => void startCheckout()}
            >
              {checkoutLoading ? (
                "Abrindo checkout…"
              ) : (
                <>
                  Continuar para pagamento
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </Panel>
      ) : null}

      {confirmed ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
          <ParticipantCredential
            qrPayload={portal.qrPayload}
            code={portal.code}
            onCopy={copyCode}
            copied={copied}
          />
          <div className="flex flex-col gap-5">
            <Panel>
              <PanelHeader title="Orientações" />
              <div className="space-y-3 p-4 sm:p-5">
                <InlineAlert tone="success">
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Sua inscrição está confirmada.
                  </span>
                </InlineAlert>
                {portal.modality === "online" && portal.onlineUrl ? (
                  <div className="rounded-app-md border border-app-border bg-app-surface-elevated/40 p-3">
                    <p className="text-xs font-semibold text-app-foreground">
                      Link de acesso
                    </p>
                    <a
                      href={portal.onlineUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex break-all text-xs font-medium text-app-primary underline"
                    >
                      {portal.onlineUrl}
                    </a>
                  </div>
                ) : null}
                <p className="text-xs leading-relaxed text-app-muted-foreground">
                  Apresente sua credencial na entrada. O QR Code é individual e
                  não deve ser compartilhado.
                </p>
              </div>
            </Panel>
            {portal.certificateCode ? (
              <Panel>
                <PanelHeader
                  title="Certificado disponível"
                  description="Valide a autenticidade do certificado emitido."
                  right={<Badge tone="success">Emitido</Badge>}
                />
                <div className="p-4 sm:p-5">
                  <p className="font-mono text-sm font-semibold text-app-foreground">
                    {portal.certificateCode}
                  </p>
                  <Link
                    href={`/certificados/${encodeURIComponent(portal.certificateCode)}`}
                    className="mt-3 inline-flex h-9 items-center gap-2 rounded-app-md bg-app-primary px-3 text-xs font-semibold text-white hover:brightness-110"
                  >
                    Verificar certificado
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </Panel>
            ) : null}
          </div>
        </div>
      ) : null}
      {portal.status === "lista_espera" ? (
        <InlineAlert>
          Você está na lista de espera. Acompanhe o e-mail informado para
          receber atualizações sobre disponibilidade.
        </InlineAlert>
      ) : null}
      {portal.status === "cancelada" ? (
        <InlineAlert tone="danger">
          Esta inscrição foi cancelada. Consulte a organização do evento caso
          precise de ajuda.
        </InlineAlert>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/eventos/${portal.eventSlug}`}
          className="text-xs font-semibold text-app-primary hover:underline"
        >
          Voltar à página do evento
        </Link>
        <Button
          type="button"
          compact
          variant="secondary"
          onClick={() => void copyCode()}
        >
          <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
          {copied ? "Copiado" : "Copiar código"}
        </Button>
      </div>
    </div>
  );
}

function ParticipantCredential({
  qrPayload,
  code,
  onCopy,
  copied,
}: {
  qrPayload: string | null;
  code: string;
  onCopy: () => void;
  copied: boolean;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!qrPayload)
      return () => {
        active = false;
      };
    void QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
      color: { dark: "#111827", light: "#ffffff" },
    })
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (active)
          setQrError(
            "Não foi possível gerar o QR Code. Atualize a página para tentar novamente.",
          );
      });
    return () => {
      active = false;
    };
  }, [qrPayload]);

  return (
    <Panel>
      <PanelHeader
        title="Credencial digital"
        description="Apresente este QR Code no credenciamento."
        right={<Badge tone="success">Válida</Badge>}
      />
      <div className="flex flex-col items-center gap-3 p-4 text-center sm:p-5">
        {qrError ? (
          <InlineAlert tone="danger">{qrError}</InlineAlert>
        ) : qrDataUrl && qrPayload ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt={`QR Code da credencial ${code}`}
              className="h-56 w-56 rounded-app-md border border-app-border bg-white p-2"
            />
            <a
              href={qrDataUrl}
              download={`credencial-${code}.png`}
              className="inline-flex h-9 items-center gap-2 rounded-app-md border border-app-border bg-app-surface-elevated px-3 text-xs font-semibold text-app-foreground hover:bg-app-surface"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Baixar QR Code
            </a>
          </>
        ) : (
          <Spinner label="Gerando credencial…" />
        )}
        <p className="font-mono text-sm font-bold tracking-wide text-app-foreground">
          {code}
        </p>
        <p className="max-w-xs text-xs leading-relaxed text-app-muted-foreground">
          Guarde este código e o QR Code até o dia do evento.
        </p>
        <Button type="button" compact variant="secondary" onClick={onCopy}>
          <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
          {copied ? "Código copiado" : "Copiar código"}
        </Button>
      </div>
    </Panel>
  );
}

function PortalDetail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-app-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold text-app-foreground">
        {value}
      </dd>
    </div>
  );
}

function statusConfig(status: string): {
  label: string;
  tone: "success" | "warning" | "danger" | "primary" | "muted";
} {
  const statuses: Record<
    string,
    {
      label: string;
      tone: "success" | "warning" | "danger" | "primary" | "muted";
    }
  > = {
    confirmada: { label: "Confirmada", tone: "success" },
    aguardando_pagamento: { label: "Aguardando pagamento", tone: "warning" },
    pendente: { label: "Pendente", tone: "warning" },
    lista_espera: { label: "Lista de espera", tone: "primary" },
    cancelada: { label: "Cancelada", tone: "danger" },
  };
  return statuses[status] ?? { label: status, tone: "muted" };
}
