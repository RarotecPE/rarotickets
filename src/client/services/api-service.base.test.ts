import { describe, expect, it } from "vitest";
import { FetchHttpClient } from "./api-service.base";

describe("FetchHttpClient", () => {
  it("preserva o contexto do Window e evita erro de Illegal invocation", async () => {
    class MockWindow {}
    const mockWindow = new MockWindow();

    // Simula o comportamento estrito do browser que valida `this`
    const windowFetch = function (this: unknown, _input: RequestInfo | URL, _init?: RequestInit) {
      if (!(this instanceof MockWindow)) {
        throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [{ id: "evt-1", title: "Evento Teste" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    };

    // Cria o cliente usando a função fetch vinculada ao mockWindow
    const client = new FetchHttpClient({
      fetcher: windowFetch.bind(mockWindow) as typeof fetch,
    });

    const response = await client.request<{ id: string; title: string }[]>({
      path: "/api/v1/events",
      method: "GET",
    });

    expect(response.data).toEqual([{ id: "evt-1", title: "Evento Teste" }]);
  });

  it("retorna o payload data e monta query parameters corretamente", async () => {
    let capturedUrl = "";
    const mockFetcher = (input: RequestInfo | URL) => {
      capturedUrl = String(input);
      return Promise.resolve(
        new Response(JSON.stringify({ data: { success: true } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    };

    const client = new FetchHttpClient({ fetcher: mockFetcher as typeof fetch });
    const response = await client.request<{ success: boolean }>({
      path: "/api/v1/events",
      method: "GET",
      query: { q: "tech", limit: 10 },
    });

    expect(capturedUrl).toBe("/api/v1/events?q=tech&limit=10");
    expect(response.data).toEqual({ success: true });
  });
});

