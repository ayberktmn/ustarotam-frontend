"use client";

import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MouseEvent, ReactElement } from "react";

const sections = {
  terms: ["purpose", "accounts", "workshops", "responsibilities", "reviews", "prohibited", "scope", "closure"],
  privacy: ["account", "province", "security", "interactions", "purposes", "retention", "rights", "contact"],
} as const;

export function LegalDialog({ kind }: { kind: keyof typeof sections }): ReactElement {
  const t = useTranslations(`auth.legal.${kind}`);
  function stop(event: MouseEvent<HTMLButtonElement>): void { event.stopPropagation(); }
  return <Dialog.Root>
    <Dialog.Trigger asChild><button type="button" onClick={stop} className="font-semibold text-brand underline underline-offset-2 hover:text-brand-dark focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">{t("link")}</button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/55 data-[state=open]:animate-in data-[state=closed]:animate-out motion-reduce:animate-none" />
      <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[min(85vh,46rem)] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-card focus:outline-none">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line p-5">
          <div><Dialog.Title className="text-h3 text-ink">{t("title")}</Dialog.Title><Dialog.Description className="mt-1 text-sm font-semibold text-destructive">{t("draft")}</Dialog.Description></div>
          <Dialog.Close aria-label={t("close")} className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-brand-soft hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50"><X aria-hidden="true" className="size-5" /></Dialog.Close>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-5 text-sm leading-relaxed text-muted-foreground">
          <p>{t("intro")}</p>
          {sections[kind].map((key) => <section key={key} className="mt-5"><h3 className="font-bold text-ink">{t(`${key}.title`)}</h3><p className="mt-1">{t(`${key}.body`)}</p></section>)}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
