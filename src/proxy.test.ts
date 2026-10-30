import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import proxy from "./proxy";

const forwardedHeaders = {
  host: "localhost:3001",
  "x-forwarded-proto": "https",
};

describe("locale proxy behind TLS termination", () => {
  it("rewrites the default-locale root to the loopback bind origin", () => {
    const response = proxy(
      new NextRequest("https://localhost:3001/", { headers: forwardedHeaders }),
    );

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://127.0.0.1:3001/tr",
    );
  });

  it("keeps the canonical default-locale redirect public and HTTPS", () => {
    const response = proxy(
      new NextRequest("https://localhost:3001/tr", { headers: forwardedHeaders }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://localhost:3001/");
  });

  it("keeps English localized pathnames on internal rewrites", () => {
    const response = proxy(
      new NextRequest("https://localhost:3001/en/login", {
        headers: forwardedHeaders,
      }),
    );

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://127.0.0.1:3001/en/giris",
    );
  });
});
