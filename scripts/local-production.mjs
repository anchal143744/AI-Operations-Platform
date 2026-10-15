import { randomBytes, X509Certificate } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readFile,
  rmdir,
  writeFile,
  unlink,
} from "node:fs/promises";
import { request as requestHttps } from "node:https";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createSecureContext } from "node:tls";
import { fileURLToPath, URL } from "node:url";
import process from "node:process";
import { PrismaClient } from "@prisma/client";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localAppData = process.env.LOCALAPPDATA;
if (!localAppData) {
  throw new Error(
    "LOCALAPPDATA is required for non-synced local runtime state.",
  );
}
const state = resolve(
  localAppData,
  "AI-Operations-Platform",
  "local-production",
);
if (state.toLowerCase().includes("onedrive")) {
  throw new Error("Local runtime state must not be stored inside OneDrive.");
}
const data = join(state, "postgres-utf8");
const certDir = join(state, "certificates");
const certificatePfx = join(certDir, "localhost.pfx");
const certificatePem = join(certDir, "localhost.pem");
const configFile = join(state, "config.json");
const buildMarker = join(state, "build.json");
const supervisorFile = join(state, "supervisor.json");
const pgBin =
  process.env.AOP_PG_BIN ?? "C:\\Program Files\\PostgreSQL\\16\\bin";
const pgPort = "55432";
const pgUser = "aop_local_runtime";
const database = "aop_local_production";
const mode = process.argv[2] ?? "run";

function executable(name) {
  const path = join(pgBin, `${name}.exe`);
  if (!existsSync(path))
    throw new Error(`PostgreSQL 16 ${name}.exe is missing.`);
  return path;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} failed (${result.status ?? "not started"}).`);
  }
}

async function configuration() {
  if (existsSync(configFile))
    return JSON.parse(await readFile(configFile, "utf8"));
  if (
    existsSync(data) ||
    existsSync(certificatePfx) ||
    existsSync(certificatePem)
  ) {
    throw new Error(
      "Local state exists without its configuration. Review it manually; nothing was overwritten.",
    );
  }
  await mkdir(state, { recursive: true });
  const config = {
    databasePassword: randomBytes(32).toString("base64url"),
    tokenPepper: randomBytes(48).toString("base64url"),
    certificatePassword: randomBytes(32).toString("base64url"),
  };
  await writeFile(configFile, JSON.stringify(config), {
    flag: "wx",
    mode: 0o600,
  });
  return config;
}

function databaseUrl(config, name = database) {
  const url = new URL(`postgresql://${pgUser}@127.0.0.1:${pgPort}/${name}`);
  url.password = config.databasePassword;
  return url.toString();
}

function pgEnvironment(config) {
  return { ...process.env, PGPASSWORD: config.databasePassword };
}

function clusterRunning() {
  return (
    spawnSync(executable("pg_ctl"), ["-D", data, "status"], {
      stdio: "ignore",
    }).status === 0
  );
}

function startCluster() {
  if (clusterRunning()) return false;
  run(executable("pg_ctl"), [
    "-D",
    data,
    "-l",
    join(state, "postgres.log"),
    "-o",
    `-h 127.0.0.1 -p ${pgPort}`,
    "-w",
    "start",
  ]);
  return true;
}

function stopCluster() {
  if (clusterRunning())
    run(executable("pg_ctl"), ["-D", data, "-m", "fast", "-w", "stop"]);
}

function validateCertificate(config) {
  if (!existsSync(certificatePfx) || !existsSync(certificatePem)) {
    throw new Error(
      "The local HTTPS certificate pair is incomplete. Inspect the isolated certificate directory; existing keys were not replaced.",
    );
  }
  try {
    const pfx = new X509Certificate(
      createSecureContext({
        pfx: readFileSync(certificatePfx),
        passphrase: config.certificatePassword,
      }).context.getCertificate(),
    );
    const pem = new X509Certificate(readFileSync(certificatePem));
    if (pfx.fingerprint256 !== pem.fingerprint256) {
      throw new Error("PFX/PEM mismatch");
    }
  } catch {
    throw new Error(
      "The local HTTPS PFX/PEM pair is unreadable or mismatched. Inspect it before repairing; nothing was overwritten.",
    );
  }
}

