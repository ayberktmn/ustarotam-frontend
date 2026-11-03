"use client";

import { Dialog, Switch } from "radix-ui";
import { Cookie, ShieldCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  COOKIE_CONSENT_KEY,
  OPEN_COOKIE_PREFERENCES_EVENT,
  createCookieConsent,
  parseCookieConsent,
} from "@/lib/cookie-consent";

export function CookieConsent() {
  const t = useTranslations("cookieConsent");
  const ready = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [, setRevision] = useState(0);
  const preferencesTrigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const openPreferences = () => {
      preferencesTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const current = parseCookieConsent(window.localStorage.getItem(COOKIE_CONSENT_KEY));
      setAnalytics(current?.analytics ?? false);
      setMarketing(current?.marketing ?? false);
      setPreferencesOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, openPreferences);
    return () => window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, openPreferences);
  }, []);

  function save(nextAnalytics: boolean, nextMarketing: boolean) {
    window.localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify(createCookieConsent(nextAnalytics, nextMarketing)),
    );
    setAnalytics(nextAnalytics);
    setMarketing(nextMarketing);
    setRevision(value => value + 1);
    setPreferencesOpen(false);
  }

  if (!ready) return null;
  const bannerOpen = parseCookieConsent(window.localStorage.getItem(COOKIE_CONSENT_KEY)) === null;

  return <>
    {bannerOpen && (
      <section
        aria-label={t("bannerLabel")}
        className="fixed inset-x-2 bottom-2 z-40 mx-auto max-w-5xl rounded-2xl border border-brand/20 bg-card p-4 shadow-[0_18px_60px_rgba(20,29,43,0.24)] sm:inset-x-4 sm:bottom-4 sm:p-5"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand" aria-hidden="true"><Cookie className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-ink">{t("title")}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("summary")}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Button className="w-full sm:w-auto" variant="ghost" onClick={event => { preferencesTrigger.current = event.currentTarget; setPreferencesOpen(true); }}>{t("manage")}</Button>
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => save(false, false)}>{t("necessaryOnly")}</Button>
          <Button className="w-full sm:w-auto" onClick={() => save(true, true)}>{t("acceptAll")}</Button>
        </div>
      </section>
    )}

    <Dialog.Root open={preferencesOpen} onOpenChange={setPreferencesOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/55 data-[state=open]:animate-in data-[state=closed]:animate-out motion-reduce:animate-none" />
        <Dialog.Content onCloseAutoFocus={event => { event.preventDefault(); preferencesTrigger.current?.focus(); }} className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-card focus:outline-none sm:max-h-[min(88dvh,46rem)] sm:w-[calc(100vw-2rem)]">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line p-4 sm:p-5">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-bold text-ink">{t("preferencesTitle")}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("preferencesDescription")}</Dialog.Description>
            </div>
            <Dialog.Close aria-label={t("close")} className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-brand-soft hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"><X aria-hidden="true" className="size-5" /></Dialog.Close>
          </div>
          <div className="min-h-0 space-y-3 overflow-y-auto overscroll-contain p-4 sm:p-5">
            <Category title={t("necessary.title")} description={t("necessary.description")} status={t("alwaysActive")} checked disabled />
            <Category title={t("analytics.title")} description={t("analytics.description")} status={t("notInUse")} checked={analytics} onCheckedChange={setAnalytics} label={t("analytics.label")} />
            <Category title={t("marketing.title")} description={t("marketing.description")} status={t("notInUse")} checked={marketing} onCheckedChange={setMarketing} label={t("marketing.label")} />
            <p className="rounded-xl bg-brand-soft px-3 py-2.5 text-xs leading-relaxed text-brand-deep">{t("noOptionalScripts")}</p>
          </div>
          <div className="grid shrink-0 gap-2 border-t border-line p-4 sm:flex sm:justify-end sm:p-5">
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => save(false, false)}>{t("necessaryOnly")}</Button>
            <Button className="w-full sm:w-auto" onClick={() => save(analytics, marketing)}>{t("save")}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>;
}

function emptySubscribe() { return () => undefined; }

function Category({ title, description, status, checked, disabled = false, onCheckedChange, label }: { title: string; description: string; status: string; checked: boolean; disabled?: boolean; onCheckedChange?: (checked: boolean) => void; label?: string }) {
  return <div className="flex items-start gap-3 rounded-xl border border-line p-3.5">
    <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand" />
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-ink">{title}</h3><span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{status}</span></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p></div>
    <Switch.Root aria-label={label ?? title} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-muted-foreground/25 outline-none transition-colors data-[state=checked]:bg-brand focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-70"><Switch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[22px]" /></Switch.Root>
  </div>;
}
