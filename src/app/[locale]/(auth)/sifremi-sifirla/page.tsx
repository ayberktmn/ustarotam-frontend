import { setRequestLocale } from "next-intl/server";

import { PasswordResetConfirmForm } from "@/features/auth/password-reset-form";
import type { Locale } from "@/types/locale";

export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : null;
  setRequestLocale(locale);

  return (
    <div className="page-container pb-16">
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-card p-6 shadow-card sm:p-8">
        <PasswordResetConfirmForm initialToken={token} />
      </div>
    </div>
  );
}
