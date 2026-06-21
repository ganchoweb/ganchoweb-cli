import { describe, expect, it } from "vitest";
import { buildProgram } from "../../src/program.ts";

describe("buildProgram", () => {
  it("define nome e versão", () => {
    const program = buildProgram();
    expect(program.name()).toBe("ganchoweb");
    expect(program.version()).toBe("0.0.1");
  });

  it("imprime uso no --help", () => {
    const help = buildProgram().helpInformation();
    expect(help).toContain("Usage: ganchoweb");
  });
});
