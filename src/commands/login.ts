import * as p from "@clack/prompts";
import { tunnelTokenResponseSchema } from "@ganchoweb/core";
import type { Command } from "commander";
import { authStore } from "../core/auth-store.ts";
import { logger } from "../core/logger.ts";

const DEFAULT_SERVER = "https://ganchoweb.com.br";

export const registerLogin = (program: Command): void => {
  program
    .command("login")
    .description("Autentica com o GanchoWeb e salva o token localmente.")
    .option("--server <url>", "URL do servidor (padrão: produção)", DEFAULT_SERVER)
    .action(async (options: { server: string }) => {
      const serverUrl: string = options.server;

      p.intro("GanchoWeb login");

      const email = await p.text({
        message: "E-mail:",
        validate: (v) => (v?.includes("@") ? undefined : "E-mail inválido."),
      });
      if (p.isCancel(email)) {
        p.cancel("Cancelado.");
        process.exit(0);
      }

      const password = await p.password({ message: "Senha:" });
      if (p.isCancel(password)) {
        p.cancel("Cancelado.");
        process.exit(0);
      }

      const spin = p.spinner();
      spin.start("Autenticando…");

      try {
        const response = await fetch(`${serverUrl}/api/auth/sign-in/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          spin.stop("Falha.");
          logger.error(`Erro de autenticação (${response.status}). Verifique suas credenciais.`);
          process.exit(1);
        }

        const body = await response.json();
        const parsed = tunnelTokenResponseSchema.safeParse(body);
        // betterauth devolve o token em body.token ou body.session.token
        const token: string = parsed.success
          ? parsed.data.token
          : ((body as { session?: { token?: string } }).session?.token ?? "");

        if (!token) {
          spin.stop("Falha.");
          logger.error("Não foi possível obter o token de sessão. Tente novamente.");
          process.exit(1);
        }

        authStore.save(token, email as string, serverUrl);
        spin.stop("Autenticado!");
        p.outro(`Logado como ${email}`);
      } catch (err) {
        spin.stop("Falha.");
        logger.error(`Erro de rede: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
};
