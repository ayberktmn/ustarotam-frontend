import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const queryState = vi.hoisted(() => ({
  requests: { isPending: false, isError: false, data: [], refetch: vi.fn() },
  offers: { isPending: false, isError: false, data: [], refetch: vi.fn() },
  conversations: { isError: true, data: undefined, refetch: vi.fn() },
  notifications: { isError: true, data: undefined, refetch: vi.fn() },
  reviews: { isError: true, data: undefined, refetch: vi.fn() },
}));

vi.mock("next-intl", () => ({
  useLocale: () => "tr",
  useTranslations: () => (key: string) => key,
}));
vi.mock("@/features/auth/auth-provider", () => ({ useAuth: () => ({ user: { firstName: "Ali" } }) }));
vi.mock("@/features/usta-panel/queries", () => ({
  usePanelRequests: () => queryState.requests,
  usePanelOffers: () => queryState.offers,
  usePanelConversations: () => queryState.conversations,
  usePanelNotifications: () => queryState.notifications,
  usePanelReviews: () => queryState.reviews,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => React.createElement("a", { href, ...props }, children),
}));

import { PanelOverview } from "@/features/usta-panel/panel-overview";

describe("panel overview resource isolation", () => {
  it("keeps independent overview content visible when secondary services fail", () => {
    const html = renderToStaticMarkup(<PanelOverview />);

    expect(html).toContain("overview.eyebrow");
    expect(html).toContain("reviews.errorDescription");
    expect(html).toContain("notifications.errorDescription");
    expect(html).toContain("messages.errorTitle");
    expect(html).not.toContain("overview.errorTitle");
  });
});
