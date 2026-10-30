"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { WorkshopIdentity, announceWorkshopLogoUpdate } from "@/components/workshops/workshop-identity";
import { useDeletePanelLogo, useUploadPanelLogo } from "@/features/usta-panel/queries";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const logoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function BusinessLogoManager({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  const t = useTranslations("workshopPanel.profile");
  const input = useRef<HTMLInputElement>(null);
  const uploadLogo = useUploadPanelLogo();
  const deleteLogo = useDeletePanelLogo();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function choose(file?: File): Promise<void> {
    setError(null);
    if (!file) return;
    if (!logoTypes.has(file.type) || file.size > MAX_LOGO_BYTES) { setError(t("logoInvalid")); return; }
    if (preview) URL.revokeObjectURL(preview);
    const nextPreview = URL.createObjectURL(file);
    setPreview(nextPreview);
    try { await uploadLogo.mutateAsync(file); announceWorkshopLogoUpdate(); toast.success(t("logoSaved")); }
    catch { URL.revokeObjectURL(nextPreview); setPreview(null); toast.error(t("logoSaveError")); }
  }

  async function remove(): Promise<void> {
    try { await deleteLogo.mutateAsync(); announceWorkshopLogoUpdate(); if (preview) URL.revokeObjectURL(preview); setPreview(null); if (input.current) input.current.value = ""; toast.success(t("logoRemoved")); }
    catch { toast.error(t("logoRemoveError")); }
  }

  return <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5 shadow-card sm:flex-row sm:items-center">
    {preview ? <img src={preview} alt="" className="size-16 rounded-full border border-line object-cover" /> : <WorkshopIdentity name={name} logoUrl={logoUrl} className="size-16 text-xl" />}
    <div className="min-w-0 flex-1"><h2 className="text-base font-bold text-ink">{t("businessLogo")}</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("logoHint")}</p>{error ? <p className="mt-2 text-xs font-semibold text-destructive">{error}</p> : null}</div>
    <input ref={input} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void choose(event.target.files?.[0])} />
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={uploadLogo.isPending || deleteLogo.isPending} onClick={() => input.current?.click()}>{uploadLogo.isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Upload aria-hidden="true" />}{preview || logoUrl ? t("changeLogo") : t("uploadLogo")}</Button>{preview || logoUrl ? <Button type="button" variant="ghost" size="sm" disabled={uploadLogo.isPending || deleteLogo.isPending} onClick={() => void remove()}>{deleteLogo.isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Trash2 aria-hidden="true" />}{t("removeLogo")}</Button> : null}</div>
  </div>;
}

export { BusinessLogoManager };
