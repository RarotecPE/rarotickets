"use client";

import { useState } from "react";
import { CheckCircle2, CreditCard, ShieldCheck, XCircle } from "lucide-react";
import {
  ticketingApi,
  type MockPaymentStatus,
} from "@/client/services/ticketing-api.service";
import {
  Badge,
  Button,
  InlineAlert,
  Panel,
  PanelHeader,
} from "@/components/ui";

export type MockCheckoutProps = { referenceId: string };

export function MockCheckout({ referenceId }: MockCheckoutProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedStatus, setCompletedStatus] =
    useState<MockPaymentStatus | null>(null);
  const [hasOpener] = useState(
    () => typeof window !== "undefined" && Boolean(window.opener && !window.opener.closed),
  );

  function notifyParentWindow(status: MockPaymentStatus): void {
    if (typeof window === "undefined") return;
    const payload = {
      type: "PAYMENT_COMPLETED",
      status,
      referenceId,
      at: Date.now(),
    };
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(payload, "*");
      }
    } catch {
      // Ignora restrições de cross-origin caso existam
    }
    try {
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("rarotickets-payment");
        channel.postMessage(payload);
        channel.close();
      }
    } catch {
      // BroadcastChannel indisponível
    }
    try {
      window.localStorage.setItem(
        "rarotickets:last-payment-update",
        JSON.stringify(payload),
      );
    } catch {
      // localStorage indisponível
    }
  }

  async function simulatePayment(status: MockPaymentStatus): Promise<void> {
    setProcessing(true);
    setError(null);
    try {
      await ticketingApi.simulateMockPayment({ referenceId, status });
      setCompletedStatus(status);
      notifyParentWindow(status);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "A simulação de pagamento não está disponível.",
      );
    } finally {
      setProcessing(false);
    }
  }

  if (!referenceId)
    return (
      <Panel>
        <div className="p-5">
          <InlineAlert tone="danger">
            A referência desta cobrança está ausente.
          </InlineAlert>
        </div>
      </Panel>
    );
  if (completedStatus)
    return (
      <Panel>
        <PanelHeader
          title="Resultado da simulação"
          right={
            <Badge tone={completedStatus === "pago" ? "success" : "warning"}>
              {completedStatus === "pago"
                ? "Aprovado"
                : completedStatus === "recusado"
                  ? "Recusado"
                  : "Cancelado"}
            </Badge>
          }
        />
        <div className="flex flex-col items-center gap-3 p-6 text-center sm:p-8">
          <div
            className={`rounded-app-pill p-3 ${completedStatus === "pago" ? "bg-app-success/10 text-app-success" : "bg-app-warning/10 text-app-warning"}`}
          >
            {completedStatus === "pago" ? (
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            ) : (
              <XCircle className="h-7 w-7" aria-hidden="true" />
            )}
          </div>
          <h2 className="text-lg font-bold text-app-foreground">
            {completedStatus === "pago"
              ? "Pagamento registrado"
              : "Pagamento não aprovado"}
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-app-muted-foreground">
            {hasOpener
              ? "A janela principal do RaroTickets já foi notificada automaticamente sobre o resultado desta transação."
              : "Volte à Área do Participante para atualizar o status da inscrição. A confirmação depende do processamento da notificação de pagamento."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {hasOpener ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  notifyParentWindow(completedStatus);
                  window.close();
                }}
              >
                Fechar janela e voltar à inscrição
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                notifyParentWindow(completedStatus);
                window.location.assign(
                  `/ingressos/checkout-retorno?status=${completedStatus}`,
                );
              }}
            >
              Continuar
            </Button>
          </div>
        </div>
      </Panel>
    );

  return (
    <Panel>
      <PanelHeader
        title="Checkout de demonstração"
        description="Ambiente de teste do RaroTickets; nenhum pagamento real será realizado."
        right={
          <Badge tone="warning">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Sandbox
          </Badge>
        }
      />
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <InlineAlert>
          Selecione um resultado para testar a confirmação via webhook. Em
          produção, este checkout simulado fica desativado.
        </InlineAlert>
        {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
        <div className="rounded-app-md border border-app-border bg-app-surface-elevated/40 p-3">
          <p className="text-xs text-app-muted-foreground">
            Referência da inscrição
          </p>
          <p className="mt-1 break-all font-mono text-xs font-semibold text-app-foreground">
            {referenceId}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button
            type="button"
            disabled={processing}
            onClick={() => void simulatePayment("pago")}
          >
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            {processing ? "Processando…" : "Aprovar pagamento"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={processing}
            onClick={() => void simulatePayment("recusado")}
          >
            Recusar
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={processing}
            onClick={() => void simulatePayment("cancelado")}
          >
            Cancelar pagamento
          </Button>
        </div>
      </div>
    </Panel>
  );
}
