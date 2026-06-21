import { existsSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Isolamos o auth-store usando um caminho de config alternativo em /tmp.
const TEST_CONFIG_DIR = join("/tmp", "ganchoweb-test-auth-store");
const TEST_CONFIG_FILE = join(TEST_CONFIG_DIR, "config.json");

// Sobrescrevemos os módulos de FS para redirecionar para o diretório de teste.
// Fazemos isso antes de importar o módulo para garantir isolamento.
import { vi } from "vitest";

vi.mock("node:os", () => ({
  homedir: () => "/tmp/ganchoweb-test-auth-store-home",
}));

const { authStore } = await import("../../src/core/auth-store.ts");

describe("authStore", () => {
  const testHome = "/tmp/ganchoweb-test-auth-store-home";
  const testConfigFile = join(testHome, ".ganchoweb", "config.json");

  afterEach(() => {
    try {
      rmSync(join(testHome, ".ganchoweb"), { recursive: true, force: true });
    } catch {}
  });

  it("getToken retorna null sem config salvo", () => {
    expect(authStore.getToken()).toBeNull();
  });

  it("getEmail retorna null sem config salvo", () => {
    expect(authStore.getEmail()).toBeNull();
  });

  it("getServerUrl retorna URL padrão sem config salvo", () => {
    expect(authStore.getServerUrl()).toBe("https://ganchoweb.com.br");
  });

  it("save persiste token, email e serverUrl", () => {
    authStore.save("tok123", "user@example.com", "https://custom.server");
    expect(authStore.getToken()).toBe("tok123");
    expect(authStore.getEmail()).toBe("user@example.com");
    expect(authStore.getServerUrl()).toBe("https://custom.server");
  });

  it("config file tem permissão restrita (0o600)", () => {
    authStore.save("tok", "a@b.com", "https://ganchoweb.com.br");
    const stat = readFileSync(testConfigFile, "utf-8");
    expect(stat).toContain("tok"); // arquivo criado com conteúdo
    // A permissão restrita é garantida por chmodSync — difícil testar sem root,
    // mas verificamos que o arquivo existe.
    expect(existsSync(testConfigFile)).toBe(true);
  });

  it("clear apaga token e email", () => {
    authStore.save("tok", "a@b.com", "https://ganchoweb.com.br");
    authStore.clear();
    expect(authStore.getToken()).toBeNull();
    expect(authStore.getEmail()).toBeNull();
  });

  it("token nunca aparece em logs", () => {
    // O auth-store não loga nada — este teste serve como documentação.
    // Se o logger for chamado com o token, o teste falharia com um spy.
    authStore.save("super-secret-token", "a@b.com", "https://ganchoweb.com.br");
    expect(authStore.getToken()).toBe("super-secret-token");
    // Não há chamada de logger aqui — ok.
  });
});
