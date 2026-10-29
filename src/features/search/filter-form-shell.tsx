"use client";

import type { FormEvent, ReactNode } from "react";

interface FilterFormShellProps {
  action: string;
  ariaLabel: string;
  className?: string;
  children: ReactNode;
}

/**
 * Native GET formu, JavaScript varken boş ve varsayılan filtreleri URL'den
 * temizler. JavaScript yoksa form normal şekilde gönderilir.
 */
function FilterFormShell({
  action,
  ariaLabel,
  className,
  children,
}: FilterFormShellProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      if (typeof value !== "string") {
        continue;
      }

      const normalized = value.trim();

      if (!normalized || normalized === "0") {
        continue;
      }

      params.set(key, normalized);
    }

    const query = params.toString();
    window.location.assign(query ? `${action}?${query}` : action);
  }

  return (
    <form
      action={action}
      method="get"
      aria-label={ariaLabel}
      className={className}
      onSubmit={handleSubmit}
    >
      {children}
    </form>
  );
}

export { FilterFormShell };
