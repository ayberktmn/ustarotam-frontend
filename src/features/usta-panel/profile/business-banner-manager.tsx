"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useDeletePanelBanner, useUploadPanelBanner } from "@/features/usta-panel/queries";

const MAX_BANNER_BYTES = 2 * 1024 * 1024;
const bannerTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function BusinessBannerManager({ name, bannerUrl }: { name: string; bannerUrl?: string | null }) {
  const t = useTranslations("workshopPanel.profile");
  const input = useRef<HTMLInputElement>(null);
  const uploadBanner = useUploadPanelBanner();
  const deleteBanner = useDeletePanelBanner();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function choose(file?: File) {
    setError(null);
    if (!file) return;
    if (!bannerTypes.has(file.type) || file.size < 1 || file.size > MAX_BANNER_BYTES) { setError(t("bannerInvalid")); return; }
    if (preview) URL.revokeObjectURL(preview);
    const nextPreview = URL.createObjectURL(file);
    setPreview(nextPreview);
    try { await uploadBanner.mutateAsync(file); toast.success(t("bannerSaved")); }
    catch { URL.revokeObjectURL(nextPreview); setPreview(null); toast.error(t("bannerSaveError")); }
  }

  async function remove() {
    try { await deleteBanner.mutateAsync(); if (preview) URL.revokeObjectURL(preview); setPreview(null); if (input.current) input.current.value = ""; toast.success(t("bannerRemoved")); }
    catch { toast.error(t("bannerRemoveError")); }
  }

  const source = preview ?? bannerUrl;
  const busy = uploadBanner.isPending || deleteBanner.isPending;
  return <section className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5" aria-labelledby="business-banner-title">
    <div className="grid gap-4 md:grid-cols-[minmax(0,18rem)_1fr] md:items-center">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-muted">
        {source ? <img src={source} alt={t("bannerPreviewAlt", {name})} className="size-full object-cover" /> : <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground"><ImageIcon aria-hidden="true" className="size-8" /><span className="text-xs font-semibold">{t("bannerEmpty")}</span></div>}
      </div>
      <div className="min-w-0">
        <h2 id="business-banner-title" className="text-base font-bold text-ink">{t("businessBanner")}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("bannerHint")}</p>
        {error ? <p className="mt-2 text-xs font-semibold text-destructive" role="alert">{error}</p> : null}
        <input ref={input} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void choose(event.target.files?.[0])} />
        <div className="mt-4 grid gap-2 min-[380px]:flex min-[380px]:flex-wrap">
          <Button type="button" variant="outline" size="sm" className="w-full min-[380px]:w-auto" disabled={busy} onClick={() => input.current?.click()}>{uploadBanner.isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Upload aria-hidden="true" />}{source ? t("changeBanner") : t("uploadBanner")}</Button>
          {source ? <Button type="button" variant="ghost" size="sm" className="w-full min-[380px]:w-auto" disabled={busy} onClick={() => void remove()}>{deleteBanner.isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Trash2 aria-hidden="true" />}{t("removeBanner")}</Button> : null}
        </div>
      </div>
    </div>
  </section>;
}
