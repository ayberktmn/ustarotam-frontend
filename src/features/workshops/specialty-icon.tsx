import {
  Cog,
  CircleDot,
  Disc3,
  MoveVertical,
  Paintbrush,
  Settings2,
  Snowflake,
  Thermometer,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { SpecialtySlug } from "@/types/workshop";

const specialtyIcons: Record<SpecialtySlug, LucideIcon> = {
  "motor-mekanigi": Cog,
  "oto-elektrik": Zap,
  "radyator-sogutma": Thermometer,
  sanziman: Settings2,
  klima: Snowflake,
  "fren-yuruyen": Disc3,
  "kaporta-boya": Paintbrush,
  "periyodik-bakim": Wrench,
  lastik: CircleDot,
  suspansiyon: MoveVertical,
};

interface SpecialtyIconProps {
  slug: SpecialtySlug;
  className?: string;
}

function SpecialtyIcon({ slug, className }: SpecialtyIconProps) {
  const Icon = specialtyIcons[slug] ?? Wrench;

  return <Icon aria-hidden="true" className={cn("size-5", className)} />;
}

export { SpecialtyIcon };
