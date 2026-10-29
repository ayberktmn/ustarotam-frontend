import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  logging: {
    incomingRequests: { ignore: [/\/(?:email-verified|sifre-sifirla|sifremi-sifirla|reset-password)(?:\?|$)/, /[?&]token=/] },
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default withNextIntl(nextConfig);
