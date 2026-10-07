"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Panel, PanelHeader, Empty, Badge, InlineAlert } from "@/components/ui";
import { REGISTRATION_STATUS_LABELS, EVENT_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/shared/utils/format";

type Ingresso = {
  id: string;
  code: string;
  status: string;
  finalPriceCents: number;
  event: { id: string; title: string; startsAt: string; endsAt: string; modality: string; status: string; streamUrl?: string | null };
  confirmedAt?: string | null;
  qrPayload?: string | null;
};

export default function MeusIngressosPage() {
  const [items, setItems] = useState<Ingresso[] | null>(null);
  const [email, setEmail] = useState("");
  const [doc, setDoc] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem("rt_email") ?? "";
    const savedDoc = localStorage.getItem("rt_doc") ?? "";
    if (savedEmail) setEmail(savedEmail);
    if (savedDoc) setDoc(savedDoc);
    if (savedEmail && savedDoc) void search(savedEmail, savedDoc);
  }, []);

  async function search(e: string, d: string) {
    setError(null);
    try {
      const res = await fetch(
        `/api/me/registrations?email=${encodeURIComponent(e)}&document=${encodeURIComponent(d)}`,
      );
      if (!res.ok) throw new Error((await res.json()).error?.message || "Não foi possível buscar");
      const data = await res.json();
      setItems(data.data);
      localStorage.setItem("rt_email", e);
      localStorage.setItem("rt_doc", d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
      setItems([]);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <PanelHeader title="Meus ingressos" description="Consulte suas inscrições por e-mail e documento" />
        <form
          className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:p-5"
          onSubmit={(e) => { e.preventDefault(); void search(email, doc); }}
        >
          <input className="h-10 rounded-app-md border border-app-border bg-app-surface px-3 text-sm"
            placeholder="E-mail" type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} required />
          <input className="h-10 rounded-app-md border border-app-border bg-app-surface px-3 text-sm"
            placeholder="CPF ou passaporte" value={doc} onChange={(ev) => setDoc(ev.target.value)} required />
          <button type="submit" className="h-10 rounded-app-md bg-app-primary text-sm font-semibold text-white hover:brightness-110">Buscar</button>
          {error && <div className="sm:col-span-3"><InlineAlert tone="danger">{error}</InlineAlert></div>}
        </form>
      </Panel>

      <Panel>
        <PanelHeader title="Ingressos encontrados" />
        <div className="p-4 sm:p-5">
          {items === null ? (
            <Empty title="Informe seus dados para buscar" description="Seus dados ficam armazenados apenas no seu navegador." />
          ) : items.length === 0 ? (
            <Empty title="Nenhum ingresso encontrado" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((i) => {
                const rs = REGISTRATION_STATUS_LABELS[i.status] ?? { label: i.status, tone: "muted" as const };
                return (
                  <Link
                    key={i.id}
                    href={`/inscricoes/${i.id}${i.status === "AGUARDANDO_PAGAMENTO" ? "/pagamento" : "/sucesso"}`}
                    className="block rounded-app-lg border border-app-border p-4 hover:bg-app-surface-elevated/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{i.event.title}</p>
                        <p className="text-xs text-app-muted-foreground">{formatDate(i.event.startsAt)}</p>
                      </div>
                      <Badge tone={rs.tone}>{rs.label}</Badge>
                    </div>
                    <p className="mt-3 font-mono text-xs text-app-muted-foreground">{i.code}</p>
                    {i.status === "CONFIRMADA" && (
                      <div className="mt-3 rounded-app-md border border-app-primary/30 bg-app-primary/5 p-2 font-mono text-[10px] break-all">
                        {i.qrPayload}
                      </div>
                    )}
                    {i.status === "AGUARDANDO_PAGAMENTO" && (
                      <p className="mt-2 text-xs text-app-warning">Pagamento pendente →</p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
