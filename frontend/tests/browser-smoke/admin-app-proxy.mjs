import { createServer } from "node:https";
import { request as httpRequest } from "node:http";
import { readFileSync } from "node:fs";

const appPort = Number(process.argv[2] ?? "3101");
const proxyPort = Number(process.argv[3] ?? "3102");
const keyPath = process.argv[4];
const certPath = process.argv[5];
if (!keyPath || !certPath) throw new Error("Temporary HTTPS certificate paths are required.");

function upstreamOptions(incoming) {
  return {
    hostname: "127.0.0.1",
    port: appPort,
    method: incoming.method,
    path: incoming.url,
    headers: {
      ...incoming.headers,
      host: `127.0.0.1:${appPort}`,
      "x-forwarded-host": incoming.headers.host ?? `localhost:${proxyPort}`,
      "x-forwarded-proto": "https",
      "x-forwarded-for": incoming.socket.remoteAddress ?? "127.0.0.1",
    },
  };
}

const server = createServer({ key: readFileSync(keyPath), cert: readFileSync(certPath) }, (incoming, outgoing) => {
  const upstream = httpRequest(upstreamOptions(incoming), (response) => {
    outgoing.writeHead(response.statusCode ?? 502, response.headers);
    response.pipe(outgoing);
  });
  upstream.on("error", () => {
    if (!outgoing.headersSent) outgoing.writeHead(502, { "content-type": "text/plain" });
    outgoing.end("Local Admin smoke upstream is unavailable.");
  });
  incoming.pipe(upstream);
});

// Next dev uses its WebSocket for Flight debug data as well as refresh events.
server.on("upgrade", (incoming, clientSocket, clientHead) => {
  if (incoming.url?.split("?")[0] !== "/_next/hmr") {
    clientSocket.destroy();
    return;
  }
  clientSocket.on("error", () => clientSocket.destroy());
  const upstream = httpRequest(upstreamOptions(incoming));
  upstream.on("upgrade", (response, nextSocket, nextHead) => {
    const headers = [];
    for (let i = 0; i < response.rawHeaders.length; i += 2) {
      headers.push(`${response.rawHeaders[i]}: ${response.rawHeaders[i + 1]}`);
    }
    clientSocket.write([`HTTP/1.1 ${response.statusCode} ${response.statusMessage}`, ...headers, "", ""].join("\r\n"));
    if (nextHead.length) clientSocket.write(nextHead);
    if (clientHead.length) nextSocket.write(clientHead);
    clientSocket.on("close", () => nextSocket.destroy());
    nextSocket.on("close", () => clientSocket.destroy());
    clientSocket.on("error", () => nextSocket.destroy());
    nextSocket.on("error", () => clientSocket.destroy());
    clientSocket.pipe(nextSocket).pipe(clientSocket);
  });
  clientSocket.on("close", () => upstream.destroy());
  upstream.on("error", () => clientSocket.destroy());
  upstream.on("response", () => clientSocket.end("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n"));
  upstream.end();
});

server.listen(proxyPort, "127.0.0.1", () => console.log(`Local HTTPS Admin proxy ready on 127.0.0.1:${proxyPort}`));
