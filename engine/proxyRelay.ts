import http from "node:http";
import net from "node:net";

// Relais local vers le proxy résidentiel : ffmpeg ne donne son identifiant à un proxy
// qu'après un refus en bonne et due forme, que tous les fournisseurs n'envoient pas.
// Le relais, lui, le présente d'emblée. ffmpeg s'y connecte sans identifiant.
export type ProxyRelay = { url: string; close: () => void };

export async function openProxyRelay(upstream: string): Promise<ProxyRelay> {
  const parsed = new URL(upstream);
  if (parsed.protocol !== "http:") throw new Error("Le proxy doit être au format http://");
  const upstreamHost = parsed.hostname;
  const upstreamPort = Number(parsed.port || 80);
  const authorization = parsed.username
    ? `Proxy-Authorization: Basic ${Buffer.from(
        `${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}`,
      ).toString("base64")}\r\n`
    : "";

  const sockets = new Set<net.Socket>();
  const server = http.createServer((_request, response) => {
    response.writeHead(405).end(); // seuls les tunnels (HTTPS) passent par ici
  });

  server.on("connect", (request: http.IncomingMessage, client: net.Socket, head: Buffer) => {
    const target = request.url ?? "";
    const remote = net.connect(upstreamPort, upstreamHost);
    sockets.add(client).add(remote);
    const cleanup = () => {
      client.destroy();
      remote.destroy();
      sockets.delete(client);
      sockets.delete(remote);
    };
    client.on("error", cleanup).on("close", cleanup);
    remote.on("error", cleanup).on("close", cleanup);
    remote.setTimeout(60_000, cleanup);

    remote.once("connect", () => {
      remote.write(`CONNECT ${target} HTTP/1.1\r\nHost: ${target}\r\n${authorization}\r\n`);
    });

    // Réponse du proxy : on attend la fin de ses en-têtes avant d'ouvrir le tunnel.
    let buffer = Buffer.alloc(0);
    const onData = (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      const end = buffer.indexOf("\r\n\r\n");
      if (end === -1) {
        if (buffer.length > 16_384) cleanup();
        return;
      }
      remote.off("data", onData);
      const status = Number(buffer.subarray(0, buffer.indexOf("\r\n")).toString().split(" ")[1]);
      if (status !== 200) {
        client.end(`HTTP/1.1 ${status >= 400 && status < 600 ? status : 502} Proxy Error\r\n\r\n`);
        remote.destroy();
        return;
      }
      remote.setTimeout(0);
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      const rest = buffer.subarray(end + 4);
      if (rest.length) client.write(rest);
      if (head.length) remote.write(head);
      remote.pipe(client);
      client.pipe(remote);
    };
    remote.on("data", onData);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const { port } = server.address() as net.AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    close: () => {
      for (const socket of sockets) socket.destroy();
      server.close();
    },
  };
}
