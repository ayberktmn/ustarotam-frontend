"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title: string;
  description?: string;
  retryLabel: string;
  onRetry?: () => void;
  className?: string;
}

function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border border-line bg-card px-6 py-10 text-center shadow-card",
        className,
      )}
    >
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert aria-hidden="true" className="size-5" />
      </span>
      <h2 className="mt-4 text-lg font-bold text-ink">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {onRetry ? (
        <Button type="button" onClick={onRetry} className="mt-5">
          <RefreshCw aria-hidden="true" />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export { ErrorState };
