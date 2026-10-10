"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

export function CheckoutReturnNotifier({ status }: { status: string }) {
  const [hasOpener] = useState(
    () => typeof window !== "undefined" && Boolean(window.opener),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      type: "PAYMENT_COMPLETED",
      status,
      at: Date.now(),
    };
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(payload, "*");
      }
    } catch {
      // Ignora restrições de cross-origin
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
  }, [status]);

  if (!hasOpener) return null;

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => window.close()}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-app-md bg-app-primary px-4 text-sm font-semibold text-white shadow-sm hover:brightness-110"
      >
        <Check className="h-4 w-4" aria-hidden="true" />
        Fechar janela e retornar ao RaroTickets
      </button>
    </div>
  );
}

