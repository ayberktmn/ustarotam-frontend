import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { routing } from "@/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);
  const rewrite = response.headers.get("x-middleware-rewrite");

  // `next start` resolves internal rewrites against its loopback bind address,
  // while next-intl builds them from the Host header. Behind nginx these can
  // differ (127.0.0.1 vs localhost), which makes Next treat the rewrite as an
  // external HTTPS request to its HTTP-only port. Keep the public protocol and
  // port, but use the equivalent loopback spelling so Next resolves it in-app.
  // Public redirects are intentionally left untouched.
  if (rewrite && request.headers.get("x-forwarded-proto") === "https") {
    const internalUrl = new URL(rewrite);
    internalUrl.hostname = "127.0.0.1";
    response.headers.set("x-middleware-rewrite", internalUrl.toString());
  }

  return response;
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
