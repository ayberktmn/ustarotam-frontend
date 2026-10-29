export async function GET() {
  const payload = {
    status: "ok" as const,
    service: "usta-rotam",
    version: process.env.APP_VERSION ?? "0.1.0",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    checks: {
      application: "ok" as const,
    },
  };

  return Response.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
