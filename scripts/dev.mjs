import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { connect } from "node:net";
import { resolve } from "node:path";
import process from "node:process";

const envPath = resolve(".env");
if (existsSync(envPath)) process.loadEnvFile(envPath);

const pnpmCli = process.env.npm_execpath;
if (!pnpmCli) {
  throw new Error("Run this launcher through pnpm dev.");
}

const webPort = Number(process.env.WEB_PORT ?? process.env.PORT ?? 3000);
const apiPort = Number(process.env.API_PORT ?? 4000);

function isListening(port) {
  return new Promise((resolve) => {
    const socket = connect({ host: "127.0.0.1", port });
    socket.setTimeout(1500);
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

async function isHealthy(url, expectedText) {
  try {
    const response = await globalThis.fetch(url, {
      // A cold Next route may compile on its first request.
      signal: globalThis.AbortSignal.timeout(12_000),
    });
    return response.ok && (await response.text()).includes(expectedText);
  } catch {
    return false;
  }
}

const [webListening, apiListening] = await Promise.all([
  isListening(webPort),
  isListening(apiPort),
]);

if (!webListening && !apiListening) {
  for (const args of [
    ["--filter", "@aop/types", "build"],
    ["--filter", "@aop/api", "build:dev"],
  ]) {
    const build = spawnSync(process.execPath, [pnpmCli, ...args], {
      stdio: "inherit",
      env: process.env,
    });
    if (build.status !== 0) {
      process.stderr.write(
        `Development prerequisite build failed: ${args.join(" ")}.\n`,
      );
      process.exit(build.status ?? 1);
    }
  }
  if ((await isListening(webPort)) || (await isListening(apiPort))) {
    process.stderr.write(
      "A web or API port became occupied during prerequisite builds; no second dev stack was started.\n",
    );
    process.exit(1);
  }
}

if (webListening || apiListening) {
  const [webHealthy, apiHealthy] = await Promise.all([
    webListening
      ? isHealthy(`http://127.0.0.1:${webPort}/`, "AI Operations Platform")
      : false,
    apiListening
      ? isHealthy(
          `http://127.0.0.1:${apiPort}/health/ready`,
          '"status":"ready"',
        )
      : false,
  ]);
  if (webHealthy && apiHealthy) {
    const workerHealthy = await isHealthy(
      `http://127.0.0.1:${apiPort}/health/worker`,
      '"status":"ready"',
    );
    if (workerHealthy) {
      process.stdout.write(
        `Web, API, and worker already run at http://localhost:${webPort} and http://localhost:${apiPort}. No duplicate session started.\n`,
      );
    } else {
      process.stderr.write(
        "Web/API are already running, but the worker is not ready. Restart only the existing managed dev session; a second pnpm dev cannot safely repair it.\n",
      );
      process.exitCode = 1;
    }
  } else {
    process.stderr.write(
      `Cannot start another dev session. Port ${webPort} (web) or ${apiPort} (API) is occupied, and the existing pair is not healthy. Stop only the stale AI-Operations-Platform process, then retry.\n`,
    );
    process.exitCode = 1;
  }
} else {
  const services = spawn(
    process.execPath,
    [pnpmCli, "-r", "--parallel", "--if-present", "dev"],
    {
      stdio: "inherit",
      env: { ...process.env, PORT: String(webPort), API_PORT: String(apiPort) },
    },
  );
  let stopping = false;
  let worker;
  let restartTimer;
  let workerStopTimer;
  let failures = 0;
  const workerPath = resolve("apps/api/dist-dev/worker.js");

  async function startWorkerWhenApiReady() {
    for (let attempt = 0; attempt < 60 && !stopping; attempt += 1) {
      if (
        existsSync(workerPath) &&
        (await isHealthy(
          `http://127.0.0.1:${apiPort}/health/ready`,
          '"status":"ready"',
        ))
      ) {
        if (!stopping) startWorker();
        return;
      }
      await new Promise((resolveDelay) =>
        globalThis.setTimeout(resolveDelay, 1000),
      );
    }
    if (!stopping) {
      process.stderr.write(
        "API or compiled worker did not become ready; stopping the incomplete dev stack.\n",
      );
      process.exitCode = 1;
      stop();
    }
  }

  function startWorker() {
    if (stopping) return;
    const startedAt = Date.now();
    worker = spawn(process.execPath, [workerPath], {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
      env: process.env,
    });
    worker.on("error", (error) => {
      process.stderr.write(`Local outbox worker failed: ${error.message}\n`);
    });
    worker.on("exit", (code, signal) => {
      if (workerStopTimer) globalThis.clearTimeout(workerStopTimer);
      worker = undefined;
      if (stopping) return;
      failures = Date.now() - startedAt >= 60_000 ? 1 : failures + 1;
      const delayMs = Math.min(30_000, 1000 * 2 ** Math.min(failures - 1, 5));
      process.stderr.write(
        `Local outbox worker exited (${code ?? signal}); restarting in ${delayMs} ms.\n`,
      );
      restartTimer = globalThis.setTimeout(() => {
        void startWorkerWhenApiReady();
      }, delayMs);
    });
    worker.on("spawn", () => {
      process.stdout.write("Local outbox worker launched.\n");
    });
  }

  function stop() {
    if (stopping) return;
    stopping = true;
    if (restartTimer) globalThis.clearTimeout(restartTimer);
    if (worker?.connected) {
      worker.send({ type: "shutdown" });
      workerStopTimer = globalThis.setTimeout(() => {
        process.stderr.write(
          "Local worker exceeded its shutdown grace period.\n",
        );
        worker?.kill();
      }, 60_000);
    } else {
      worker?.kill();
    }
    services.kill();
  }

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  services.on("error", (error) => {
    process.stderr.write(
      `Failed to start development services: ${error.message}\n`,
    );
    stop();
    process.exitCode = 1;
  });
  services.on("exit", (code) => {
    stop();
    process.exitCode = code ?? 1;
  });
  void startWorkerWhenApiReady();
}
