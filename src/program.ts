import { createRequire } from "node:module";
import { Command } from "commander";
import { registerLogin } from "./commands/login.ts";
import { registerLogout } from "./commands/logout.ts";
import { registerTunnel } from "./commands/tunnel.ts";
import { registerWhoami } from "./commands/whoami.ts";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

// Monta o programa da CLI. Mantido separado do entrypoint (bin.ts) para ser
// testável sem disparar process.exit.
export const buildProgram = (): Command => {
  const program = new Command();

  program
    .name("ganchoweb")
    .description("CLI do GanchoWeb: túnel autenticado de webhooks para o app local.")
    .version(version);

  registerLogin(program);
  registerLogout(program);
  registerWhoami(program);
  registerTunnel(program);

  return program;
};
