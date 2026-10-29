"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Check, ChevronDown, Globe2 } from "lucide-react";
import { Select } from "radix-ui";

import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type Locale } from "@/types/locale";

function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const t = useTranslations("nav");

  function handleChange(nextLocale: string) {
    if (nextLocale === locale) {
      return;
    }

    const query = Object.fromEntries(
      new URLSearchParams(window.location.search).entries(),
    );

    router.replace(
      // @ts-expect-error pathname and params always match the current route
      { pathname, params, query },
      { locale: nextLocale as Locale },
    );
  }

  return (
    <Select.Root value={locale} onValueChange={handleChange}>
      <Select.Trigger aria-label={t("language")} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 text-xs font-bold text-ink transition-colors hover:border-brand/40 hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none data-[state=open]:bg-brand-soft">
        <Globe2 aria-hidden="true" className="size-3.5 text-muted-foreground" />
        <Select.Value />
        <Select.Icon><ChevronDown aria-hidden="true" className="size-3" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content position="popper" align="end" sideOffset={6} className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-line bg-card p-1 shadow-xl">
          <Select.Viewport>
            {locales.map((item) => (
              <Select.Item key={item} value={item} className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-2 text-xs font-bold text-ink outline-none data-[highlighted]:bg-brand-soft data-[highlighted]:text-brand-deep data-[state=checked]:text-brand-deep">
                <Select.ItemText>{item.toUpperCase()}</Select.ItemText>
                <span className="size-3.5"><Select.ItemIndicator><Check aria-hidden="true" className="size-3.5" /></Select.ItemIndicator></span>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export { LanguageSwitcher };
