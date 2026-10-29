import { beforeEach, describe, expect, it, vi } from "vitest";

const { list, getById } = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/server", () => ({
  serverCatalogService: {},
  serverWorkshopService: { list, getById },
}));

import { getWorkshopBySlug, getWorkshopSlugs } from "@/lib/workshops";

const workshop = {
  id: "5727416d-f9f8-4393-8cd1-7e12c4183aa4",
  slug: "deneme-ddbf0562",
  name: "deneme",
  city: "Ağrı",
  district: "Merkez",
  specialties: [],
  vehicleTypes: [],
  rating: null,
  reviewCount: 0,
  address: "Adres",
  phone: "",
  description: { tr: "", en: "" },
  verificationStatus: "verified" as const,
  ratingBreakdown: null,
  reviews: [],
  coverImage: "/images/hero-workshop.webp",
};

describe("public workshop slug lookup", () => {
  beforeEach(() => {
    list.mockReset();
    getById.mockReset();
  });

  it("resolves canonical slugs from public listing pages instead of search text", async () => {
    list.mockResolvedValueOnce({
      items: [workshop],
      meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    getById.mockResolvedValue(workshop);

    await expect(getWorkshopBySlug("deneme-ddbf0562")).resolves.toEqual(
      workshop,
    );

    expect(list).toHaveBeenCalledWith({ page: 1, limit: 100 });
    expect(list).not.toHaveBeenCalledWith(
      expect.objectContaining({ search: "deneme-ddbf0562" }),
    );
    expect(getById).toHaveBeenCalledWith(workshop.id);
  });

  it("searches subsequent public pages and resolves UUID fallback URLs", async () => {
    list
      .mockResolvedValueOnce({
        items: Array.from({ length: 50 }, (_, index) => ({
          ...workshop,
          id: `workshop-${index}`,
          slug: `workshop-${index}`,
        })),
        meta: { page: 1, limit: 100, total: 51, totalPages: 2 },
      })
      .mockResolvedValueOnce({
        items: [workshop],
        meta: { page: 2, limit: 100, total: 51, totalPages: 2 },
      });
    getById.mockResolvedValue(workshop);

    await expect(getWorkshopBySlug(workshop.id)).resolves.toEqual(workshop);

    expect(list).toHaveBeenNthCalledWith(2, { page: 2, limit: 100 });
    expect(getById).toHaveBeenCalledWith(workshop.id);
  });

  it("does not fetch or expose an unverified workshop", async () => {
    list.mockResolvedValueOnce({
      items: [{ ...workshop, verificationStatus: "pending" }],
      meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });

    await expect(getWorkshopBySlug(workshop.slug)).resolves.toBeNull();
    expect(getById).not.toHaveBeenCalled();
  });

  it("does not expose a workshop whose detail is no longer verified", async () => {
    list.mockResolvedValueOnce({
      items: [workshop],
      meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    getById.mockResolvedValue({
      ...workshop,
      verificationStatus: "pending",
    });

    await expect(getWorkshopBySlug(workshop.slug)).resolves.toBeNull();
  });

  it("only generates public verified workshop slugs", async () => {
    list.mockResolvedValueOnce({
      items: [
        workshop,
        { ...workshop, id: "pending", slug: "pending-workshop", verificationStatus: "pending" },
      ],
      meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
    });

    await expect(getWorkshopSlugs()).resolves.toEqual([workshop.slug]);
  });
});