function ensureDatabase(config, name = database) {
  if (
    name !== database &&
    !/^aop_local_(?:production|restore)_test_[a-f0-9]{12}$/.test(name)
  ) {
    throw new Error(
      "Only the dedicated local database or a generated test database is allowed.",
    );
  }
  const env = pgEnvironment(config);
  const query = spawnSync(
    executable("psql"),
    [
      "-h",
      "127.0.0.1",
      "-p",
      pgPort,
      "-U",
      pgUser,
      "-d",
      "postgres",
      "-tA",
      "-c",
      `SELECT 1 FROM pg_database WHERE datname = '${name}'`,
    ],
    { env, encoding: "utf8" },
  );
  if (query.status !== 0)
    throw new Error("Could not inspect the isolated local PostgreSQL cluster.");
  if (query.stdout.trim() === "1") return false;
  run(
    executable("createdb"),
    ["-h", "127.0.0.1", "-p", pgPort, "-U", pgUser, name],
    { env },
  );
  return true;
}

async function prepare() {
  const recordedSupervisor = await supervisorIdentity();
  if (recordedSupervisor) {
    throw new Error(
      processAlive(recordedSupervisor.pid)
        ? "Stop the running local stack before rebuilding production artifacts."
        : "Recover the stale local supervisor before rebuilding production artifacts.",
    );
  }
  for (const port of [3000, 4000, 3100, 4100]) {
    if (await portListening(port)) {
      throw new Error(
        `Port ${port} is occupied; stop only the identified stack before rebuilding local production artifacts.`,
      );
    }
  }
  const config = await configuration();
  for (const name of ["initdb", "pg_ctl", "psql", "createdb"]) executable(name);
  if (!existsSync(join(data, "PG_VERSION"))) {
    if (existsSync(data))
      throw new Error(
        "Incomplete local PostgreSQL directory exists; nothing was overwritten.",
      );
    const passwordFile = join(state, "initdb-password.tmp");
    await writeFile(passwordFile, config.databasePassword, {
      flag: "wx",
      mode: 0o600,
    });
    try {
      run(executable("initdb"), [
        "-D",
        data,
        "-U",
        pgUser,
        "--encoding=UTF8",
        "--locale=C",
        "--auth-host=scram-sha-256",
        "--auth-local=scram-sha-256",
        `--pwfile=${passwordFile}`,
      ]);
    } finally {
      await unlink(passwordFile);
    }
  }

  if (!existsSync(certificatePfx) && !existsSync(certificatePem)) {
    const certificateEnvironment = {
      ...process.env,
      AOP_LOCAL_CERT_PASSWORD: config.certificatePassword,
    };
    // Windows PowerShell must load its own Certificate provider, not the
    // parent PowerShell 7 module path injected by the desktop host.
    delete certificateEnvironment.PSModulePath;
    run(
      "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      [
        "-NoProfile",
        "-File",
        join(root, "scripts", "local-production-certificate.ps1"),
        "-OutputDirectory",
        certDir,
      ],
      {
        env: certificateEnvironment,
      },
    );
  }
  validateCertificate(config);

  const startedHere = startCluster();
  try {
    ensureDatabase(config);
    const env = {
      ...process.env,
      DATABASE_URL: databaseUrl(config),
      NODE_ENV: "production",
    };
    run(
      process.execPath,
      [
        "node_modules/prisma/build/index.js",
        "migrate",
        "deploy",
        "--schema",
        "database/schema.prisma",
      ],
      { env },
    );
    const pnpmCli = process.env.npm_execpath;
    if (!pnpmCli)
      throw new Error("Run preparation through pnpm local:production:prepare.");
    run(process.execPath, [pnpmCli, "build"], {
      env: { ...env, NEXT_PUBLIC_API_ORIGIN: "https://localhost:4000" },
    });
    await writeFile(
      buildMarker,
      JSON.stringify({
        webBuildId: (
          await readFile(join(root, "apps/web/.next/BUILD_ID"), "utf8")
        ).trim(),
        apiOrigin: "https://localhost:4000",
      }),
      { mode: 0o600 },
    );
  } finally {
    if (startedHere) stopCluster();
  }
  process.stdout.write(
    "Isolated local database, migrations, certificate, and production builds are prepared.\n",
  );
}

