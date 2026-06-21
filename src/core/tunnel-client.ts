import {
  SocketEvent,
  type TunnelRequestPayload,
  tunnelRequestPayloadSchema,
} from "@ganchoweb/core";
import { io, type Socket } from "socket.io-client";
import type { LocalProxyTarget } from "./local-proxy.ts";
import { forwardToLocal } from "./local-proxy.ts";
import { logger } from "./logger.ts";

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

export type TunnelClientConfig = Readonly<{
  serverUrl: string;
  token: string;
  webhookId: string;
  target: LocalProxyTarget;
  onConnected?: () => void;
  onDisconnected?: () => void;
}>;

export type TunnelClientHandle = Readonly<{
  disconnect: () => void;
}>;

// Conecta ao namespace /tunnel do server e faz proxy de tunnel:request para
// o app local, emitindo tunnel:response de volta com a resposta real.
export const createTunnelClient = (config: TunnelClientConfig): TunnelClientHandle => {
  let socket: Socket | null = null;
  let backoff = INITIAL_BACKOFF_MS;
  let stopped = false;

  const connect = (): void => {
    if (stopped) return;

    socket = io(`${config.serverUrl}/tunnel`, {
      auth: { token: config.token, webhookId: config.webhookId },
      reconnection: false, // gerenciamos reconexão manualmente para controlar backoff
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      backoff = INITIAL_BACKOFF_MS;
      config.onConnected?.();
    });

    socket.on(SocketEvent.TunnelRequest, async (raw: unknown) => {
      const parsed = tunnelRequestPayloadSchema.safeParse(raw);
      if (!parsed.success) {
        logger.warn("Recebido tunnel:request com formato inválido — ignorado.");
        return;
      }

      const tunnelReq: TunnelRequestPayload = parsed.data;
      const start = performance.now();

      try {
        const response = await forwardToLocal(config.target, tunnelReq);
        const elapsed = Math.round(performance.now() - start);
        logger.request(tunnelReq.method, tunnelReq.path, response.status, elapsed);
        socket?.emit(SocketEvent.TunnelResponse, response);
      } catch (err) {
        const elapsed = Math.round(performance.now() - start);
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`${tunnelReq.method} ${tunnelReq.path} — erro: ${message} (${elapsed}ms)`);
        // Emite 502 para que o server possa responder ao webhook sender
        socket?.emit(SocketEvent.TunnelResponse, {
          id: tunnelReq.id,
          status: 502,
          headers: [["content-type", "text/plain"]],
          bodyBase64: Buffer.from(`Erro no app local: ${message}`).toString("base64"),
        });
      }
    });

    socket.on("disconnect", (reason) => {
      config.onDisconnected?.();
      if (stopped) return;
      if (reason === "io server disconnect" || reason === "io client disconnect") {
        return; // desconexão intencional — não reconectar
      }
      logger.warn(`Desconectado (${reason}). Reconectando em ${Math.round(backoff / 1000)}s…`);
      setTimeout(() => {
        connect();
      }, backoff);
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
    });

    socket.on("connect_error", (err: Error) => {
      logger.error(`Erro de conexão: ${err.message}`);
      if (err.message.match(/Pro/i)) {
        logger.info("Faça upgrade para o plano Pro em ganchoweb.com.br/billing");
        stopped = true;
        process.exit(1);
      }
      if (err.message.match(/inválido|expirado/i)) {
        logger.info("Token inválido ou expirado. Execute: ganchoweb login");
        stopped = true;
        process.exit(1);
      }
      if (!stopped) {
        logger.warn(`Tentando novamente em ${Math.round(backoff / 1000)}s…`);
        setTimeout(() => {
          connect();
        }, backoff);
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
      }
    });
  };

  connect();

  return {
    disconnect: () => {
      stopped = true;
      socket?.disconnect();
    },
  };
};
