import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearConstantCache,
  getRaroConstant,
  RaroNexusConstantsClient,
} from "./raronexus-constants.client";

describe("RaroNexusConstantsClient", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.RARONEXUS_API_URL = "http://nexus-mock.local";
    process.env.RARONEXUS_SESSION_TOKEN = "session-test-token";
    clearConstantCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearConstantCache();
    vi.restoreAllMocks();
  });

  it("busca constante pública e armazena em cache com ETag", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation((url, init) => {
      callCount += 1;
      const headers = init?.headers as Record<string, string>;

      if (headers?.["If-None-Match"] === "etag-abc-1") {
        return Promise.resolve(new Response(null, { status: 304 }));
      }

      return Promise.resolve(
        new Response(JSON.stringify({ status_list: ["ativo", "inativo"] }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ETag: "etag-abc-1",
            "X-Constant-Version": "1",
          },
        })
      );
    });

    const client = new RaroNexusConstantsClient();

    // Primeira chamada: baixa do servidor
    const data1 = await client.get<{ status_list: string[] }>({
      name: "status-pedidos",
      cacheTtlMs: 0, // Força revalidação para testar 304
    });
    expect(data1).toEqual({ status_list: ["ativo", "inativo"] });
    expect(callCount).toBe(1);

    // Segunda chamada com TTL 0: envia If-None-Match, servidor responde 304, retorna dados em cache
    const data2 = await client.get<{ status_list: string[] }>({
      name: "status-pedidos",
      cacheTtlMs: 0,
    });
    expect(data2).toEqual({ status_list: ["ativo", "inativo"] });
    expect(callCount).toBe(2);

    // Terceira chamada dentro do TTL padrão: não faz chamada de rede
    const data3 = await client.get<{ status_list: string[] }>({
      name: "status-pedidos",
      cacheTtlMs: 60_000,
    });
    expect(data3).toEqual({ status_list: ["ativo", "inativo"] });
    expect(callCount).toBe(2);
  });

  it("envia Bearer token ao requisitar constante privada", async () => {
    let capturedAuth = "";
    globalThis.fetch = vi.fn().mockImplementation((url, init) => {
      capturedAuth = (init?.headers as Record<string, string>)?.["Authorization"] || "";
      return Promise.resolve(
        new Response(JSON.stringify({ secret_key: "123" }), {
          status: 200,
          headers: { ETag: "etag-private" },
        })
      );
    });

    const data = await getRaroConstant<{ secret_key: string }>({
      name: "config-seguranca",
      isPrivate: true,
      token: "custom-token-xyz",
    });

    expect(capturedAuth).toBe("Bearer custom-token-xyz");
    expect(data).toEqual({ secret_key: "123" });
  });

  it("rejeita constante privada se nenhum token estiver disponível", async () => {
    delete process.env.RARONEXUS_SESSION_TOKEN;
    const client = new RaroNexusConstantsClient();

    await expect(
      client.get({
        name: "dados-sensiveis",
        isPrivate: true,
      })
    ).rejects.toThrow("é privada, mas nenhum token de autenticação foi fornecido");
  });

  it("valida o formato e nomes reservados da constante", async () => {
    const client = new RaroNexusConstantsClient();

    await expect(client.get({ name: "content" })).rejects.toThrow("é reservado");
    await expect(client.get({ name: "NOME COM ESPAÇOS" })).rejects.toThrow("é inválido");
  });
});

