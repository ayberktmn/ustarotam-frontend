"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MessageSquareText } from "lucide-react";

import {
  Card,
} from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { MessageThread } from "@/features/usta-panel/messages/message-thread";
import { usePanelConversations } from "@/features/usta-panel/queries";
import { panelText } from "@/features/usta-panel/text";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/locale";

function ConversationsSkeleton() {
  return (
    <div className="grid gap-0 lg:grid-cols-[320px_minmax(0,1fr)]" aria-busy="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse border-b border-line bg-muted/60"
        />
      ))}
      <div className="hidden h-96 animate-pulse bg-muted/40 lg:block" />
    </div>
  );
}

function MessagesView() {
  const t = useTranslations("workshopPanel");
  const locale = useLocale() as Locale;
  const conversations = usePanelConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeId = selectedId ?? conversations.data?.[0]?.id ?? null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-ink">{t("messages.title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("messages.description")}
        </p>
      </header>

      {conversations.isPending ? (
        <Card className="overflow-hidden">
          <ConversationsSkeleton />
        </Card>
      ) : conversations.isError ? (
        <ErrorState
          title={t("messages.errorTitle")}
          description={t("messages.errorDescription")}
          retryLabel={t("messages.retry")}
          onRetry={() => void conversations.refetch()}
        />
      ) : conversations.data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center">
          <MessageSquareText
            aria-hidden="true"
            className="mx-auto size-8 text-muted-foreground"
          />
          <p className="mt-3 text-sm font-bold text-ink">
            {t("messages.emptyTitle")}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {t("messages.emptyDescription")}
          </p>
        </div>
      ) : (
        <Card className="min-w-0 overflow-hidden">
          <div className="grid min-w-0 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div
              className={cn(
                "max-h-[32rem] min-w-0 overflow-y-auto border-line lg:block lg:max-h-none lg:border-e",
                selectedId ? "hidden" : "block",
              )}
            >
              <ul>
                {conversations.data.map((conversation) => {
                  const isActive = conversation.id === activeId;

                  return (
                    <li
                      key={conversation.id}
                      className="border-b border-line last:border-b-0"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(conversation.id)}
                        aria-pressed={isActive}
                        className={cn(
                          "min-w-0 w-full px-3 py-4 text-start transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:px-4",
                          isActive
                            ? "bg-brand-soft/60"
                            : "hover:bg-muted",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-bold text-ink">
                            {conversation.customerName}
                          </p>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatDateTime(
                              conversation.lastMessageAt,
                              locale,
                            )}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {panelText(conversation.requestTitle, locale)}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <p className="line-clamp-1 text-xs text-ink/70">
                            {panelText(conversation.lastMessage, locale)}
                          </p>
                          {conversation.unreadCount > 0 ? (
                            <span
                              aria-label={t("messages.unreadCount", {
                                count: conversation.unreadCount,
                              })}
                              className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white"
                            >
                              {conversation.unreadCount}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div
              className={cn(
                "min-w-0",
                selectedId ? "block" : "hidden lg:block",
              )}
            >
              {activeId ? (
                <MessageThread
                  key={activeId}
                  conversationId={activeId}
                  onBack={() => setSelectedId(null)}
                />
              ) : (
                <div className="flex h-full min-h-96 items-center justify-center p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("messages.selectDescription")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export { MessagesView };
