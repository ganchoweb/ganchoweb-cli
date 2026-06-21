import type { Command } from "commander";
import { authStore } from "../core/auth-store.ts";
import { logger } from "../core/logger.ts";

export const registerLogout = (program: Command): void => {
  program
    .command("logout")
    .description("Remove o token salvo localmente.")
    .action(() => {
      authStore.clear();
      logger.success("Token removido. Você foi deslogado.");
    });
};
