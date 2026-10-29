import { describe, expect, it } from "vitest";

import {
  createMockWorkshopPanelRepository,
  WorkshopPanelError,
} from "@/lib/repositories/workshop-panel-repository";

const futureExpiry = "2026-12-01T20:59:59.000Z";

describe("workshop panel mock repository", () => {
  it("lists requests newest first", async () => {
    const repository = createMockWorkshopPanelRepository();
    const requests = await repository.listRequests();

    expect(requests.length).toBeGreaterThanOrEqual(6);
    expect(requests[0]?.id).toBe("req-1001");
    expect(requests.some((request) => request.city === "İzmir")).toBe(true);
  });

  it("creates, updates and withdraws an offer", async () => {
    const repository = createMockWorkshopPanelRepository();
    const created = await repository.createOffer({
      requestId: "req-1002",
      amount: 2000,
      currency: "TRY",
      description: "Klima gaz dolumu ve kaçak kontrolü dahil.",
      expiresAt: futureExpiry,
    });

    expect(created.status).toBe("SUBMITTED");
    expect(created.request.vehicleLabel).toBe("2020 Renault Clio");

    const updated = await repository.updateOffer(created.id, {
      amount: 2200,
      currency: "TRY",
      description: "Gaz dolumu, kaçak kontrolü ve filtre temizliği dahil.",
      expiresAt: futureExpiry,
    });

    expect(updated.amount).toBe(2200);

    await repository.withdrawOffer(created.id);

    const offers = await repository.listOffers();
    expect(
      offers.find((offer) => offer.id === created.id)?.status,
    ).toBe("WITHDRAWN");
  });

  it("rejects a second offer for the same request", async () => {
    const repository = createMockWorkshopPanelRepository();
    const input = {
      requestId: "req-1002",
      amount: 2000,
      currency: "TRY" as const,
      description: "Klima gaz dolumu ve kaçak kontrolü dahil.",
      expiresAt: futureExpiry,
    };

    await repository.createOffer(input);

    await expect(repository.createOffer(input)).rejects.toBeInstanceOf(
      WorkshopPanelError,
    );
    await expect(repository.createOffer(input)).rejects.toMatchObject({
      code: "OFFER_ALREADY_EXISTS",
    });
  });

  it("does not allow editing a withdrawn offer", async () => {
    const repository = createMockWorkshopPanelRepository();

    await repository.withdrawOffer("off-2001");

    await expect(
      repository.updateOffer("off-2001", {
        amount: 3000,
        currency: "TRY",
        description: "Güncellenmiş teklif açıklaması.",
        expiresAt: futureExpiry,
      }),
    ).rejects.toMatchObject({ code: "OFFER_NOT_EDITABLE" });
  });

  it("marks a conversation as read and sends a message", async () => {
    const repository = createMockWorkshopPanelRepository();
    const before = await repository.getConversation("con-3001");

    expect(before.unreadCount).toBe(2);

    await repository.markConversationRead("con-3001");

    const after = await repository.getConversation("con-3001");
    expect(after.unreadCount).toBe(0);
    expect(after.messages.every((message) => message.read)).toBe(true);

    await repository.sendMessage("con-3001", "Yarın sabah görüşürüz.");

    const withMessage = await repository.getConversation("con-3001");
    expect(withMessage.messages.at(-1)?.sender).toBe("WORKSHOP");
    expect(withMessage.messages.at(-1)?.body.tr).toBe(
      "Yarın sabah görüşürüz.",
    );
    expect(withMessage.lastMessage.tr).toBe("Yarın sabah görüşürüz.");
  });

  it("marks one or all notifications as read", async () => {
    const repository = createMockWorkshopPanelRepository();
    const before = await repository.listNotifications();

    expect(before.filter((item) => !item.read)).toHaveLength(2);

    await repository.markNotificationRead("not-5001");

    const afterOne = await repository.listNotifications();
    expect(
      afterOne.find((item) => item.id === "not-5001")?.read,
    ).toBe(true);

    await repository.markAllNotificationsRead();

    const afterAll = await repository.listNotifications();
    expect(afterAll.every((item) => item.read)).toBe(true);
  });

  it("summarizes ratings and distributions", async () => {
    const repository = createMockWorkshopPanelRepository();
    const reviews = await repository.listReviews();

    expect(reviews.summary.total).toBe(5);
    expect(reviews.summary.average).toBe(4.4);
    expect(reviews.summary.distribution).toEqual([
      { stars: 5, count: 3 },
      { stars: 4, count: 1 },
      { stars: 3, count: 1 },
      { stars: 2, count: 0 },
      { stars: 1, count: 0 },
    ]);
  });

  it("updates the workshop profile", async () => {
    const repository = createMockWorkshopPanelRepository();

    await repository.updateProfile({
      name: "Ege Motor Servisi",
      phone: "+90 555 111 22 33",
      about: {
        tr: "Motor, fren ve periyodik bakım alanında hizmet veren bir atölye.",
        en: "A workshop serving engine, brake and periodic maintenance.",
      },
    });

    const profile = await repository.getProfile();
    expect(profile.phone).toBe("+90 555 111 22 33");
    expect(profile.about.tr).toContain("periyodik bakım");
  });
});