function httpsStatus(path, port = 4000) {
  if (!existsSync(certificatePem)) return Promise.resolve(0);
  return new Promise((resolveStatus) => {
    const request = requestHttps(
      {
        hostname: "localhost",
        port,
        path,
        ca: readFileSync(certificatePem),
        timeout: 2000,
      },
      (response) => {
        response.resume();
        resolveStatus(response.statusCode ?? 0);
      },
    );
    request.on("error", () => resolveStatus(0));
    request.on("timeout", () => {
      request.destroy();
      resolveStatus(0);
    });
    request.end();
  });
}

function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

async function supervisorIdentity() {
  if (!existsSync(supervisorFile)) return null;
  try {
    const identity = JSON.parse(await readFile(supervisorFile, "utf8"));
    if (
      !Number.isInteger(identity.pid) ||
      identity.pid <= 0 ||
      typeof identity.nonce !== "string" ||
      !/^[a-f0-9]{32}$/.test(identity.nonce)
    ) {
      throw new Error("invalid");
    }
    return identity;
  } catch {
    throw new Error(
      "Local supervisor marker is invalid; inspect it before starting or stopping anything.",
    );
  }
}

async function start() {
  const recordedSupervisor = await supervisorIdentity();
  if (recordedSupervisor) {
    if (processAlive(recordedSupervisor.pid)) {
      if (process.env.AOP_LOCAL_PRODUCTION_DATABASE) {
        throw new Error(
          "A local supervisor is already running; a requested test database cannot reuse it.",
        );
      }
      const [web, api, worker] = await Promise.all([
        httpsStatus("/login", 3000),
        httpsStatus("/health/ready"),
        httpsStatus("/health/worker"),
      ]);
      if (web === 200 && api === 200 && worker === 200) {
        process.stdout.write(
          "Local production-build stack is already running at https://localhost:3000; web, API, and worker are ready. No second copy started.\n",
        );
        return;
      }
      throw new Error(
        `Local production supervisor ${recordedSupervisor.pid} is running but web/API/worker are not all ready. Run pnpm local:production:status and inspect the existing stack; do not start a second copy.`,
      );
    }
    throw new Error(
      "A stale local supervisor marker remains. Inspect it and run pnpm local:production:recover before restarting.",
    );
  }
  for (const port of [3000, 4000, 3100, 4100]) {
    if (await portListening(port)) {
      process.stderr.write(
        `Port ${port} is occupied. If pnpm dev is running, use http://localhost:3000; otherwise identify the owner and stop only that service before starting the HTTPS stack.\n`,
      );
      process.exitCode = 1;
      return;
    }
  }
  if (
    !existsSync(configFile) ||
    !existsSync(join(data, "PG_VERSION")) ||
    !existsSync(certificatePfx) ||
    !existsSync(certificatePem) ||
    !existsSync(buildMarker) ||
    !existsSync(join(root, "apps/web/.next/BUILD_ID")) ||
    !existsSync(join(root, "apps/api/dist/main.js"))
  ) {
    throw new Error(
      "Local production runtime is not prepared. Run pnpm local:production:prepare first.",
    );
  }
  const built = JSON.parse(await readFile(buildMarker, "utf8"));
  const currentWebBuildId = (
    await readFile(join(root, "apps/web/.next/BUILD_ID"), "utf8")
  ).trim();
  if (
    built.webBuildId !== currentWebBuildId ||
    built.apiOrigin !== "https://localhost:4000"
  ) {
    throw new Error(
      "The web build no longer matches the configured local HTTPS API origin. Run pnpm local:production:prepare before starting.",
    );
  }
  const config = JSON.parse(await readFile(configFile, "utf8"));
  validateCertificate(config);
  const selectedDatabase =
    process.env.AOP_LOCAL_PRODUCTION_DATABASE ?? database;
  if (
    selectedDatabase !== database &&
    (!/^aop_local_production_test_[a-f0-9]{12}$/.test(selectedDatabase) ||
      process.env.AOP_E2E_DISPOSABLE_DB !== "true")
  ) {
    throw new Error("A generated test database requires the guarded E2E mode.");
  }
  const supervisorNonce = randomBytes(16).toString("hex");
  await writeFile(
    supervisorFile,
    JSON.stringify({ pid: process.pid, nonce: supervisorNonce }),
    { flag: "wx", mode: 0o600 },
  );
  let startedHere;
  try {
    startedHere = startCluster();
  } catch (error) {
    await unlink(supervisorFile);
    throw error;
  }
  const common = {
    ...process.env,
    NODE_ENV: "production",
    AOP_LOCAL_PRODUCTION: "true",
    DATABASE_URL: databaseUrl(config, selectedDatabase),
    AUTH_TOKEN_PEPPER: config.tokenPepper,
    AUTH_EMAIL_TRANSPORT: "development",
    APP_ORIGIN: "https://localhost:3000",
    NEXT_PUBLIC_API_ORIGIN: "https://localhost:4000",
  };
  const children = new Map();
  let stopping = false;
  let stopPromise;
  let failureReason;
  const restartAttempts = { worker: 0, proxy: 0 };
  const serviceReady = { worker: false, proxy: false };
  const serviceStartedAt = { worker: 0, proxy: 0 };
  const restartTimers = new Map();
  const restartableServices = {
    worker: {
      args: [join(root, "apps/api/dist/worker.js")],
      env: common,
    },
    proxy: {
      args: [join(root, "scripts/local-production-proxy.mjs")],
      env: {
        ...common,
        AOP_LOCAL_CERT_PFX: certificatePfx,
        AOP_LOCAL_CERT_PEM: certificatePem,
        AOP_LOCAL_CERT_PASSWORD: config.certificatePassword,
      },
    },
  };
  let shutdownPoll;
  const shutdownRequest = join(state, `stop-${supervisorNonce}.request`);
  process.stdout.write(
    `Local runtime state: ${state}; PostgreSQL data: ${data}.\n`,
  );

  function serviceFailed(name, detail) {
    if (stopping) return;
    if (name in restartableServices) {
      if (
        serviceReady[name] &&
        Date.now() - serviceStartedAt[name] >= 5 * 60_000
      ) {
        restartAttempts[name] = 0;
      }
      serviceReady[name] = false;
      if (restartAttempts[name] < 5) {
        restartAttempts[name] += 1;
        const delay = Math.min(1000 * 2 ** restartAttempts[name], 30_000);
        process.stderr.write(
          `Local ${name} ${detail}; restart ${restartAttempts[name]}/5 in ${delay} ms.\n`,
        );
        restartTimers.set(
          name,
          globalThis.setTimeout(() => {
            restartTimers.delete(name);
            spawnRestartable(name);
          }, delay),
        );
        return;
      }
    }
    failureReason = `${name} ${detail}`;
    process.exitCode = 1;
    process.stderr.write(`${failureReason}; stopping the local stack.\n`);
    void stop();
  }

  function spawnRestartable(name) {
    const service = restartableServices[name];
    return spawnService(name, service.args, service.env, root, true);
  }

  function spawnService(name, args, env, cwd = root, ipc = false) {
    const child = spawn(process.execPath, args, {
      cwd,
      env,
      stdio: ipc ? ["ignore", "inherit", "inherit", "ipc"] : "inherit",
      windowsHide: true,
    });
    children.set(name, child);
    if (name in restartableServices) {
      serviceReady[name] = false;
      serviceStartedAt[name] = Date.now();
      child.on("message", (message) => {
        if (message?.type === "ready") serviceReady[name] = true;
      });
    }
    let handled = false;
    child.on("error", (error) => {
      if (handled) return;
      handled = true;
      children.delete(name);
      serviceFailed(
        name,
        `failed to launch (${error.code ?? "unknown error"})`,
      );
    });
    child.on("exit", (code) => {
      if (handled) return;
      handled = true;
      children.delete(name);
      serviceFailed(name, `exited (${code ?? child.signalCode ?? "unknown"})`);
    });
    return child;
  }

  function stop() {
    if (stopPromise) return stopPromise;
    stopping = true;
    stopPromise = (async () => {
      if (shutdownPoll) globalThis.clearInterval(shutdownPoll);
      for (const timer of restartTimers.values())
        globalThis.clearTimeout(timer);
      restartTimers.clear();
      try {
        const worker = children.get("worker");
        if (worker) {
          if (worker.connected) {
            try {
              worker.send({ type: "shutdown" });
            } catch {
              worker.kill();
            }
          }
          if (!(await waitForExit(worker, 30_000))) worker.kill();
        }
        const remaining = [...children.values()];
        for (const [name, child] of children) {
          if (name === "proxy" && child.connected) {
            try {
              child.send({ type: "shutdown" });
            } catch {
              child.kill();
            }
          } else child.kill();
        }
        for (const child of remaining) {
          if (!(await waitForExit(child, 10_000))) {
            child.kill();
            if (!(await waitForExit(child, 5_000))) {
              throw new Error(`Child process ${child.pid} did not exit.`);
            }
          }
        }
        if (startedHere) {
          stopCluster();
          if (clusterRunning()) throw new Error("PostgreSQL did not stop.");
        }
        if (existsSync(shutdownRequest)) await unlink(shutdownRequest);
        if (existsSync(supervisorFile)) {
          const current = await supervisorIdentity();
          if (current?.nonce === supervisorNonce) await unlink(supervisorFile);
        }
        process.stdout.write(
          "Local production-build stack stopped; database files remain.\n",
        );
        return true;
      } catch (error) {
        process.exitCode = 1;
        process.stderr.write(
          `Local shutdown incomplete: ${error.message}. Inspect the stack before recovery.\n`,
        );
        return false;
      }
    })();
    return stopPromise;
  }

  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());
  process.once("message", (message) => {
    if (message?.type === "shutdown") void stop();
  });
  shutdownPoll = globalThis.setInterval(() => {
    if (existsSync(shutdownRequest)) void stop();
  }, 500);
  spawnService("api", [join(root, "apps/api/dist/main.js")], {
    ...common,
    PORT: "4100",
  });
  spawnRestartable("worker");
  spawnService(
    "web",
    [
      join(root, "apps/web/node_modules/next/dist/bin/next"),
      "start",
      "-p",
      "3100",
      "-H",
      "127.0.0.1",
    ],
    { ...common, PORT: "3100" },
    join(root, "apps/web"),
  );
  spawnRestartable("proxy");

  for (let attempt = 0; attempt < 60 && !stopping; attempt += 1) {
    const [web, api, worker] = await Promise.all([
      httpsStatus("/login", 3000),
      httpsStatus("/health/ready"),
      httpsStatus("/health/worker"),
    ]);
    if (
      web === 200 &&
      api === 200 &&
      worker === 200 &&
      serviceReady.worker &&
      serviceReady.proxy &&
      children.size === 4
    ) {
      process.stdout.write(
        "Local production-build stack ready at https://localhost:3000; web, API, and worker are ready.\n",
      );
      if (process.connected) process.send({ type: "ready" });
      return;
    }
    await new Promise((resolveDelay) =>
      globalThis.setTimeout(resolveDelay, 1000),
    );
  }
  if (!stopping) {
    await stop();
    throw new Error(
      "Local web/API/worker readiness did not succeed within 60 seconds.",
    );
  }
  await stop();
  if (failureReason) throw new Error(`Local startup failed: ${failureReason}.`);
}

