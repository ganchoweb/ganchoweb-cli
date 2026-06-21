import type { Command } from "commander";
import { authStore } from "../core/auth-store.ts";
import { logger } from "../core/logger.ts";

export const registerWhoami = (program: Command): void => {
  program
    .command("whoami")
    .description("Exibe o usuário autenticado e o servidor configurado.")
    .action(() => {
      const token = authStore.getToken();
      if (token === null) {
        logger.warn("Você não está logado. Execute: ganchoweb login");
        process.exit(1);
      }
      const email = authStore.getEmail() ?? "(desconhecido)";
      const serverUrl = authStore.getServerUrl();
      logger.success(`Logado como ${email}`);
      logger.info(`Servidor: ${serverUrl}`);
    });
};
