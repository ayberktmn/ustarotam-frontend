"use client";

import { useEffect, useId, useRef } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface OfferRejectModalProps {
  title: string;
  description: string;
  amountLabel: string;
  amount: string;
  confirmLabel: string;
  cancelLabel: string;
  pendingLabel: string;
  error: string | null;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function OfferRejectModal({
  title,
  description,
  amountLabel,
  amount,
  confirmLabel,
  cancelLabel,
  pendingLabel,
  error,
  isPending,
  onConfirm,
  onClose,
}: OfferRejectModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPending, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md rounded-3xl bg-card p-5 shadow-xl sm:p-6"
      >
        <h2 id={titleId} className="text-h3 text-ink">{title}</h2>
        <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
        <dl className="mt-5 rounded-2xl border border-line bg-cream p-4">
          <dt className="text-xs font-semibold text-muted-foreground">{amountLabel}</dt>
          <dd className="mt-1 font-extrabold text-ink">{amount}</dd>
        </dl>
        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} type="button" variant="secondary" disabled={isPending} onClick={onClose}>{cancelLabel}</Button>
          <Button type="button" variant="destructive" disabled={isPending} onClick={onConfirm}>
            {isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

export { OfferRejectModal };
