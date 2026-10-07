import Link from "next/link";
import type { Metadata } from "next";
import { Badge, InlineAlert, Panel, PanelHeader } from "@/components/ui";

type CheckoutReturnSearchParams = { status?: string };
type CheckoutReturnPageProps = {
  searchParams: Promise<CheckoutReturnSearchParams>;
};

export const metadata: Metadata = {
  title: "Retorno do pagamento · RaroTickets",
};

export default async function CheckoutReturnPage({
  searchParams,
}: CheckoutReturnPageProps) {
  const { status = "" } = await searchParams;
  const paid = status === "pago";
  const cancelled = status === "cancelado";
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Panel>
        <PanelHeader
          title="Retorno do pagamento"
          right={
            <Badge tone={paid ? "success" : cancelled ? "muted" : "warning"}>
              {paid
                ? "Pagamento recebido"
                : cancelled
                  ? "Checkout encerrado"
                  : "Aguardando confirmação"}
            </Badge>
          }
        />
        <div className="space-y-4 p-4 sm:p-5">
          <InlineAlert tone={paid ? "success" : "info"}>
            {paid
              ? "A notificação do pagamento foi processada. A confirmação da inscrição pode levar alguns instantes."
              : cancelled
                ? "O checkout foi encerrado sem confirmação do pagamento."
                : "O pagamento ainda pode estar sendo processado pelo provedor."}
          </InlineAlert>
          <p className="text-sm leading-relaxed text-app-muted-foreground">
            Volte à Área do Participante para atualizar o status da inscrição e
            conferir sua credencial. Use o link de acesso enviado ao e-mail
            cadastrado.
          </p>
          <Link
            href="/eventos"
            className="inline-flex h-10 items-center rounded-app-md border border-app-border bg-app-surface-elevated px-4 text-sm font-semibold text-app-foreground hover:bg-app-surface"
          >
            Explorar eventos
          </Link>
        </div>
      </Panel>
    </div>
  );
}
