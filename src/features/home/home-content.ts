import { Car, MapPin, Settings2, ShieldCheck, Star } from "lucide-react";

import type { SpecialtySummary } from "@/types/workshop";

export const popularSearches = [
  { key: "motor", specialty: "motor-mekanigi" },
  { key: "brakes", specialty: "fren-yuruyen" },
  { key: "maintenance", specialty: "periyodik-bakim" },
  { key: "electrical", specialty: "oto-elektrik" },
  { key: "body", specialty: "kaporta-boya" },
  { key: "tires", specialty: "lastik" },
] as const;

export const trustItems = [
  { key: "verified", icon: ShieldCheck },
  { key: "reviews", icon: Star },
  { key: "nearby", icon: MapPin },
  { key: "brands", icon: Car },
  { key: "expertise", icon: Settings2 },
] as const;

export const processSteps = [
  { key: "step1", number: "01" },
  { key: "step2", number: "02" },
  { key: "step3", number: "03" },
] as const;

const homeCategoryOrder = [
  "motor-mekanigi",
  "fren-yuruyen",
  "periyodik-bakim",
  "oto-elektrik",
  "kaporta-boya",
  "lastik",
  "klima",
  "suspansiyon",
] as const;

export function pickHomeCategories(
  specialtyCards: readonly SpecialtySummary[],
): SpecialtySummary[] {
  return homeCategoryOrder.flatMap((slug) => {
    const specialty = specialtyCards.find((item) => item.slug === slug);
    return specialty ? [specialty] : [];
  });
}
