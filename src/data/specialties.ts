import type { Specialty } from "@/types/workshop";

export const specialties: readonly Specialty[] = [
  {
    slug: "motor-mekanigi",
    name: {
      tr: "Motor ve Motor Mekaniği",
      en: "Engine & Mechanical",
    },
    shortName: {
      tr: "Motor",
      en: "Engine",
    },
    description: {
      tr: "Motor arızaları, bakım, triger seti ve mekanik onarım işleri.",
      en: "Engine faults, maintenance, timing belts and mechanical repairs.",
    },
  },
  {
    slug: "oto-elektrik",
    name: {
      tr: "Oto Elektrik ve Elektronik",
      en: "Auto Electrical & Electronics",
    },
    shortName: {
      tr: "Oto elektrik",
      en: "Electrical",
    },
    description: {
      tr: "Akü, alternatör, marş, aydınlatma ve araç elektroniği sorunları.",
      en: "Battery, alternator, starter, lighting and vehicle electronics.",
    },
  },
  {
    slug: "radyator-sogutma",
    name: {
      tr: "Radyatör ve Soğutma Sistemleri",
      en: "Radiator & Cooling Systems",
    },
    shortName: {
      tr: "Soğutma",
      en: "Cooling",
    },
    description: {
      tr: "Radyatör, termostat, devirdaim ve soğutma sistemi kontrolü.",
      en: "Radiator, thermostat, water pump and cooling system checks.",
    },
  },
  {
    slug: "sanziman",
    name: {
      tr: "Şanzıman",
      en: "Transmission",
    },
    shortName: {
      tr: "Şanzıman",
      en: "Transmission",
    },
    description: {
      tr: "Manuel ve otomatik şanzıman bakımı, onarımı ve kavrama işleri.",
      en: "Manual and automatic transmission service, repair and clutch work.",
    },
  },
  {
    slug: "klima",
    name: {
      tr: "Klima",
      en: "Air Conditioning",
    },
    shortName: {
      tr: "Klima",
      en: "A/C",
    },
    description: {
      tr: "Klima gaz dolumu, kaçak tespiti, kompresör ve ısıtma sistemi.",
      en: "Refrigerant charging, leak detection, compressors and heating.",
    },
  },
  {
    slug: "fren-yuruyen",
    name: {
      tr: "Fren ve Yürüyen Aksam",
      en: "Brakes & Running Gear",
    },
    shortName: {
      tr: "Fren",
      en: "Brakes",
    },
    description: {
      tr: "Fren sistemi, süspansiyon, rot-balans ve yürüyen aksam kontrolü.",
      en: "Brake systems, suspension, wheel alignment and running gear.",
    },
  },
  {
    slug: "kaporta-boya",
    name: {
      tr: "Kaporta ve Boya",
      en: "Bodywork & Paint",
    },
    shortName: {
      tr: "Kaporta",
      en: "Bodywork",
    },
    description: {
      tr: "Kaporta onarımı, boya, pasta-cila ve hasar düzeltme işleri.",
      en: "Body repair, painting, polishing and damage correction.",
    },
  },
  {
    slug: "periyodik-bakim",
    name: {
      tr: "Periyodik Bakım",
      en: "Periodic Maintenance",
    },
    shortName: {
      tr: "Bakım",
      en: "Maintenance",
    },
    description: {
      tr: "Yağ, filtre, sıvı kontrolü ve üretici bakım planına uygun servis.",
      en: "Oil, filters, fluid checks and service aligned with the manufacturer schedule.",
    },
  },
  {
    slug: "lastik",
    name: {
      tr: "Lastik ve Jant",
      en: "Tires & Wheels",
    },
    shortName: {
      tr: "Lastik",
      en: "Tires",
    },
    description: {
      tr: "Lastik değişimi, rot-balans, jant kontrolü ve mevsimsel bakım.",
      en: "Tire replacement, wheel alignment, rim checks and seasonal service.",
    },
  },
  {
    slug: "suspansiyon",
    name: {
      tr: "Süspansiyon",
      en: "Suspension",
    },
    shortName: {
      tr: "Süspansiyon",
      en: "Suspension",
    },
    description: {
      tr: "Amortisör, yay, salıncak ve sürüş konforu ile ilgili kontroller.",
      en: "Shock absorbers, springs, control arms and ride comfort checks.",
    },
  },
];
