"use client";

import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

interface WorkshopIdentityProps {
  name: string;
  logoUrl?: string | null;
  className?: string;
}

const LOGO_UPDATED_EVENT = "usta-rotam:workshop-logo-updated";
const workshopLogoPath = /^\/api\/v1\/workshops\/([0-9a-f-]{36})\/logo$/i;

function logoRequestUrl(logoUrl: string): string {
  try {
    const url = new URL(logoUrl, window.location.origin);
    const match = url.pathname.match(workshopLogoPath);
    return match ? `/api/local/workshops/${match[1]}/logo` : logoUrl;
  } catch {
    return logoUrl;
  }
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Invalid logo response")));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Logo could not be read")));
    reader.readAsDataURL(blob);
  });
}

function announceWorkshopLogoUpdate(): void {
  window.dispatchEvent(new Event(LOGO_UPDATED_EVENT));
}

function WorkshopIdentity({ name, logoUrl, className }: WorkshopIdentityProps) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ logoUrl: string; status: "missing" | "error" | "ready"; source?: string } | null>(null);
  const initial = name.trim().charAt(0).toLocaleUpperCase("tr-TR") || "U";

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener(LOGO_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(LOGO_UPDATED_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (!logoUrl) return;
    const controller = new AbortController();
    void fetch(logoRequestUrl(logoUrl), { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 404) { setState({ logoUrl, status: "missing" }); return; }
        if (!response.ok) { setState({ logoUrl, status: "error" }); return; }
        const contentType = response.headers.get("content-type")?.split(";", 1)[0];
        if (!contentType?.startsWith("image/")) { setState({ logoUrl, status: "error" }); return; }
        setState({ logoUrl, status: "ready", source: await readAsDataUrl(await response.blob()) });
      })
      .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setState({ logoUrl, status: "error" }); });
    return () => controller.abort();
  }, [logoUrl, revision]);

  const current = state?.logoUrl === logoUrl ? state : null;
  if (current?.status === "ready" && current.source) return <img src={current.source} alt="" className={cn("size-12 rounded-full border border-line bg-card object-cover", className)} />;
  if (current?.status === "error") return <span role="img" aria-label={name} className={cn("flex size-12 items-center justify-center rounded-full border border-destructive/40 bg-card text-destructive", className)}><ImageOff aria-hidden="true" className="size-1/2" /></span>;
  if (logoUrl && !current) return <span aria-hidden="true" className={cn("size-12 animate-pulse rounded-full border border-line bg-muted", className)} />;

  return <span aria-hidden="true" className={cn("flex size-12 items-center justify-center rounded-full bg-brand-soft text-base font-extrabold text-brand", className)}>{initial}</span>;
}

export { WorkshopIdentity, announceWorkshopLogoUpdate, logoRequestUrl };
