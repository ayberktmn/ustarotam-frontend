import { createServer, request as httpRequest } from "node:http";
import { afterEach, expect, it, vi } from "vitest";

import { GET } from "@/app/api/local/[...path]/route";

const upstream = "https://api.example.test/api/v1";
const endpoints = [
  "reviews/mine",
  "work-offers/matching",
  "work-offers/mine",
  "conversations",
  "notifications",
];
const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("routes protected GET requests over HTTP and preserves upstream 401 responses", async () => {
  const upstreamRequests: Array<{
    url: string;
    authorization: string | null;
  }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      upstreamRequests.push({
        url: String(input),
        authorization: new Headers(init?.headers).get("authorization"),
      });
      return Response.json(
        {
          success: false,
          error: {
            code: "AUTHENTICATION_REQUIRED",
            message: "Authentication required",
          },
        },
        { status: 401 },
      );
    }),
  );

  const server = createServer((incoming, outgoing) => {
    void (async () => {
      const requestHost = incoming.headers.host;
      if (!requestHost) {
        outgoing.writeHead(400).end();
        return;
      }

      const url = new URL(incoming.url ?? "/", `http://${requestHost}`);
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) {
        if (typeof value === "string") {
          headers.set(name, value);
        } else if (Array.isArray(value)) {
          for (const item of value) headers.append(name, item);
        }
      }
      const request = new Request(url, {
        method: incoming.method,
        headers,
      });
      const path = url.pathname.split("/").filter(Boolean).slice(2);
      const response = await GET(request, {
        params: Promise.resolve({ path }),
      });

      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    })().catch(() => outgoing.writeHead(500).end());
  });
  servers.push(server);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("HTTP regression server did not bind to a TCP port.");
  }

  const origin = `http://localhost:${address.port}`;
  vi.stubEnv("SITE_URL", origin);
  vi.stubEnv("API_INTERNAL_BASE_URL", upstream);
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", upstream);

  for (const endpoint of endpoints) {
    const response = await new Promise<{
      status: number;
      body: string;
    }>((resolve, reject) => {
      const request = httpRequest(
        {
          host: "127.0.0.1",
          port: address.port,
          path: `/api/local/${endpoint}`,
          method: "GET",
          headers: {
            host: `localhost:${address.port}`,
            authorization: "Bearer regression-test-token",
          },
        },
        (incoming) => {
          let body = "";
          incoming.setEncoding("utf8");
          incoming.on("data", (chunk: string) => {
            body += chunk;
          });
          incoming.on("end", () =>
            resolve({ status: incoming.statusCode ?? 0, body }),
          );
        },
      );
      request.on("error", reject);
      request.end();
    });

    expect(response.status).toBe(401);
    expect(JSON.parse(response.body)).toMatchObject({
      error: { code: "AUTHENTICATION_REQUIRED" },
    });
  }

  expect(upstreamRequests).toEqual(
    endpoints.map((endpoint) => ({
      url: `${upstream}/${endpoint}`,
      authorization: "Bearer regression-test-token",
    })),
  );
});
