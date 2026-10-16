import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, open } from "node:fs/promises";
import { connect } from "node:net";
import { join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new globalThis.URL("..", import.meta.url)));
const webUrl = "http://localhost:3000";
const apiUrl = "http://127.0.0.1:4000";
const noBrowser = process.argv.includes("--no-browser");

if (process.platform !== "win32") {
  throw new Error(
    "The one-click local launcher is for Windows only. Use pnpm dev on this platform.",
  );
}

function listening(port) {
  return new Promise((resolveListening) => {
    const socket = connect({ host: "127.0.0.1", port });
    socket.setTimeout(1500);
    socket.once("connect", () => {
      socket.destroy();
      resolveListening(true);
    });
    socket.once("error", () => resolveListening(false));
    socket.once("timeout", () => {
      socket.destroy();
      resolveListening(false);
    });
  });
}

async function healthy(path, expected) {
  try {
    const response = await globalThis.fetch(path, {
      signal: globalThis.AbortSignal.timeout(8000),
    });
    return response.ok && (await response.text()).includes(expected);
  } catch {
    return false;
  }
}

async function ready() {
  const [web, api, worker] = await Promise.all([
    healthy(`${webUrl}/login`, "AI Operations Platform"),
    healthy(`${apiUrl}/health/ready`, '"component":"api"'),
    healthy(`${apiUrl}/health/worker`, '"component":"worker"'),
  ]);
  return web && api && worker;
}

async function openAppWindow() {
  const edgePaths = [
    join(
      process.env["ProgramFiles(x86)"] ?? "",
      "Microsoft",
      "Edge",
      "Application",
      "msedge.exe",
    ),
    join(
      process.env.ProgramFiles ?? "",
      "Microsoft",
      "Edge",
      "Application",
      "msedge.exe",
    ),
  ];
  const edge = edgePaths.find((path) => existsSync(path));
  if (edge) {
    const browser = spawn(edge, [`--app=${webUrl}/login`, "--new-window"], {
      detached: true,
      stdio: "ignore",
    });
    await new Promise((resolveSpawn, rejectSpawn) => {
      browser.once("spawn", resolveSpawn);
      browser.once("error", rejectSpawn);
    });
    browser.unref();
    return;
  }
  // Edge is normally present on Windows; fall back to the default browser.
  const browser = spawn(
    process.env.ComSpec ?? "cmd.exe",
    ["/d", "/s", "/c", `start "" "${webUrl}/login"`],
    { detached: true, stdio: "ignore", windowsHide: true },
  );
  await new Promise((resolveSpawn, rejectSpawn) => {
    browser.once("spawn", resolveSpawn);
    browser.once("error", rejectSpawn);
  });
  browser.unref();
}

async function main() {
  const [webPort, apiPort] = await Promise.all([
    listening(3000),
    listening(4000),
  ]);
  if (webPort || apiPort) {
    if (!(await ready())) {
      throw new Error(
        "Port 3000 or 4000 is already in use, but the complete web/API/worker stack is not ready. Inspect the existing process; this launcher will not start a duplicate or stop an unknown service.",
      );
    }
    process.stdout.write("Existing local web, API, and worker are ready.\n");
  } else {
    const localData = process.env.LOCALAPPDATA;
    if (!localData)
      throw new Error(
        "LOCALAPPDATA is unavailable; cannot place private startup logs safely.",
      );
    const logDirectory = join(localData, "AI-Operations-Platform", "launcher");
    await mkdir(logDirectory, { recursive: true });
    const logPath = join(logDirectory, "dev.log");
    const log = await open(logPath, "a", 0o600);
    let server;
    try {
      server = spawn(
        process.env.ComSpec ?? "cmd.exe",
        ["/d", "/s", "/c", "pnpm dev"],
        {
          cwd: root,
          detached: true,
          windowsHide: true,
          stdio: ["ignore", log.fd, log.fd],
        },
      );
      await new Promise((resolveSpawn, rejectSpawn) => {
        server.once("spawn", resolveSpawn);
        server.once("error", rejectSpawn);
      });
      server.unref();
    } finally {
      await log.close();
    }
    process.stdout.write(`Starting local app. Diagnostic log: ${logPath}\n`);
    for (let attempt = 0; attempt < 150; attempt += 1) {
      if (await ready()) break;
      if (server.exitCode !== null) {
        throw new Error(
          `The local stack exited before readiness. Inspect ${logPath}.`,
        );
      }
      await new Promise((resolveDelay) =>
        globalThis.setTimeout(resolveDelay, 1000),
      );
    }
    if (!(await ready())) {
      throw new Error(
        `The local stack did not become ready. Inspect ${logPath}.`,
      );
    }
    process.stdout.write("Local web, API, and worker are ready.\n");
  }
  if (!noBrowser) await openAppWindow();
  process.stdout.write(`Open ${webUrl}/login\n`);
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
