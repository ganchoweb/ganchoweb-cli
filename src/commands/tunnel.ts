import type { Command } from "commander";
import { authStore } from "../core/auth-store.ts";
import { logger } from "../core/logger.ts";
import { createTunnelClient } from "../core/tunnel-client.ts";

export const registerTunnel = (program: Command): void => {
  program
    .command("tunnel")
    .description("Inicia um túnel autenticado: webhooks → app local (plano Pro).")
    .requiredOption("--webhook <id>", "ID ou slug do webhook a tunelar")
    .option("--port <port>", "Porta do app local (atalho para http://localhost:<port>)")
    .option("--target <url>", "URL local completa (ex.: http://localhost:3000/hook)")
    .option("--server <url>", "URL do servidor GanchoWeb (override)")
    .option("--insecure", "Aceita certificados TLS auto-assinados (apenas dev)")
    .option("--quiet", "Suprime o log de requests")
    .action(
      async (options: {
        webhook: string;
        port?: string;
        target?: string;
        server?: string;
        insecure?: boolean;
        quiet?: boolean;
      }) => {
        const token = authStore.getToken();
        if (token === null) {
          logger.error("Você não está logado. Execute: ganchoweb login");
          process.exit(1);
        }

        if (options.insecure) {
          process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
        }

        const serverUrl = options.server ?? authStore.getServerUrl();

        let targetUrl: string;
        if (options.target) {
          targetUrl = options.target;
        } else if (options.port) {
          targetUrl = `http://localhost:${options.port}`;
        } else {
          logger.error("Informe --port <port> ou --target <url>.");
          process.exit(1);
        }

        logger.info(`Conectando ao webhook ${options.webhook}…`);
        logger.info(`Destino: ${targetUrl}`);
        logger.blank();

        const client = createTunnelClient({
          serverUrl,
          token,
          webhookId: options.webhook,
          target: { baseUrl: targetUrl },
          onConnected: () => {
            logger.success(`Túnel conectado. Aguardando webhooks para ${targetUrl}…`);
            logger.blank();
          },
          onDisconnected: () => {
            logger.warn("Túnel desconectado.");
          },
        });

        // Encerramento limpo no Ctrl-C.
        const shutdown = (): void => {
          logger.blank();
          logger.info("Encerrando túnel…");
          client.disconnect();
          process.exit(0);
        };

        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);

        // Mantém o processo vivo enquanto o túnel está ativo.
        await new Promise<void>(() => {
          // Resolvida apenas no shutdown.
        });
      },
    );
};
