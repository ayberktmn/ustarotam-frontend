import { setRequestLocale } from "next-intl/server";
import { EmailVerification } from "@/features/auth/email-verification";
import type { Locale } from "@/types/locale";

export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function EmailVerifiedPage({ params, searchParams }: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : null;

  return (
    <div className="page-container pb-16"><EmailVerification token={token} /></div>
  );
}
