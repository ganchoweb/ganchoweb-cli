import type { TunnelRequestPayload, TunnelResponsePayload } from "@ganchoweb/core";

export type LocalProxyTarget = Readonly<{
  baseUrl: string; // ex.: http://localhost:3000
}>;

// Envia a request recebida via túnel para o app local e retorna a resposta.
// Preserva bytes do corpo e headers na ordem (sem reparse).
export const forwardToLocal = async (
  target: LocalProxyTarget,
  tunnelReq: TunnelRequestPayload,
): Promise<TunnelResponsePayload> => {
  const url = new URL(tunnelReq.path, target.baseUrl);

  // Headers como tuplas preservando ordem; remove headers de hop-by-hop.
  const HOP_BY_HOP = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
  ]);

  const headers = new Headers();
  for (const [name, value] of tunnelReq.headers) {
    if (!HOP_BY_HOP.has(name.toLowerCase())) {
      headers.append(name, value);
    }
  }

  const body =
    tunnelReq.bodyBase64.length > 0 ? Buffer.from(tunnelReq.bodyBase64, "base64") : undefined;

  const hasBody = body !== undefined && body.length > 0;
  const response = await fetch(url.toString(), {
    method: tunnelReq.method,
    headers,
    body: hasBody ? body : undefined,
  });

  const responseBody = Buffer.from(await response.arrayBuffer());
  const responseHeaders: [string, string][] = [];
  response.headers.forEach((value, name) => {
    if (!HOP_BY_HOP.has(name.toLowerCase())) {
      responseHeaders.push([name, value]);
    }
  });

  return {
    id: tunnelReq.id,
    status: response.status,
    headers: responseHeaders,
    bodyBase64: responseBody.toString("base64"),
  };
};
