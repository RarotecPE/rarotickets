import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RaroNexusEmailClient, sendRaroNexusEmail } from "./raronexus-email.client";

describe("RaroNexusEmailClient", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.RARONEXUS_API_URL = "http://nexus-mock.local";
    process.env.RARONEXUS_CLIENT_ID = "client-test-id";
    process.env.RARONEXUS_CLIENT_SECRET = "client-test-secret";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("dispara e-mail com sucesso no endpoint padrão send", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: { to?: unknown; subject?: unknown; body?: unknown; metadata?: unknown } | null = null;

    globalThis.fetch = vi.fn().mockImplementation((url, init) => {
      capturedUrl = String(url);
      capturedHeaders = init?.headers as Record<string, string>;
      capturedBody = JSON.parse(init?.body as string);

      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: { sent: true, message_id: "<msg-123@nexus.local>" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    });

    const result = await sendRaroNexusEmail({
      to: "participante@teste.com",
      subject: "<b>Confirmação</b> da Inscrição",
      body: "<p>Seu ingresso está pronto!</p>",
      metadata: { eventoId: "evt-10" },
    });

    expect(capturedUrl).toBe("http://nexus-mock.local/api/email/send");
    expect(capturedHeaders["X-RaroNexus-Client-Id"]).toBe("client-test-id");
    expect(capturedHeaders["X-RaroNexus-Client-Secret"]).toBe("client-test-secret");
    expect(capturedHeaders["Content-Type"]).toBe("application/json");
    // Subject deve ter tags HTML removidas
    expect(capturedBody!.subject).toBe("Confirmação da Inscrição");
    expect(capturedBody!.to).toBe("participante@teste.com");
    expect(capturedBody!.body).toBe("<p>Seu ingresso está pronto!</p>");
    expect(capturedBody!.metadata).toEqual({ eventoId: "evt-10" });
    expect(result).toEqual({ sent: true, messageId: "<msg-123@nexus.local>" });
  });

  it("dispara e-mail através de endpoint temático customizado", async () => {
    let capturedUrl = "";
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      capturedUrl = String(url);
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: { sent: true, message_id: "<msg-456@nexus.local>" },
          }),
          { status: 200 }
        )
      );
    });

    const client = new RaroNexusEmailClient();
    await client.send({
      endpoint: "boas-vindas",
      to: ["user1@teste.com", "user2@teste.com"],
      body: "<p>Bem-vindos!</p>",
    });

    expect(capturedUrl).toBe("http://nexus-mock.local/api/email/boas-vindas");
  });

  it("lança erro formatado quando a API do RaroNexus responde falha", async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: false,
            code: "EMAIL_ENDPOINT_NOT_ALLOWED",
            message: "Endpoint não habilitado para esta aplicação.",
          }),
          { status: 403 }
        )
      );
    });

    const client = new RaroNexusEmailClient();
    await expect(
      client.send({
        to: "user@teste.com",
        body: "Teste",
      })
    ).rejects.toThrow("[RaroNexus Email Error] [EMAIL_ENDPOINT_NOT_ALLOWED] Endpoint não habilitado para esta aplicação.");
  });

  it("lança erro caso credenciais do RaroNexus não estejam configuradas", async () => {
    delete process.env.RARONEXUS_API_URL;
    delete process.env.RARONEXUS_BASE_URL;
    delete process.env.RARONEXUS_CLIENT_ID;
    delete process.env.RARONEXUS_CLIENT_SECRET;

    const client = new RaroNexusEmailClient({ baseUrl: "", clientId: "", clientSecret: "" });
    await expect(
      client.send({
        to: "user@teste.com",
        body: "Teste",
      })
    ).rejects.toThrow("Configurações do RaroNexus ausentes");
  });

  it("tenta novamente quando ocorre falha transitória como 451 queue file write error e conclui com sucesso", async () => {
    let callCount = 0;

    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: false,
              code: "EMAIL_SEND_FAILED",
              message: "Message failed: 451 4.3.0 Error: queue file write error",
            }),
            { status: 502 }
          )
        );
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: { sent: true, message_id: "<msg-retry-ok@nexus.local>" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    });

    const client = new RaroNexusEmailClient({ maxAttempts: 3, baseDelayMs: 1 });
    const result = await client.send({
      to: "user@teste.com",
      body: "<p>Teste com retry</p>",
    });

    expect(callCount).toBe(3);
    expect(result).toEqual({ sent: true, messageId: "<msg-retry-ok@nexus.local>" });
  });
});

