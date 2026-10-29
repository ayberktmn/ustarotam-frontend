import { isSignedOut } from "@/lib/api/token-store";

export const SESSION_EXPIRED_EVENT = "usta-rotam:session-expired";

export function emitSessionExpired(): void {
  if (typeof window !== "undefined" && !isSignedOut()) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
}
