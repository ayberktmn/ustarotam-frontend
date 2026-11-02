"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MessageSquareText } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { CustomerMessageThread } from "@/features/account/messages/customer-message-thread";
import { useCustomerConversations } from "@/features/account/messages/queries";
import { panelText } from "@/features/usta-panel/text";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/locale";

export function CustomerMessagesView() {
  const t = useTranslations("account.messages");
  const locale = useLocale() as Locale;
  const search = useSearchParams();
  const conversations = useCustomerConversations();
  const [selected, setSelected] = useState<string | null>(search.get("conversation"));
  const activeId = selected ?? conversations.data?.[0]?.id ?? null;

  return <div className="min-w-0 space-y-6">
    <header><h1 className="text-h1 text-ink">{t("title")}</h1><p className="mt-3 max-w-2xl text-sm text-muted-foreground">{t("description")}</p></header>
    {conversations.isPending ? <Card className="h-[32rem] animate-pulse bg-muted/40" aria-busy="true" />
      : conversations.isError ? <ErrorState title={t("errorTitle")} description={t("errorDescription")} retryLabel={t("retry")} onRetry={() => void conversations.refetch()} />
      : conversations.data.length === 0 ? <div className="rounded-2xl border border-dashed border-line bg-card px-4 py-12 text-center"><MessageSquareText aria-hidden="true" className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm font-bold text-ink">{t("emptyTitle")}</p><p className="mt-1 text-sm text-muted-foreground">{t("emptyDescription")}</p></div>
      : <Card className="min-w-0 overflow-hidden"><div className="grid min-w-0 lg:grid-cols-[300px_minmax(0,1fr)]"><div className={cn("max-h-[32rem] min-w-0 overflow-y-auto border-line lg:block lg:max-h-none lg:border-e", selected ? "hidden" : "block")}><ul>{conversations.data.map((item) => <li key={item.id} className="border-b border-line last:border-0"><button type="button" className={cn("w-full min-w-0 px-3 py-4 text-start hover:bg-muted sm:px-4", item.id === activeId && "bg-brand-soft/60")} onClick={() => setSelected(item.id)}><div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-bold text-ink">{item.customerName}</p><span className="shrink-0 text-[11px] text-muted-foreground">{formatDateTime(item.lastMessageAt, locale)}</span></div><p className="mt-1 truncate text-xs text-muted-foreground">{panelText(item.requestTitle, locale)}</p><div className="mt-1 flex items-center justify-between gap-2"><p className="line-clamp-1 text-xs text-ink/70">{panelText(item.lastMessage, locale)}</p>{item.unreadCount ? <span className="inline-flex min-w-5 shrink-0 justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white" aria-label={t("unreadCount", { count: item.unreadCount })}>{item.unreadCount}</span> : null}</div></button></li>)}</ul></div><div className={cn("min-w-0", selected ? "block" : "hidden lg:block")}>{activeId ? <CustomerMessageThread key={activeId} conversationId={activeId} onBack={() => setSelected(null)} /> : null}</div></div></Card>}
  </div>;
}
