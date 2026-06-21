import type { TunnelRequestPayload, TunnelResponsePayload } from "@ganchoweb/core";
import { describe, expect, it, vi } from "vitest";
import { forwardToLocal } from "../../src/core/local-proxy.ts";

// Este arquivo testa a lógica pura do mapeamento tunnel:request -> resposta local.
// O tunnel-client em si é integração (socket.io) — coberto pelo e2e do server.

const makeReq = (overrides?: Partial<TunnelRequestPayload>): TunnelRequestPayload => ({
  id: "corr-1",
  method: "GET",
  path: "/api/data",
  query: { page: "1" },
  headers: [["accept", "application/json"]],
  contentType: null,
  bodyBase64: "",
  ...overrides,
});

describe("mapeamento tunnel:request → resposta local (puro)", () => {
  it("resposta 200 com body json", async () => {
    const body = Buffer.from('{"status":"ok"}');
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(body, { status: 200, headers: { "content-type": "application/json" } }),
        ),
    );

    const resp: TunnelResponsePayload = await forwardToLocal(
      { baseUrl: "http://localhost:4000" },
      makeReq(),
    );

    expect(resp.status).toBe(200);
    expect(Buffer.from(resp.bodyBase64, "base64").toString()).toBe('{"status":"ok"}');
    expect(resp.headers.some(([k]) => k.toLowerCase() === "content-type")).toBe(true);

    vi.unstubAllGlobals();
  });

  it("porta fechada → fetch lança erro → deve ser tratado pelo caller", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    await expect(forwardToLocal({ baseUrl: "http://localhost:9999" }, makeReq())).rejects.toThrow(
      "ECONNREFUSED",
    );

    vi.unstubAllGlobals();
  });

  it("resposta 404 é encaminhada sem alteração", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(Buffer.from("not found"), { status: 404 })),
    );

    const resp = await forwardToLocal({ baseUrl: "http://localhost:3000" }, makeReq());
    expect(resp.status).toBe(404);

    vi.unstubAllGlobals();
  });
});
