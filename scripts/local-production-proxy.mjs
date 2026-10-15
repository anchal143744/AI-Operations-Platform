import { X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import { request as requestHttp } from "node:http";
import { createServer } from "node:https";
import { createSecureContext } from "node:tls";
import process from "node:process";

const pfxPath = process.env.AOP_LOCAL_CERT_PFX;
const pemPath = process.env.AOP_LOCAL_CERT_PEM;
if (!pfxPath || !pemPath)
  throw new Error("Local HTTPS certificate paths are missing.");
const pfx = readFileSync(pfxPath);
const passphrase = process.env.AOP_LOCAL_CERT_PASSWORD;
if (!passphrase)
  throw new Error("Local HTTPS certificate password is missing.");
const pfxCertificate = new X509Certificate(
  createSecureContext({ pfx, passphrase }).context.getCertificate(),
);
const pemCertificate = new X509Certificate(readFileSync(pemPath));
if (pfxCertificate.fingerprint256 !== pemCertificate.fingerprint256) {
  throw new Error("The local HTTPS PFX and PEM certificates do not match.");
}

const listeners = [
  { publicPort: 3000, targetPort: 3100 },
  { publicPort: 4000, targetPort: 4100 },
].map(({ publicPort, targetPort }) => {
  const server = createServer({ pfx, passphrase }, (incoming, outgoing) => {
    const headers = { ...incoming.headers };
    for (const name of Object.keys(headers)) {
      if (name.toLowerCase().startsWith("x-forwarded-")) delete headers[name];
    }
    headers.host = `localhost:${publicPort}`;
    headers["x-forwarded-proto"] = "https";
    headers["x-forwarded-host"] = `localhost:${publicPort}`;
    const upstream = requestHttp(
      {
        hostname: "127.0.0.1",
        port: targetPort,
        path: incoming.url,
        method: incoming.method,
        headers,
      },
      (response) => {
        outgoing.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(outgoing);
      },
    );
    upstream.on("error", () => {
      if (!outgoing.headersSent) outgoing.writeHead(502);
      outgoing.end("Local application service is unavailable.");
    });
    incoming.pipe(upstream);
  });
  return { server, publicPort };
});

try {
  await Promise.all(
    listeners.map(
      ({ server, publicPort }) =>
        new Promise((resolve, reject) => {
          server.once("error", reject);
          server.listen(publicPort, "127.0.0.1", () => {
            server.off("error", reject);
            server.on("error", (error) => {
              process.stderr.write(
                `Local HTTPS listener ${publicPort} failed: ${error.message}\n`,
              );
              process.exitCode = 1;
              stop();
            });
            resolve();
          });
        }),
    ),
  );
} catch (error) {
  for (const { server } of listeners) if (server.listening) server.close();
  throw error;
}

process.stdout.write(
  `Local HTTPS listeners: https://localhost:3000 (web), https://localhost:4000 (API); certificate SHA-256 ${pfxCertificate.fingerprint256}.\n`,
);
if (process.connected) process.send({ type: "ready" });

function stop() {
  for (const { server } of listeners) if (server.listening) server.close();
  if (process.connected) process.disconnect();
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
process.once("message", (message) => {
  if (message?.type === "shutdown") stop();
});
