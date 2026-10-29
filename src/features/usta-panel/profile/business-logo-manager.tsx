"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { WorkshopIdentity } from "@/components/workshops/workshop-identity";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const logoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function BusinessLogoManager({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  const t = useTranslations("workshopPanel.profile");
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function choose(file?: File): void {
    setError(null);
    if (!file) return;
    if (!logoTypes.has(file.type) || file.size > MAX_LOGO_BYTES) { setError(t("logoInvalid")); return; }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  }

  return <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5 shadow-card sm:flex-row sm:items-center">
    {preview ? <img src={preview} alt="" className="size-16 rounded-full border border-line object-cover" /> : <WorkshopIdentity name={name} logoUrl={logoUrl} className="size-16 text-xl" />}
    <div className="min-w-0 flex-1"><h2 className="text-base font-bold text-ink">{t("businessLogo")}</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("logoBackendPending")}</p>{error ? <p className="mt-2 text-xs font-semibold text-destructive">{error}</p> : null}{preview ? <p className="mt-2 text-xs font-semibold text-brand-deep">{t("logoPreviewOnly")}</p> : null}</div>
    <input ref={input} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choose(event.target.files?.[0])} />
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}><Upload aria-hidden="true" />{preview || logoUrl ? t("changeLogo") : t("uploadLogo")}</Button>{preview ? <Button type="button" variant="ghost" size="sm" onClick={() => { URL.revokeObjectURL(preview); setPreview(null); }}><Trash2 aria-hidden="true" />{t("removeLogo")}</Button> : null}</div>
  </div>;
}

export { BusinessLogoManager };
