import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { GoogleOAuthCallback } from "@/features/auth/google-oauth-callback";
import type { Locale } from "@/types/locale";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface GoogleOAuthCallbackPageProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ status?: string | string[] }>;
}

export default async function GoogleOAuthCallbackPage({
  params,
  searchParams,
}: GoogleOAuthCallbackPageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  return (
    <div className="page-container section-y">
      <GoogleOAuthCallback status={query.status === "success" ? "success" : "error"} />
    </div>
  );
}
