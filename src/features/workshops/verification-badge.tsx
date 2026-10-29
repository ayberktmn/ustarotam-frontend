import { getTranslations } from "next-intl/server";
import { BadgeCheck, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VerificationStatus } from "@/types/workshop";

interface VerificationBadgeProps {
  status: VerificationStatus;
  className?: string;
}

async function VerificationBadge({
  status,
  className,
}: VerificationBadgeProps) {
  const t = await getTranslations("workshops");
  const isVerified = status === "verified";
  const Icon = isVerified ? BadgeCheck : Clock;

  return (
    <Badge
      variant={isVerified ? "success" : "outline"}
      className={cn(
        "gap-1.5 px-2.5 py-1 backdrop-blur",
        isVerified
          ? "border-success bg-success text-white"
          : "border-amber-500 bg-amber-500 text-white",
        className,
      )}
    >
      <Icon aria-hidden="true" />
      {isVerified ? t("verified") : t("pending")}
    </Badge>
  );
}

export { VerificationBadge };
