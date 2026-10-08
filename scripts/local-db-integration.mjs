import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { URL } from "node:url";
import { PrismaClient } from "@prisma/client";

const baseUrl = new URL(process.env.DATABASE_URL ?? "");
if (
  !["localhost", "127.0.0.1"].includes(baseUrl.hostname) ||
  baseUrl.pathname !== "/ai_operations" ||
  ![null, "public"].includes(baseUrl.searchParams.get("schema"))
) {
  throw new Error(
    "Local integration requires the confirmed localhost ai_operations database.",
  );
}

const schema = `aop_test_${randomBytes(6).toString("hex")}`;
const isolatedUrl = new URL(baseUrl);
isolatedUrl.searchParams.set("schema", schema);
const admin = new PrismaClient();
let created = false;
try {
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  created = true;
  const env = {
    ...process.env,
    DATABASE_URL: isolatedUrl.toString(),
    TEST_DATABASE_URL: isolatedUrl.toString(),
    RUN_DATABASE_INTEGRATION_TESTS: "true",
    NODE_ENV: "test",
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
    throw new Error("Disposable-schema migrations failed.");
  const tests = spawnSync(
    process.execPath,
    ["node_modules/vitest/vitest.mjs", "run"],
    { env, stdio: "inherit" },
  );
  if (tests.status !== 0)
    throw new Error("Disposable-schema integration suite failed.");
  process.stdout.write(
    "All opt-in database suites ran against the generated disposable schema.\n",
  );
} finally {
  if (created) {
    await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    process.stdout.write(
      "Removed only the generated integration test schema.\n",
    );
  }
  await admin.$disconnect();
}
