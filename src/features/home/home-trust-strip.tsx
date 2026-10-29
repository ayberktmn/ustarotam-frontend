import { getTranslations } from "next-intl/server";

import { trustItems } from "@/features/home/home-content";

async function HomeTrustStrip() {
  const t = await getTranslations("home");

  return (
    <section className="border-b border-line bg-card">
      <div className="page-container grid grid-cols-2 gap-x-5 gap-y-5 py-5 sm:grid-cols-3 lg:grid-cols-5">
        {trustItems.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.key} className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-ink sm:text-sm">
                  {t(`trust.${item.key}Title`)}
                </p>
                <p className="mt-0.5 text-[0.68rem] leading-relaxed text-muted-foreground sm:text-xs">
                  {t(`trust.${item.key}Description`)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export { HomeTrustStrip };