async function requestStop() {
  const identity = await supervisorIdentity();
  if (!identity) {
    throw new Error("No local production supervisor is recorded as running.");
  }
  if (!processAlive(identity.pid)) {
    throw new Error(
      "The local supervisor is no longer running. Inspect and run pnpm local:production:recover; nothing was stopped.",
    );
  }
  const request = join(state, `stop-${identity.nonce}.request`);
  if (!existsSync(request)) await writeFile(request, "", { flag: "wx" });
  for (let attempt = 0; attempt < 180; attempt += 1) {
    if (
      !existsSync(supervisorFile) &&
      !(await portListening(3000)) &&
      !(await portListening(4000)) &&
      !(await portListening(3100)) &&
      !(await portListening(4100))
    ) {
      process.stdout.write(
        "Local production-build stack stopped through its supervisor.\n",
      );
      return;
    }
    await new Promise((resolveDelay) =>
      globalThis.setTimeout(resolveDelay, 500),
    );
  }
  throw new Error(
    "The local supervisor did not complete shutdown within 90 seconds; inspect its terminal.",
  );
}

async function recoverSupervisor() {
  const identity = await supervisorIdentity();
  if (!identity) {
    process.stdout.write("No stale local supervisor marker exists.\n");
    return;
  }
  if (processAlive(identity.pid)) {
    throw new Error(
      "The recorded supervisor process is still alive; recovery is unsafe.",
    );
  }
  for (const port of [3000, 4000, 3100, 4100]) {
    if (await portListening(port)) {
      throw new Error(`Port ${port} is still in use; recovery is unsafe.`);
    }
  }
  const current = await supervisorIdentity();
  if (current?.nonce !== identity.nonce || current.pid !== identity.pid) {
    throw new Error(
      "Supervisor marker changed during recovery; nothing was removed.",
    );
  }
  if (existsSync(join(data, "PG_VERSION")) && clusterRunning()) {
    stopCluster();
    if (clusterRunning()) {
      throw new Error("The verified isolated PostgreSQL cluster did not stop.");
    }
  }
  await unlink(supervisorFile);
  const request = join(state, `stop-${identity.nonce}.request`);
  if (existsSync(request)) await unlink(request);
  process.stdout.write(
    "Removed only the verified stale supervisor marker; database files remain.\n",
  );
}

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null)
    return Promise.resolve(true);
  return new Promise((resolveExit) => {
    const timer = globalThis.setTimeout(() => {
      child.off("exit", onExit);
      resolveExit(false);
    }, timeoutMs);
    function onExit() {
      globalThis.clearTimeout(timer);
      resolveExit(true);
    }
    child.once("exit", onExit);
  });
}

