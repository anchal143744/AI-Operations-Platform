import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rmdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
    "Restore rehearsal requires the confirmed local ai_operations database.",
  );
}

const pgBin = "C:\\Program Files\\PostgreSQL\\16\\bin";
const pgDump = process.env.PG_DUMP_PATH ?? join(pgBin, "pg_dump.exe");
const pgRestore = process.env.PG_RESTORE_PATH ?? join(pgBin, "pg_restore.exe");
if (!existsSync(pgDump) || !existsSync(pgRestore)) {
  throw new Error("PostgreSQL 16 pg_dump and pg_restore are required.");
}

const schema = `aop_restore_test_${randomBytes(6).toString("hex")}`;
const isolated = new URL(base);
isolated.searchParams.set("schema", schema);
const tempDir = await mkdtemp(join(tmpdir(), "aop-restore-test-"));
const archive = join(tempDir, "generated-schema.dump");
const admin = new PrismaClient({ datasourceUrl: base.toString() });
const pgEnv = {
  ...process.env,
  PGHOST: base.hostname,
  PGPORT: base.port || "5432",
  PGUSER: decodeURIComponent(base.username),
  PGPASSWORD: decodeURIComponent(base.password),
  PGDATABASE: decodeURIComponent(base.pathname.slice(1)),
};
let owned = false;
try {
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  owned = true;
  const migrate = spawnSync(
    process.execPath,
    [
      "node_modules/prisma/build/index.js",
      "migrate",
      "deploy",
      "--schema",
      "database/schema.prisma",
    ],
    {
      env: { ...process.env, DATABASE_URL: isolated.toString() },
      stdio: "ignore",
    },
  );
  if (migrate.status !== 0) throw new Error("Disposable migration failed.");

  await admin.$executeRawUnsafe(
    `CREATE TABLE "${schema}"."restore_probe" (id integer PRIMARY KEY, value text NOT NULL)`,
  );
  await admin.$executeRawUnsafe(
    `INSERT INTO "${schema}"."restore_probe" (id, value) VALUES (1, 'synthetic-restore-proof')`,
  );
  const before = await admin.$queryRawUnsafe(
    `SELECT count(*)::integer AS count FROM "${schema}"."_prisma_migrations"`,
  );
  if (before[0]?.count !== 17) {
    throw new Error("The disposable schema did not contain all 17 migrations.");
  }

  const dump = spawnSync(
    pgDump,
    [
      "--format=custom",
      "--no-owner",
      "--no-acl",
      `--schema=${schema}`,
      `--file=${archive}`,
    ],
    { env: pgEnv, stdio: "ignore" },
  );
  if (dump.status !== 0)
    throw new Error("pg_dump failed for the disposable schema.");

  await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  const restore = spawnSync(
    pgRestore,
    [
      "--exit-on-error",
      "--no-owner",
      "--no-acl",
      `--dbname=${pgEnv.PGDATABASE}`,
      archive,
    ],
    { env: pgEnv, stdio: "ignore" },
  );
  if (restore.status !== 0)
    throw new Error("pg_restore failed for the disposable schema.");

  const rows = await admin.$queryRawUnsafe(
    `SELECT value FROM "${schema}"."restore_probe" WHERE id = 1`,
  );
  const after = await admin.$queryRawUnsafe(
    `SELECT count(*)::integer AS count FROM "${schema}"."_prisma_migrations"`,
  );
  if (rows[0]?.value !== "synthetic-restore-proof" || after[0]?.count !== 17) {
    throw new Error("Restored probe data or migration history did not match.");
  }
  process.stdout.write(
    "Local pg_dump/pg_restore rehearsal passed: synthetic data and 17 migrations restored.\n",
  );
} finally {
  if (owned) {
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    process.stdout.write("Removed only the generated restore-test schema.\n");
  }
  await admin.$disconnect();
  await unlink(archive).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  await rmdir(tempDir);
}
