import { describe, expect, it } from "vitest";

import {
  getEffectiveOfferStatus,
  matchesJobFilter,
} from "@/features/usta-panel/status";
import { createMockWorkshopPanelRepository } from "@/lib/repositories/workshop-panel-repository";

async function loadPanel() {
  const repository = createMockWorkshopPanelRepository();

  return {
    requests: await repository.listRequests(),
    offers: await repository.listOffers(),
  };
}

describe("workshop panel status helpers", () => {
  it("puts requests without an offer in the available filter", async () => {
    const { requests, offers } = await loadPanel();
    const request = requests.find((item) => item.id === "req-1002");
    const offer = offers.find((item) => item.requestId === "req-1002");

    expect(request).toBeDefined();
    expect(offer).toBeUndefined();
    expect(matchesJobFilter(request!, undefined, "all")).toBe(true);
    expect(matchesJobFilter(request!, undefined, "offered")).toBe(false);
  });

  it("groups submitted, accepted and rejected offers correctly", async () => {
    const { requests, offers } = await loadPanel();
    const byRequest = new Map(offers.map((offer) => [offer.requestId, offer]));

    const submitted = requests.find((item) => item.id === "req-1001")!;
    expect(matchesJobFilter(submitted, byRequest.get("req-1001"), "offered")).toBe(
      true,
    );
    expect(matchesJobFilter(submitted, byRequest.get("req-1001"), "closed")).toBe(
      false,
    );

    const accepted = requests.find((item) => item.id === "req-1005")!;
    expect(matchesJobFilter(accepted, byRequest.get("req-1005"), "won")).toBe(
      true,
    );
    expect(
      matchesJobFilter(accepted, byRequest.get("req-1005"), "closed"),
    ).toBe(false);

    const rejected = requests.find((item) => item.id === "req-1006")!;
    expect(
      matchesJobFilter(rejected, byRequest.get("req-1006"), "closed"),
    ).toBe(true);
    expect(matchesJobFilter(rejected, byRequest.get("req-1006"), "all")).toBe(
      false,
    );
  });

  it("treats an overdue submitted offer as expired", async () => {
    const { offers } = await loadPanel();
    const offer = offers.find((item) => item.id === "off-2001")!;

    expect(getEffectiveOfferStatus(offer)).toBe("SUBMITTED");
    expect(
      getEffectiveOfferStatus({
        ...offer,
        expiresAt: "2020-01-01T00:00:00.000Z",
      }),
    ).toBe("EXPIRED");
  });
});
