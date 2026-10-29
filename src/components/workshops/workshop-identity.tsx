"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

interface WorkshopIdentityProps {
  name: string;
  logoUrl?: string | null;
  className?: string;
}

function WorkshopIdentity({ name, logoUrl, className }: WorkshopIdentityProps) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0).toLocaleUpperCase("tr-TR") || "U";

  if (logoUrl && !failed) {
    return <img src={logoUrl} alt="" onError={() => setFailed(true)} className={cn("size-12 rounded-full border border-line bg-card object-cover", className)} />;
  }

  return <span aria-hidden="true" className={cn("flex size-12 items-center justify-center rounded-full bg-brand-soft text-base font-extrabold text-brand", className)}>{initial}</span>;
}

export { WorkshopIdentity };
