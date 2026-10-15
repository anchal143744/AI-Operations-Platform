import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { connect } from "node:net";
import process from "node:process";
import { URL } from "node:url";
import { PrismaClient } from "@prisma/client";

const base = new URL(process.env.DATABASE_URL ?? "");
if (
  !["localhost", "127.0.0.1"].includes(base.hostname) ||
  base.pathname !== "/ai_operations" ||
  ![null, "public"].includes(base.searchParams.get("schema"))
) {
  throw new Error(
    "Browser E2E requires the confirmed local ai_operations database.",
  );
}

async function portOpen(port) {
  return new Promise((resolve) => {
    const socket = connect({ host: "127.0.0.1", port });
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

if ((await portOpen(3000)) || (await portOpen(4000))) {
  throw new Error(
    "Browser E2E owns ports 3000 and 4000. Stop only the identified existing project session before retrying.",
  );
}

const schema = `aop_e2e_test_${randomBytes(6).toString("hex")}`;
const isolated = new URL(base);
isolated.searchParams.set("schema", schema);
const admin = new PrismaClient({ datasourceUrl: base.toString() });
let created = false;
try {
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  created = true;
  const env = {
    ...process.env,
    DATABASE_URL: isolated.toString(),
    TEST_DATABASE_URL: isolated.toString(),
    AOP_E2E_DISPOSABLE_DB: "true",
    NODE_ENV: "development",
    AUTH_TOKEN_PEPPER: randomBytes(32).toString("hex"),
    AUTH_EMAIL_TRANSPORT: "development",
    APP_ORIGIN: "http://localhost:3000",
    NEXT_PUBLIC_API_ORIGIN: "http://localhost:4000",
    WEB_PORT: "3000",
    API_PORT: "4000",
  };
  const migrate = spawnSync(
    process.execPath,
    [
      "node_modules/prisma/build/index.js",
      "migrate",
      "deploy",
      "--schema",
      "database/schema.prisma",
    ],
    { env, stdio: "inherit" },
  );
  if (migrate.status !== 0)
    throw new Error("Disposable browser schema migrations failed.");
  const pnpmCli = process.env.npm_execpath;
  if (!pnpmCli)
    throw new Error("Run this launcher through pnpm test:browser:local.");
  const testArguments = process.argv
    .slice(2)
    .filter((argument) => argument !== "--");
  const browser = spawnSync(
    process.execPath,
    [pnpmCli, "test:browser", ...testArguments],
    {
      env,
      stdio: "inherit",
    },
  );
  if (browser.status !== 0)
    throw new Error(
      `Chromium release tests failed (exit ${browser.status ?? "unknown"}).`,
    );
  process.stdout.write(
    "Chromium E2E passed in the generated disposable schema.\n",
  );
} finally {
  if (created) {
    await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    process.stdout.write("Removed only the generated browser-test schema.\n");
  }
  await admin.$disconnect();
}
