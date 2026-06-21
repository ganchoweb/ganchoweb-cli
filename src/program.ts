import { Command } from "commander";

// Monta o programa da CLI. Mantido separado do entrypoint (bin.ts) para ser
// testável sem disparar process.exit. Os comandos (login, tunnel, whoami,
// logout) são adicionados a partir do M6.
export const buildProgram = (): Command => {
  const program = new Command();

  program
    .name("ganchoweb")
    .description("CLI do GanchoWeb: túnel autenticado de webhooks para o app local.")
    .version("0.0.1");

  return program;
};
