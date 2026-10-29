import type { AuthUser } from "@/types/auth";

const WORKSHOP_PANEL_ROLES = ["WORKSHOP_OWNER", "ADMIN"] as const;

/**
 * Usta paneline erişim yalnızca arayüz kolaylığıdır. Gerçek yetkilendirme
 * backend tarafındaki endpoint'lerde uygulanır. Mock aşamasında paneli
 * önizleyebilmek için `NEXT_PUBLIC_WORKSHOP_PANEL_PREVIEW=true` kullanılır.
 */
export function canAccessWorkshopPanel(
  user: Pick<AuthUser, "roles"> | null,
  preview = process.env.NEXT_PUBLIC_WORKSHOP_PANEL_PREVIEW === "true",
): boolean {
  if (!user) {
    return false;
  }

  if (preview) {
    return true;
  }

  return WORKSHOP_PANEL_ROLES.some((role) => user.roles.includes(role));
}
