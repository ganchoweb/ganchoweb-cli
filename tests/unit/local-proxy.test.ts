import type { TunnelRequestPayload } from "@ganchoweb/core";
import { describe, expect, it, vi } from "vitest";
import { forwardToLocal } from "../../src/core/local-proxy.ts";

const target = { baseUrl: "http://localhost:3000" };

const makeReq = (overrides?: Partial<TunnelRequestPayload>): TunnelRequestPayload => ({
  id: "corr-1",
  method: "POST",
  path: "/hook",
  query: {},
  headers: [["content-type", "application/json"]],
  contentType: "application/json",
  bodyBase64: Buffer.from('{"event":"test"}').toString("base64"),
  ...overrides,
});

describe("forwardToLocal", () => {
  it("chama fetch com URL e método corretos", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(Buffer.from("ok"), { status: 200, headers: { "content-type": "text/plain" } }),
      );
    vi.stubGlobal("fetch", mockFetch);

    const req = makeReq();
    const resp = await forwardToLocal(target, req);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:3000/hook");
    expect(init.method).toBe("POST");
    expect(resp.id).toBe("corr-1");
    expect(resp.status).toBe(200);

    vi.unstubAllGlobals();
  });

  it("preserva o id de correlação na resposta", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", mockFetch);

    const resp = await forwardToLocal(target, makeReq({ id: "corr-999" }));
    expect(resp.id).toBe("corr-999");

    vi.unstubAllGlobals();
  });

  it("remove headers hop-by-hop do request", async () => {
    let capturedHeaders: Headers | undefined;
    const mockFetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      capturedHeaders = init.headers as Headers;
      return Promise.resolve(new Response(null, { status: 200 }));
    });
    vi.stubGlobal("fetch", mockFetch);

    const req = makeReq({
      headers: [
        ["content-type", "application/json"],
        ["connection", "keep-alive"],
        ["transfer-encoding", "chunked"],
        ["x-custom", "value"],
      ],
    });
    await forwardToLocal(target, req);

    expect(capturedHeaders?.has("connection")).toBe(false);
    expect(capturedHeaders?.has("transfer-encoding")).toBe(false);
    expect(capturedHeaders?.get("x-custom")).toBe("value");

    vi.unstubAllGlobals();
  });

  it("devolve body base64 da resposta", async () => {
    const responseBody = Buffer.from("hello world");
    const mockFetch = vi.fn().mockResolvedValue(new Response(responseBody, { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);

    const resp = await forwardToLocal(target, makeReq());
    expect(Buffer.from(resp.bodyBase64, "base64").toString()).toBe("hello world");

    vi.unstubAllGlobals();
  });

  it("não envia body para método GET", async () => {
    let capturedInit: RequestInit | undefined;
    const mockFetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      capturedInit = init;
      return Promise.resolve(new Response(null, { status: 200 }));
    });
    vi.stubGlobal("fetch", mockFetch);

    await forwardToLocal(target, makeReq({ method: "GET", bodyBase64: "" }));
    expect(capturedInit?.body).toBeUndefined();

    vi.unstubAllGlobals();
  });
});
