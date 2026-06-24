import { spawn } from "node:child_process";
import * as p from "@clack/prompts";
import type { Command } from "commander";
import { authStore } from "../core/auth-store.ts";
import { logger } from "../core/logger.ts";

const DEFAULT_SERVER = "https://ganchoweb.com.br";
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 5 * 60 * 1_000;

type PollResponse =
  | { status: "pending" }
  | { status: "confirmed"; token: string; email: string }
  | { status: "expired" };

const openBrowser = (url: string): void => {
  if (process.platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
  } else if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
  } else {
    spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
  }
};

const poll = async (
  serverUrl: string,
  code: string,
): Promise<{ token: string; email: string } | null> => {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    try {
      const response = await fetch(`${serverUrl}/api/auth/cli/poll?code=${code}`);
      if (!response.ok) continue;

      const body = (await response.json()) as PollResponse;

      if (body.status === "confirmed") {
        return { token: body.token, email: body.email };
      }
      if (body.status === "expired") {
        return null;
      }
    } catch {
      // erro de rede temporário — continua tentando
    }
  }

  return null;
};

export const registerLogin = (program: Command): void => {
  program
    .command("login")
    .description("Autentica com o GanchoWeb via browser.")
    .option("--server <url>", "URL do servidor (padrão: produção)", DEFAULT_SERVER)
    .action(async (options: { server: string }) => {
      const serverUrl: string = options.server;

      p.intro("GanchoWeb login");

      const spin = p.spinner();
      spin.start("Iniciando autenticação…");

      let code: string;
      let authUrl: string;

      try {
        const response = await fetch(`${serverUrl}/api/auth/cli/init`, { method: "POST" });
        if (!response.ok) {
          spin.stop("Falha.");
          logger.error(`Erro ao iniciar autenticação (${response.status}).`);
          process.exit(1);
        }
        const body = (await response.json()) as { code: string; authUrl: string };
        code = body.code;
        authUrl = body.authUrl;
      } catch (err) {
        spin.stop("Falha.");
        logger.error(`Erro de rede: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }

      spin.stop("Pronto.");
      p.log.info(`Abrindo navegador para autenticação…`);
      p.log.info(`Se não abrir automaticamente, acesse:\n  ${authUrl}`);
      p.log.message("");

      openBrowser(authUrl);

      const spin2 = p.spinner();
      spin2.start("Aguardando autorização no navegador…");

      const result = await poll(serverUrl, code);

      if (result === null) {
        spin2.stop("Tempo esgotado.");
        logger.error("A autorização expirou. Execute ganchoweb login novamente.");
        process.exit(1);
      }

      authStore.save(result.token, result.email, serverUrl);
      spin2.stop("Autorizado!");
      p.outro(`Logado como ${result.email}`);
    });
};
