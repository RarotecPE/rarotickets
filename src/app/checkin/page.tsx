"use client";

import { useState } from "react";
import { redirect } from "next/navigation";
import { Panel, PanelHeader, Field, btnPrimary, inputCls, InlineAlert, Badge } from "@/components/ui";

export default function CheckInPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; message: string; registrationCode?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialToken: token.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.data?.ok) {
        setStatus({ ok: true, message: `Check-in realizado com sucesso!`, registrationCode: data.data.registrationCode });
      } else {
        setStatus({ ok: false, message: data.error?.message || "Erro ao realizar check-in" });
      }
    } catch (err) {
      setStatus({ ok: false, message: "Falha de comunicação" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <PanelHeader title="Credenciamento / Check-in" description="Leia o QR Code ou cole o token da credencial" />
        <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5">
          <Field label="Token da credencial" hint="Cole aqui o conteúdo do QR Code (RAROTICKETS:INS-ANO-XXXX:token)">
            <input
              className={inputCls}
              placeholder="RAROTICKETS:INS-2026-..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoFocus
            />
          </Field>
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? "Processando..." : "Validar e registrar check-in"}
          </button>
          {status && (
            <InlineAlert tone={status.ok ? "success" : "danger"}>
              <div className="flex items-center gap-2">
                <span>{status.message}</span>
                {status.registrationCode && <Badge tone="success">{status.registrationCode}</Badge>}
              </div>
            </InlineAlert>
          )}
          <p className="text-xs text-app-muted-foreground">
            Dica: a leitura oficial de QR Code da câmera pode ser integrada ao dispositivo do credenciador. Esta página
            permite validação manual para o MVP.
          </p>
        </form>
      </Panel>
    </div>
  );
}
