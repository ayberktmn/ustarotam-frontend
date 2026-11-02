"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Textarea } from "@/components/ui/textarea";
import { useCustomerConversation, useMarkCustomerConversationRead, useSendCustomerMessage } from "@/features/account/messages/queries";
import { panelText } from "@/features/usta-panel/text";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/locale";

export function CustomerMessageThread({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const t = useTranslations("account.messages");
  const locale = useLocale() as Locale;
  const conversation = useCustomerConversation(conversationId);
  const send = useSendCustomerMessage();
  const markRead = useMarkCustomerConversationRead();
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const markedRef = useRef<string | null>(null);

  useEffect(() => {
    if (conversation.data?.unreadCount && markedRef.current !== conversation.data.id) {
      markedRef.current = conversation.data.id;
      markRead.mutate(conversation.data.id);
    }
  }, [conversation.data, markRead]);
  useEffect(() => bottomRef.current?.scrollIntoView({ block: "end" }), [conversation.data?.messages.length]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = body.trim();
    if (!value || send.isPending) return;
    try { await send.mutateAsync({ conversationId, body: value }); setBody(""); }
    catch { toast.error(t("sendError")); }
  }

  if (conversation.isPending) return <div className="h-96 animate-pulse bg-muted/50" aria-busy="true" />;
  if (conversation.isError || !conversation.data) return <div className="p-4"><ErrorState title={t("errorTitle")} description={t("errorDescription")} retryLabel={t("retry")} onRetry={() => void conversation.refetch()} /></div>;
  const data = conversation.data;
  return <div className="flex min-h-[32rem] min-w-0 flex-col">
    <header className="flex min-w-0 items-start gap-3 border-b border-line px-3 py-4 sm:px-5">
      <Button type="button" variant="ghost" size="icon-sm" className="lg:hidden" onClick={onBack} aria-label={t("back")}><ArrowLeft aria-hidden="true" /></Button>
      <div className="min-w-0"><p className="truncate text-sm font-bold text-ink">{data.customerName}</p><p className="truncate text-xs text-muted-foreground">{panelText(data.requestTitle, locale)}</p></div>
    </header>
    <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-5">
      {data.messages.map((message) => { const mine = message.sender === "CUSTOMER"; return <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}><div className={cn("min-w-0 max-w-[90%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed break-words sm:max-w-[80%] sm:px-4", mine ? "rounded-br-md bg-brand-soft text-ink" : "rounded-bl-md bg-muted text-ink/85")}><p>{panelText(message.body, locale)}</p><p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(message.sentAt, locale)}</p></div></div>; })}
      <div ref={bottomRef} />
    </div>
    <form onSubmit={submit} className="border-t border-line p-3 sm:p-4">
      <Textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} placeholder={t("placeholder")} aria-label={t("placeholder")} className="min-h-20" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{t("characterCount", { count: body.length, max: 1000 })}</p><Button type="submit" size="sm" disabled={send.isPending || !body.trim()}>{send.isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Send aria-hidden="true" />}{send.isPending ? t("sending") : t("send")}</Button></div>
    </form>
  </div>;
}
