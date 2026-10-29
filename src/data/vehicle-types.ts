import type { VehicleType } from "@/types/workshop";

export const vehicleTypes: readonly VehicleType[] = [
  {
    slug: "otomobil",
    name: {
      tr: "Otomobil",
      en: "Car",
    },
  },
  {
    slug: "suv",
    name: {
      tr: "SUV / 4x4",
      en: "SUV / 4x4",
    },
  },
  {
    slug: "ticari",
    name: {
      tr: "Ticari Araç",
      en: "Commercial Vehicle",
    },
  },
];
