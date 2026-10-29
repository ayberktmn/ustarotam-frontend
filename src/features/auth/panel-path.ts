import type { AuthUser } from "@/types/auth";

export function authPanelPath(user: Pick<AuthUser, "roles">): "/usta-panel" | "/hesabim" {
  return user.roles.includes("WORKSHOP_OWNER") ? "/usta-panel" : "/hesabim";
}
