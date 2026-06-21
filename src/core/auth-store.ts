import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".ganchoweb");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

type Config = Readonly<{
  token: string;
  email: string;
  serverUrl: string;
}>;

const readConfig = (): Partial<Config> => {
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw) as Partial<Config>;
  } catch {
    return {};
  }
};

const writeConfig = (config: Partial<Config>): void => {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { encoding: "utf-8", mode: 0o600 });
  try {
    chmodSync(CONFIG_FILE, 0o600);
  } catch {
    // ignorar se chmod não suportado (Windows)
  }
};

export type AuthStore = Readonly<{
  getToken: () => string | null;
  getEmail: () => string | null;
  getServerUrl: () => string;
  save: (token: string, email: string, serverUrl: string) => void;
  clear: () => void;
}>;

const DEFAULT_SERVER_URL = "https://ganchoweb.com.br";

export const authStore: AuthStore = {
  getToken: () => readConfig().token ?? null,
  getEmail: () => readConfig().email ?? null,
  getServerUrl: () => readConfig().serverUrl ?? DEFAULT_SERVER_URL,

  save: (token, email, serverUrl) => {
    writeConfig({ token, email, serverUrl });
  },

  clear: () => {
    writeConfig({});
  },
};
