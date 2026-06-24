import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { buildProgram } from "../../src/program.ts";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json");

describe("buildProgram", () => {
  it("define nome e versão", () => {
    const program = buildProgram();
    expect(program.name()).toBe("ganchoweb");
    expect(program.version()).toBe(version);
  });

  it("imprime uso no --help", () => {
    const help = buildProgram().helpInformation();
    expect(help).toContain("Usage: ganchoweb");
  });
});
