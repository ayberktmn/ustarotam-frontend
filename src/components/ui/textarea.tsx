import * as React from "react";
import { cn } from "cn";

function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-28 w-full min-w-0 rounded-[10px] border border-line bg-card px-3.5 py-2.5 text-base text-ink shadow-xs transition-colors outline-none placeholder:text-muted-foreground/80 focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
