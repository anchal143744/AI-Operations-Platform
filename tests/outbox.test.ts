import { describe, expect, it } from "vitest";
import { OutboxService } from "../apps/api/src/outbox/outbox.service";
import { SecretReferenceService } from "../apps/api/src/secrets/secret-reference.service";

describe("production reliability foundation", () => {
  it("uses a bounded exponential retry schedule", () => {
    const service = new OutboxService({} as never);
    expect(
      [1, 2, 3, 20].map((attempt) => service.retryDelayMs(attempt)),
    ).toEqual([30_000, 120_000, 600_000, 600_000]);
  });

  it("accepts opaque secret-manager references but rejects raw values", () => {
    const secrets = new SecretReferenceService();
    expect(secrets.validate("secret://providers/email/primary")).toBe(
      "secret://providers/email/primary",
    );
    expect(() => secrets.validate("plain-text-api-key")).toThrow();
    expect(() => secrets.validate("https://vault.example/secret")).toThrow();
  });
});
