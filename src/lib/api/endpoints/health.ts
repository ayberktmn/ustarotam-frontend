import { z } from "zod";

import { browserRequest, serverRequest } from "@/lib/api/client";

const healthSchema = z
  .object({
    success: z.literal(true),
    service: z.string(),
    status: z.literal("ok"),
  })
  .passthrough();

export function getApiHealth() {
  return browserRequest({
    path: "/health",
    schema: healthSchema,
    responseMode: "raw",
    auth: "none",
    cache: "no-store",
    retries: 1,
  });
}

export function getServerApiHealth() {
  return serverRequest({
    path: "/health",
    schema: healthSchema,
    responseMode: "raw",
    cache: "no-store",
    retries: 0,
  });
}
