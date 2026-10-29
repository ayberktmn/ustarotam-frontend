import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface AccountEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

function AccountEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: AccountEmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-line bg-card px-6 py-10 text-center",
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className="mx-auto size-8 text-muted-foreground"
      />
      <p className="mt-3 text-sm font-bold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export { AccountEmptyState };
