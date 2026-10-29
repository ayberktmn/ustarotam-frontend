import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { popularSearches } from "@/features/home/home-content";
import { HomeSearchForm } from "@/features/search/home-search-form";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";

const avatarImages = [
  "/images/avatars/avatar-1.webp",
  "/images/avatars/avatar-2.webp",
  "/images/avatars/avatar-3.webp",
  "/images/avatars/avatar-4.webp",
] as const;

async function HomeHero() {
  const t = await getTranslations("home");

  return (
    <section className="relative isolate mx-3 mt-3 overflow-hidden rounded-[16px] bg-ink shadow-sm sm:mx-6 sm:mt-4 sm:rounded-[24px] lg:mt-5">
      <Image
        src="/images/hero-workshop.webp"
        alt={t("hero.imageAlt")}
        fill
        priority
        sizes="(min-width: 640px) calc(100vw - 48px), calc(100vw - 24px)"
        className="object-cover object-center"
      />
      <div aria-hidden="true" className="hero-overlay absolute inset-0" />

      <div className="page-container relative py-10 sm:py-12 lg:py-14">
        <div className="max-w-4xl">
          <Badge
            variant="outline"
            className="gap-2 border-white/20 bg-card/10 py-1 pr-3 pl-1.5 text-white backdrop-blur"
          >
            <AvatarGroup images={avatarImages} />
            {t("hero.badge")}
          </Badge>

          <h1 className="mt-4 text-display text-white">
            <span className="block">{t("hero.titleLine1")}</span>
            <span className="block">
              <span className="text-brand">{t("hero.titleHighlight")}</span>{" "}
              {t("hero.titleLine2")}
            </span>
          </h1>

          <p className="mt-3 max-w-2xl text-base text-white/75 sm:text-body-lg">
            {t("hero.description")}
          </p>
        </div>

        <div className="mt-6">
          <HomeSearchForm />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-white/80 sm:text-sm">
            {t("popular.title")}
          </span>
          {popularSearches.map((item) => (
            <Link
              key={item.specialty}
              href={{
                pathname: "/usta-ara",
                query: { uzmanlik: item.specialty },
              }}
              className="rounded-full border border-white/20 bg-card/10 px-3 py-1 text-[0.7rem] font-semibold text-white transition-colors hover:border-brand hover:bg-brand focus-visible:ring-3 focus-visible:ring-white/40 focus-visible:outline-none sm:py-1.5 sm:text-xs"
            >
              {t(`popular.${item.key}`)}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export { HomeHero };
