import { createServer } from "node:https";
import { request as httpRequest } from "node:http";
import { readFileSync } from "node:fs";

const appPort = Number(process.argv[2] ?? "3101");
const proxyPort = Number(process.argv[3] ?? "3102");
const keyPath = process.argv[4];
const certPath = process.argv[5];
if (!keyPath || !certPath) throw new Error("Temporary HTTPS certificate paths are required.");

const server = createServer({ key: readFileSync(keyPath), cert: readFileSync(certPath) }, (incoming, outgoing) => {
  const forwardedHost = incoming.headers.host ?? `localhost:${proxyPort}`;
  const upstream = httpRequest({
    hostname: "127.0.0.1",
    port: appPort,
    method: incoming.method,
    path: incoming.url,
    headers: {
      ...incoming.headers,
      host: `127.0.0.1:${appPort}`,
      "x-forwarded-host": forwardedHost,
      "x-forwarded-proto": "https",
      "x-forwarded-for": incoming.socket.remoteAddress ?? "127.0.0.1",
    },
  }, (response) => {
    outgoing.writeHead(response.statusCode ?? 502, response.headers);
    response.pipe(outgoing);
  });
  upstream.on("error", () => {
    if (!outgoing.headersSent) outgoing.writeHead(502, { "content-type": "text/plain" });
    outgoing.end("Local Admin smoke upstream is unavailable.");
  });
  incoming.pipe(upstream);
});

server.listen(proxyPort, "127.0.0.1", () => console.log(`Local HTTPS Admin proxy ready on 127.0.0.1:${proxyPort}`));
