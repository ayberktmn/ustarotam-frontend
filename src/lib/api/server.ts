import "server-only";

import { serverRequest } from "@/lib/api/client";
import { createCatalogService } from "@/lib/api/endpoints/catalog";
import { createWorkshopService } from "@/lib/api/endpoints/workshops";

export const serverCatalogService = createCatalogService(serverRequest, {
  next: {
    revalidate: 3600,
    tags: ["catalog"],
  },
});

export const serverWorkshopService = createWorkshopService(serverRequest, {
  next: {
    revalidate: 60,
    tags: ["workshops"],
  },
});

export { getServerApiHealth } from "@/lib/api/endpoints/health";