function portListening(port) {
  return new Promise((resolveStatus) => {
    const socket = connect({ host: "127.0.0.1", port });
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolveStatus(true);
    });
    socket.once("error", () => resolveStatus(false));
    socket.once("timeout", () => {
      socket.destroy();
      resolveStatus(false);
    });
  });
}

function persistedCounts(config, name) {
  const sql =
    "SELECT (SELECT count(*) FROM users), (SELECT count(*) FROM workflows), (SELECT count(*) FROM notifications), (SELECT count(*) FROM activity_events)";
  const result = spawnSync(
    executable("psql"),
    [
      "-h",
      "127.0.0.1",
      "-p",
      pgPort,
      "-U",
      pgUser,
      "-d",
      name,
      "-tA",
      "-c",
      sql,
    ],
    { env: pgEnvironment(config), encoding: "utf8" },
  );
  if (result.status !== 0)
    throw new Error(
      `Could not verify persisted test records: ${result.stderr?.trim() || "psql failed"}`,
    );
  return result.stdout.trim().split("|").map(Number);
}

function launchTestStack(testDatabase) {
  return spawn(process.execPath, [fileURLToPath(import.meta.url), "start"], {
    cwd: root,
    env: {
      ...process.env,
      AOP_LOCAL_PRODUCTION_DATABASE: testDatabase,
      AOP_E2E_DISPOSABLE_DB: "true",
    },
    stdio: ["ignore", "inherit", "inherit", "ipc"],
    windowsHide: true,
  });
}

