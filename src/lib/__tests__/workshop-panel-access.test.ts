import { describe, expect, it } from "vitest";

import { canAccessWorkshopPanel } from "@/lib/workshop-panel-access";

describe("canAccessWorkshopPanel", () => {
  it("requires an authenticated user", () => {
    expect(canAccessWorkshopPanel(null, false)).toBe(false);
  });

  it("allows workshop owners and admins", () => {
    expect(
      canAccessWorkshopPanel({ roles: ["WORKSHOP_OWNER"] }, false),
    ).toBe(true);
    expect(canAccessWorkshopPanel({ roles: ["ADMIN"] }, false)).toBe(true);
  });

  it("denies regular users", () => {
    expect(canAccessWorkshopPanel({ roles: ["USER"] }, false)).toBe(false);
  });

  it("allows every signed-in user in preview mode", () => {
    expect(canAccessWorkshopPanel({ roles: ["USER"] }, true)).toBe(true);
    expect(canAccessWorkshopPanel(null, true)).toBe(false);
  });
});
