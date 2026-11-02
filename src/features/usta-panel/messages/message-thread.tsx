"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Textarea } from "@/components/ui/textarea";
import {
  useMarkConversationRead,
  usePanelConversation,
  useSendMessage,
} from "@/features/usta-panel/queries";
import { panelText } from "@/features/usta-panel/text";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/locale";

interface MessageThreadProps {
  conversationId: string;
  onBack: () => void;
}

function MessageThread({ conversationId, onBack }: MessageThreadProps) {
  const t = useTranslations("workshopPanel");
  const locale = useLocale() as Locale;
  const conversation = usePanelConversation(conversationId);
  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead();
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const markReadRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      !conversation.data ||
      conversation.data.unreadCount === 0 ||
      markReadRef.current === conversation.data.id
    ) {
      return;
    }

    markReadRef.current = conversation.data.id;
    markRead.mutate(conversation.data.id);
  }, [conversation.data, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [conversation.data?.messages.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = body.trim();

    if (!trimmed) {
      return;
    }

    try {
      await sendMessage.mutateAsync({ conversationId, body: trimmed });
      setBody("");
    } catch {
      toast.error(t("messages.errors.send"));
    }
  }

  if (conversation.isPending) {
    return (
      <div className="space-y-3 p-5" aria-busy="true">
        <div className="h-12 animate-pulse rounded-xl bg-muted" />
        <div className="h-16 w-2/3 animate-pulse rounded-2xl bg-muted" />
        <div className="ms-auto h-16 w-2/3 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (conversation.isError || !conversation.data) {
    return (
      <div className="p-5">
        <ErrorState
          title={t("messages.errorTitle")}
          description={t("messages.errorDescription")}
          retryLabel={t("messages.retry")}
          onRetry={() => void conversation.refetch()}
        />
      </div>
    );
  }

  const data = conversation.data;

  return (
    <div className="flex h-full min-h-[32rem] min-w-0 flex-col">
      <div className="flex min-w-0 items-start gap-3 border-b border-line px-3 py-4 sm:px-5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={onBack}
          aria-label={t("messages.back")}
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">
            {data.customerName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {panelText(data.requestTitle, locale)}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
        {data.messages.map((message) => {
          const isWorkshop = message.sender === "WORKSHOP";

          return (
            <div
              key={message.id}
              className={cn(
                "flex",
                isWorkshop ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "min-w-0 max-w-[90%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed break-words sm:max-w-[80%] sm:px-4",
                  isWorkshop
                    ? "rounded-br-md bg-brand-soft text-ink"
                    : "rounded-bl-md bg-muted text-ink/85",
                )}
              >
                <p>{panelText(message.body, locale)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatDateTime(message.sentAt, locale)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-line p-3 sm:p-4"
        aria-label={t("messages.formLabel")}
      >
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t("messages.placeholder")}
          maxLength={1000}
          className="min-h-20"
          aria-label={t("messages.placeholder")}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {t("messages.characterCount", { count: body.length, max: 1000 })}
          </p>
          <Button
            type="submit"
            size="sm"
            disabled={sendMessage.isPending || body.trim().length === 0}
          >
            {sendMessage.isPending ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Send aria-hidden="true" />
            )}
            {sendMessage.isPending
              ? t("messages.sending")
              : t("messages.send")}
          </Button>
        </div>
      </form>
    </div>
  );
}

export { MessageThread };
