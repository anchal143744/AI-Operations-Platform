import { createHash, X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const webOrigin = process.env.AOP_E2E_WEB_ORIGIN ?? "http://localhost:3000";
const apiOrigin = process.env.AOP_E2E_API_ORIGIN ?? "http://localhost:4000";
const enabled = process.env.AOP_E2E_DISPOSABLE_DB === "true";
const externalBuiltStack = process.env.AOP_E2E_EXTERNAL_BUILT_STACK === "true";
const localCertificate = process.env.AOP_E2E_LOCAL_CERT_PEM;

if (externalBuiltStack && (!enabled || !localCertificate)) {
  throw new Error(
    "Built-stack browser E2E requires a disposable database and a pinned local certificate.",
  );
}

const localCertificateKeyHash = localCertificate
  ? createHash("sha256")
      .update(
        new X509Certificate(readFileSync(localCertificate)).publicKey.export({
          type: "spki",
          format: "der",
        }),
      )
      .digest("base64")
  : null;

if (enabled) {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("Browser E2E requires DATABASE_URL.");
  const database = new URL(raw);
  const name = decodeURIComponent(database.pathname).toLowerCase();
  const schema = (database.searchParams.get("schema") ?? "").toLowerCase();
  const local = (host: string) =>
    ["localhost", "127.0.0.1", "::1"].includes(host);
  if (
    !local(database.hostname) ||
    !(name.includes("test") || schema.includes("test")) ||
    !local(new URL(webOrigin).hostname) ||
    !local(new URL(apiOrigin).hostname)
  ) {
    throw new Error(
      "Browser E2E requires a loopback test database and loopback web/API origins.",
    );
  }
}

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: webOrigin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(localCertificateKeyHash
          ? {
              launchOptions: {
                args: [
                  `--ignore-certificate-errors-spki-list=${localCertificateKeyHash}`,
                ],
              },
            }
          : {}),
      },
    },
  ],
  // The test runner owns the full stack. Never reuse an existing server that
  // could be connected to a different (possibly non-disposable) database.
  webServer:
    enabled && !externalBuiltStack
      ? {
          command: "pnpm dev",
          url: `${apiOrigin}/health/worker`,
          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            DATABASE_URL: process.env.DATABASE_URL!,
            NODE_ENV: "development",
            AUTH_EMAIL_TRANSPORT: "development",
            APP_ORIGIN: webOrigin,
            NEXT_PUBLIC_API_ORIGIN: apiOrigin,
            WEB_PORT: new URL(webOrigin).port || "3000",
            API_PORT: new URL(apiOrigin).port || "4000",
          },
        }
      : undefined,
});
