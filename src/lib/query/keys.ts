export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  catalog: {
    provinces: ["catalog", "provinces"] as const,
    districts: (provinceId: string) =>
      ["catalog", "districts", provinceId] as const,
    industrialSites: (districtId: string) =>
      ["catalog", "industrial-sites", districtId] as const,
    vehicleTypes: ["catalog", "vehicle-types"] as const,
    vehicleTypeCatalog: ["catalog", "vehicle-type-catalog"] as const,
    vehicleBrands: ["catalog", "vehicle-brands"] as const,
    vehicleModels: (brandId?: string, typeId?: string) =>
      ["catalog", "vehicle-models", brandId ?? "all", typeId ?? "all"] as const,
    specialties: ["catalog", "specialties"] as const,
    specialtyCatalog: ["catalog", "specialty-catalog"] as const,
  },
  workshops: {
    all: ["workshops"] as const,
    list: (query: Record<string, unknown>) =>
      ["workshops", "list", query] as const,
    detail: (id: string) => ["workshops", "detail", id] as const,
    reviews: (id: string) => ["workshops", "detail", id, "reviews"] as const,
  },
  reviews: {
    all: ["reviews"] as const,
    mine: ["reviews", "mine"] as const,
  },
  workRequests: {
    all: ["work-requests"] as const,
    lists: ["work-requests", "list"] as const,
    list: (query: { status?: string; page: number; limit: number }) =>
      ["work-requests", "list", query] as const,
    details: ["work-requests", "detail"] as const,
    detail: (id: string) => ["work-requests", "detail", id] as const,
    offerLists: (id: string) => ["work-requests", "offers", id] as const,
    offers: (id: string, page: number, limit: number) =>
      ["work-requests", "offers", id, page, limit] as const,
  },
  accountMessages: {
    conversations: ["account", "messages"] as const,
    conversation: (id: string) => ["account", "messages", id] as const,
  },
  workshopPanel: {
    all: ["workshop-panel"] as const,
    requests: ["workshop-panel", "requests"] as const,
    offers: ["workshop-panel", "offers"] as const,
    conversations: ["workshop-panel", "conversations"] as const,
    conversation: (id: string) =>
      ["workshop-panel", "conversation", id] as const,
    notifications: ["workshop-panel", "notifications"] as const,
    reviews: ["workshop-panel", "reviews"] as const,
    profile: ["workshop-panel", "profile"] as const,
    serviceAreas: ["workshop-panel", "service-areas"] as const,
  },
};