async function waitForTestStack(stack) {
  let supervisorReady = false;
  const onReady = (message) => {
    if (message?.type === "ready") supervisorReady = true;
  };
  stack.on("message", onReady);
  try {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (stack.exitCode !== null) break;
      if (
        supervisorReady &&
        (await httpsStatus("/login", 3000)) === 200 &&
        (await httpsStatus("/health/ready")) === 200 &&
        (await httpsStatus("/health/worker")) === 200
      )
        return;
      await new Promise((resolveDelay) =>
        globalThis.setTimeout(resolveDelay, 1000),
      );
    }
    throw new Error("Built-stack browser test services did not become ready.");
  } finally {
    stack.off("message", onReady);
  }
}

async function stopTestStack(stack) {
  if (stack.exitCode !== null || stack.signalCode !== null) return;
  if (stack.connected) stack.send({ type: "shutdown" });
  if (!(await waitForExit(stack, 45_000))) {
    throw new Error(
      "The built-stack supervisor did not stop; test database retained for safety.",
    );
  }
}

async function browserE2e() {
  if ((await portListening(3000)) || (await portListening(4000))) {
    throw new Error(
      "Ports 3000/4000 are occupied. Stop only the existing local stack before built-stack E2E.",
    );
  }
  if (
    !existsSync(join(data, "PG_VERSION")) ||
    !existsSync(join(certDir, "localhost.pem"))
  ) {
    throw new Error("Prepare the isolated local production build first.");
  }
  const config = JSON.parse(await readFile(configFile, "utf8"));
  const testDatabase = `aop_local_production_test_${randomBytes(6).toString("hex")}`;
  const testUrl = databaseUrl(config, testDatabase);
  const startedHere = startCluster();
  let created = false;
  let stack;
  try {
    created = ensureDatabase(config, testDatabase);
    run(
      process.execPath,
      [
        "node_modules/prisma/build/index.js",
        "migrate",
        "deploy",
        "--schema",
        "database/schema.prisma",
      ],
      {
        env: { ...process.env, DATABASE_URL: testUrl, NODE_ENV: "production" },
      },
    );
    stack = launchTestStack(testDatabase);
    await waitForTestStack(stack);
    const pnpmCli = process.env.npm_execpath;
    if (!pnpmCli) throw new Error("Run built-stack E2E through pnpm.");
    run(process.execPath, [pnpmCli, "test:browser"], {
      env: {
        ...process.env,
        DATABASE_URL: testUrl,
        AOP_E2E_DISPOSABLE_DB: "true",
        AOP_E2E_EXTERNAL_BUILT_STACK: "true",
        AOP_E2E_LOCAL_CERT_PEM: join(certDir, "localhost.pem"),
        AOP_E2E_WEB_ORIGIN: "https://localhost:3000",
        AOP_E2E_API_ORIGIN: "https://localhost:4000",
      },
    });
    process.stdout.write(
      "Built-stack Chromium tests passed against a disposable local database.\n",
    );
    const beforeRestart = persistedCounts(config, testDatabase);
    if (beforeRestart.some((count) => !Number.isInteger(count) || count < 1)) {
      throw new Error(
        "The browser journey did not persist all expected record categories.",
      );
    }
    await stopTestStack(stack);
    stack = launchTestStack(testDatabase);
    await waitForTestStack(stack);
    const afterRestart = persistedCounts(config, testDatabase);
    if (JSON.stringify(beforeRestart) !== JSON.stringify(afterRestart)) {
      throw new Error(
        "Persisted record counts changed across a normal stack restart.",
      );
    }
    process.stdout.write(
      "User, workflow, notification, and activity records survived a normal built-stack restart.\n",
    );
  } finally {
    if (stack) await stopTestStack(stack);
    if (created && (!stack || stack.exitCode !== null)) {
      run(
        executable("dropdb"),
        ["-h", "127.0.0.1", "-p", pgPort, "-U", pgUser, testDatabase],
        {
          env: pgEnvironment(config),
        },
      );
      process.stdout.write(
        "Removed only the generated built-stack test database.\n",
      );
    }
    if (startedHere) stopCluster();
  }
}

