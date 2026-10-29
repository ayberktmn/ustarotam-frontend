import { setRequestLocale } from "next-intl/server";
import { PasswordResetRequestForm } from "@/features/auth/password-reset-form";
import type { Locale } from "@/types/locale";

export const metadata = { robots: { index: false, follow: false } };
export default async function ForgotPasswordPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params; setRequestLocale(locale);
  return <div className="page-container pb-16"><div className="mx-auto max-w-md rounded-2xl border border-line bg-card p-6 shadow-card sm:p-8"><PasswordResetRequestForm /></div></div>;
}
