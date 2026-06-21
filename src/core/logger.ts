// Logger amigável para a CLI: usa sequências ANSI apenas quando stdout é um TTY.
const isTTY = process.stdout.isTTY ?? false;

const c = {
  reset: isTTY ? "\x1b[0m" : "",
  bold: isTTY ? "\x1b[1m" : "",
  green: isTTY ? "\x1b[32m" : "",
  yellow: isTTY ? "\x1b[33m" : "",
  red: isTTY ? "\x1b[31m" : "",
  cyan: isTTY ? "\x1b[36m" : "",
  dim: isTTY ? "\x1b[2m" : "",
};

const methodColor = (method: string): string => {
  if (method === "GET") return c.green;
  if (method === "POST") return c.cyan;
  if (method === "DELETE") return c.red;
  return c.yellow;
};

const statusColor = (status: number): string => {
  if (status < 300) return c.green;
  if (status < 400) return c.yellow;
  return c.red;
};

export const logger = {
  info: (msg: string): void => {
    process.stdout.write(`${c.cyan}ℹ${c.reset}  ${msg}\n`);
  },
  success: (msg: string): void => {
    process.stdout.write(`${c.green}✔${c.reset}  ${msg}\n`);
  },
  warn: (msg: string): void => {
    process.stderr.write(`${c.yellow}⚠${c.reset}  ${msg}\n`);
  },
  error: (msg: string): void => {
    process.stderr.write(`${c.red}✖${c.reset}  ${msg}\n`);
  },
  request: (method: string, path: string, status: number, ms: number): void => {
    const m = `${methodColor(method)}${method.padEnd(6)}${c.reset}`;
    const s = `${statusColor(status)}${status}${c.reset}`;
    const t = `${c.dim}${ms}ms${c.reset}`;
    process.stdout.write(`  ${m} ${path} ${s} ${t}\n`);
  },
  blank: (): void => {
    process.stdout.write("\n");
  },
};
