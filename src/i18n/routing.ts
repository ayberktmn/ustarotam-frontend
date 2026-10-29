import { defineRouting } from "next-intl/routing";

import { locales } from "@/types/locale";

export const routing = defineRouting({
  locales,
  defaultLocale: "tr",
  localePrefix: "as-needed",
  pathnames: {
    "/": "/",
    "/usta-ol": { tr: "/usta-ol", en: "/join-as-workshop" },
    "/usta-ara": {
      tr: "/usta-ara",
      en: "/find-workshops",
    },
    "/usta/[slug]": {
      tr: "/usta/[slug]",
      en: "/workshop/[slug]",
    },
    "/giris": {
      tr: "/giris",
      en: "/login",
    },
    "/kayit": {
      tr: "/kayit",
      en: "/register",
    },
    "/sifremi-unuttum": { tr: "/sifremi-unuttum", en: "/forgot-password" },
    "/sifremi-sifirla": { tr: "/sifremi-sifirla", en: "/reset-password" },
    "/hesabim": {
      tr: "/hesabim",
      en: "/account",
    },
    "/hesabim/profil": {
      tr: "/hesabim/profil",
      en: "/account/profile",
    },
    "/hesabim/favoriler": {
      tr: "/hesabim/favoriler",
      en: "/account/favorites",
    },
    "/hesabim/yorumlar": {
      tr: "/hesabim/yorumlar",
      en: "/account/reviews",
    },
    "/hesabim/talepler": {
      tr: "/hesabim/talepler",
      en: "/account/requests",
    },
    "/hesabim/talepler/yeni": {
      tr: "/hesabim/talepler/yeni",
      en: "/account/requests/new",
    },
    "/hesabim/talepler/[id]": {
      tr: "/hesabim/talepler/[id]",
      en: "/account/requests/[id]",
    },
    "/usta-panel": {
      tr: "/usta-panel",
      en: "/workshop-panel",
    },
    "/usta-panel/isler": {
      tr: "/usta-panel/isler",
      en: "/workshop-panel/jobs",
    },
    "/usta-panel/teklifler": {
      tr: "/usta-panel/teklifler",
      en: "/workshop-panel/offers",
    },
    "/usta-panel/mesajlar": {
      tr: "/usta-panel/mesajlar",
      en: "/workshop-panel/messages",
    },
    "/usta-panel/bildirimler": {
      tr: "/usta-panel/bildirimler",
      en: "/workshop-panel/notifications",
    },
    "/usta-panel/yorumlar": {
      tr: "/usta-panel/yorumlar",
      en: "/workshop-panel/reviews",
    },
    "/usta-panel/profil": {
      tr: "/usta-panel/profil",
      en: "/workshop-panel/profile",
    },
    "/hizmetler": {
      tr: "/hizmetler",
      en: "/services",
    },
    "/nasil-calisir": {
      tr: "/nasil-calisir",
      en: "/how-it-works",
    },
    "/hakkimizda": {
      tr: "/hakkimizda",
      en: "/about",
    },
  },
});