async function databaseIntegration() {
  if (!existsSync(join(data, "PG_VERSION"))) {
    throw new Error("The isolated local PostgreSQL cluster is not prepared.");
  }
  const config = JSON.parse(await readFile(configFile, "utf8"));
  const testDatabase = `aop_local_production_test_${randomBytes(6).toString("hex")}`;
  const testUrl = databaseUrl(config, testDatabase);
  const startedHere = startCluster();
  let created = false;
  try {
    created = ensureDatabase(config, testDatabase);
    run(
      process.execPath,
      [
        "node_modules/prisma/build/index.js",
        "migrate",
        "deploy",
        "--schema",
        "database/schema.prisma",
      ],
      {
        env: { ...process.env, DATABASE_URL: testUrl, NODE_ENV: "test" },
      },
    );
    run(process.execPath, ["node_modules/vitest/vitest.mjs", "run"], {
      env: {
        ...process.env,
        DATABASE_URL: testUrl,
        TEST_DATABASE_URL: testUrl,
        RUN_DATABASE_INTEGRATION_TESTS: "true",
        NODE_ENV: "test",
      },
    });
    process.stdout.write(
      "All database integration suites passed against the isolated disposable database.\n",
    );
  } finally {
    if (created) {
      run(
        executable("dropdb"),
        ["-h", "127.0.0.1", "-p", pgPort, "-U", pgUser, testDatabase],
        { env: pgEnvironment(config) },
      );
      process.stdout.write(
        "Removed only the generated integration database.\n",
      );
    }
    if (startedHere) stopCluster();
  }
}

