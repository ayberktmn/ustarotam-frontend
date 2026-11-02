import { setRequestLocale } from "next-intl/server";

import { CustomerMessagesView } from "@/features/account/messages/customer-messages-view";
import type { Locale } from "@/types/locale";

export default async function CustomerMessagesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CustomerMessagesView />;
}
