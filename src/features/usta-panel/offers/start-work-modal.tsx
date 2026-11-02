"use client";

import { useEffect, useId, useRef } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function StartWorkModal({ title, description, cancelLabel, confirmLabel, pendingLabel, error, pending, onCancel, onConfirm }: { title: string; description: string; cancelLabel: string; confirmLabel: string; pendingLabel: string; error: string | null; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { cancelRef.current?.focus(); }, []);
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-3 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onCancel(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="w-full max-w-md rounded-3xl border border-line bg-card p-5 shadow-xl sm:p-6">
      <h2 id={titleId} className="text-h3 text-ink">{title}</h2>
      <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
      {error ? <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p> : null}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button ref={cancelRef} type="button" variant="secondary" disabled={pending} onClick={onCancel}>{cancelLabel}</Button><Button type="button" disabled={pending} onClick={onConfirm}>{pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}{pending ? pendingLabel : confirmLabel}</Button></div>
    </section>
  </div>;
}
