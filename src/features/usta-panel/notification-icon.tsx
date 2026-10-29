import {
  BellRing,
  CheckCircle2,
  MessageSquareText,
  Star,
  Trophy,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { PanelNotificationType } from "@/types/usta-panel";

const icons: Record<PanelNotificationType, LucideIcon> = {
  NEW_MATCH: BellRing,
  OFFER_ACCEPTED: Trophy,
  OFFER_REJECTED: XCircle,
  NEW_MESSAGE: MessageSquareText,
  REQUEST_COMPLETED: CheckCircle2,
  REVIEW_RECEIVED: Star,
};

const tones: Record<PanelNotificationType, string> = {
  NEW_MATCH: "bg-brand-soft text-brand",
  OFFER_ACCEPTED: "bg-success/10 text-success",
  OFFER_REJECTED: "bg-destructive/10 text-destructive",
  NEW_MESSAGE: "bg-secondary text-ink",
  REQUEST_COMPLETED: "bg-success/10 text-success",
  REVIEW_RECEIVED: "bg-star/15 text-star",
};

interface NotificationIconProps {
  type: PanelNotificationType;
  className?: string;
}

function NotificationIcon({ type, className }: NotificationIconProps) {
  const Icon = icons[type];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full",
        tones[type],
        className,
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}

export { NotificationIcon };