async function backupRestoreRehearsal() {
  if (!existsSync(join(data, "PG_VERSION"))) {
    throw new Error("The isolated local PostgreSQL cluster is not prepared.");
  }
  const config = JSON.parse(await readFile(configFile, "utf8"));
  const restoreDatabase = `aop_local_restore_test_${randomBytes(6).toString("hex")}`;
  const temporary = await mkdtemp(join(tmpdir(), "aop-local-restore-"));
  const archive = join(temporary, "local-production.dump");
  const startedHere = startCluster();
  let created = false;
  try {
    const env = pgEnvironment(config);
    run(
      executable("pg_dump"),
      [
        "-h",
        "127.0.0.1",
        "-p",
        pgPort,
        "-U",
        pgUser,
        "-d",
        database,
        "--format=custom",
        "--no-owner",
        "--no-acl",
        `--file=${archive}`,
      ],
      { env },
    );
    created = ensureDatabase(config, restoreDatabase);
    run(
      executable("pg_restore"),
      [
        "-h",
        "127.0.0.1",
        "-p",
        pgPort,
        "-U",
        pgUser,
        "-d",
        restoreDatabase,
        "--exit-on-error",
        "--no-owner",
        "--no-acl",
        archive,
      ],
      { env },
    );
    const original = persistedCounts(config, database);
    const restored = persistedCounts(config, restoreDatabase);
    if (JSON.stringify(original) !== JSON.stringify(restored)) {
      throw new Error(
        "Restored operational record counts differ from the source.",
      );
    }
    const sourcePrisma = new PrismaClient({
      datasourceUrl: databaseUrl(config, database),
    });
    const prisma = new PrismaClient({
      datasourceUrl: databaseUrl(config, restoreDatabase),
    });
    try {
      const sourceMigrations = await sourcePrisma.$queryRaw`
        SELECT count(*)::integer AS count FROM "_prisma_migrations"
      `;
      const restoredMigrations = await prisma.$queryRaw`
        SELECT count(*)::integer AS count FROM "_prisma_migrations"
      `;
      if (
        !sourceMigrations[0]?.count ||
        sourceMigrations[0].count !== restoredMigrations[0]?.count
      )
        throw new Error("Restored migration history is incomplete.");
      await prisma.$queryRaw`SELECT 1`;
    } finally {
      await sourcePrisma.$disconnect();
      await prisma.$disconnect();
    }
    process.stdout.write(
      "Custom dump restored to a generated database; Prisma connected, migration history and operational counts matched.\n",
    );
  } finally {
    if (created) {
      run(
        executable("dropdb"),
        ["-h", "127.0.0.1", "-p", pgPort, "-U", pgUser, restoreDatabase],
        { env: pgEnvironment(config) },
      );
      process.stdout.write(
        "Removed only the generated restore-test database.\n",
      );
    }
    if (startedHere) stopCluster();
    if (existsSync(archive)) await unlink(archive);
    await rmdir(temporary);
  }
}

if (mode === "prepare") await prepare();
else if (mode === "start") await start();
else if (mode === "stop") await requestStop();
else if (mode === "recover") await recoverSupervisor();
else if (mode === "run") {
  await prepare();
  await start();
} else if (mode === "e2e") {
  await browserE2e();
} else if (mode === "db-test") {
  await databaseIntegration();
} else if (mode === "restore-test") {
  await backupRestoreRehearsal();
} else if (mode === "status") {
  const [web, api, worker] = await Promise.all([
    httpsStatus("/login", 3000),
    httpsStatus("/health/ready"),
    httpsStatus("/health/worker"),
  ]);
  const identity = await supervisorIdentity();
  const supervisor = identity
    ? processAlive(identity.pid)
      ? "running"
      : "stale marker"
    : "not recorded";
  const postgres = existsSync(join(data, "PG_VERSION")) && clusterRunning();
  process.stdout.write(
    `Supervisor: ${supervisor}; PostgreSQL: ${postgres ? "running" : "unavailable"}; web: ${web || "unavailable"}; API readiness: ${api || "unavailable"}; worker readiness: ${worker || "unavailable"}.\n`,
  );
  if (
    supervisor !== "running" ||
    !postgres ||
    web !== 200 ||
    api !== 200 ||
    worker !== 200
  )
    process.exitCode = 1;
} else
  throw new Error(
    "Use prepare, start, stop, recover, run, e2e, db-test, restore-test, or status.",
  );
