import { z } from "zod";

import type { AuthUser } from "@/types/auth";
import type { PaginationMeta } from "@/types/api";
import type { Specialty, VehicleType, Workshop } from "@/types/workshop";

export const idSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value));

export const paginationMetaSchema: z.ZodType<PaginationMeta> = z
  .object({
    count: z.number().optional(),
    page: z.number().optional(),
    limit: z.number().optional(),
    total: z.number().optional(),
    totalPages: z.number().optional(),
  })
  .passthrough();

export const apiFailureSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    retryAfterSeconds: z.number().nonnegative().optional(),
    retryAt: z.string().optional(),
  }),
});

export function apiSuccessSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    success: z.literal(true),
    data,
    meta: paginationMetaSchema.optional(),
  });
}

const roleSchema = z.union([
  z.string(),
  z.object({ name: z.string() }).passthrough(),
]);

export const apiUserSchema: z.ZodType<AuthUser> = z
  .object({
    id: idSchema,
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().nullable().optional(),
    emailVerified: z.boolean().optional().default(false),
    roles: z.array(roleSchema).optional().default([]),
  })
  .passthrough()
  .transform((value) => ({
    ...value,
    phone: value.phone ?? null,
    roles: value.roles.map((role) =>
      typeof role === "string" ? role : role.name,
    ),
  }));

export const apiAuthPayloadSchema = z
  .object({
    user: apiUserSchema,
    accessToken: z.string().min(1).optional(),
  })
  .passthrough()
  .transform((value) => ({
    user: value.user,
    accessToken: value.accessToken ?? null,
  }));

export const apiCatalogItemSchema = z
  .object({
    id: idSchema,
    name: z.string(),
    code: z.union([z.string(), z.number()]).transform(String).optional(),
    slug: z.string().optional(),
  })
  .passthrough();

export const apiSpecialtySchema: z.ZodType<Specialty> = z
  .object({
    id: idSchema,
    name: z.string(),
    description: z.string().nullable().optional(),
    code: z.string().optional(),
    slug: z.string().optional(),
  })
  .passthrough()
  .transform((value) => ({
    slug: (value.slug ?? value.code ?? value.id) as Specialty["slug"],
    name: { tr: value.name, en: value.name },
    shortName: { tr: value.name, en: value.name },
    description: {
      tr: value.description ?? "",
      en: value.description ?? "",
    },
  }));

export const apiVehicleTypeSchema: z.ZodType<VehicleType> = z
  .object({
    id: idSchema,
    name: z.string(),
    code: z.string().optional(),
    slug: z.string().optional(),
  })
  .passthrough()
  .transform((value) => ({
    slug: (value.slug ?? value.code ?? value.id) as VehicleType["slug"],
    name: { tr: value.name, en: value.name },
  }));

const namedRelationSchema = z
  .object({
    id: idSchema,
    name: z.string(),
    slug: z.string().optional(),
  })
  .passthrough();

const workshopSpecialtyRelationSchema = z.union([
  namedRelationSchema,
  z.object({ specialty: namedRelationSchema }).transform((value) => value.specialty),
]);
const workshopVehicleTypeRelationSchema = z.union([
  namedRelationSchema,
  z.object({ vehicleType: namedRelationSchema }).transform((value) => value.vehicleType),
]);

const imageSchema = z.union([
  z.string(),
  z
    .object({
      url: z.string(),
      alt: z.string().nullable().optional(),
    })
    .passthrough(),
]);

export const apiWorkshopSchema: z.ZodType<Workshop> = z
  .object({
    id: idSchema,
    name: z.string(),
    slug: z.string().optional(),
    description: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    status: z.string().optional(),
    verificationStatus: z.string().optional(),
    averageRating: z.number().nullable().optional(),
    rating: z.number().nullable().optional(),
    reviewCount: z.number().nullable().optional(),
    province: namedRelationSchema.optional(),
    district: namedRelationSchema.optional(),
    specialties: z.array(workshopSpecialtyRelationSchema).optional(),
    vehicleTypes: z.array(workshopVehicleTypeRelationSchema).optional(),
    images: z.array(imageSchema).optional(),
    coverImage: z.string().optional(),
  })
  .passthrough()
  .transform((value) => {
    const rating = value.averageRating ?? value.rating ?? null;
    const image = value.coverImage ?? value.images?.[0];
    const coverImage =
      typeof image === "string" ? image : image?.url ?? "/images/hero-workshop.webp";
    const workshopStatus = value.status?.toUpperCase();

    return {
      id: value.id,
      slug: value.slug ?? value.id,
      name: value.name,
      city: value.province?.name ?? "",
      district: value.district?.name ?? "",
      specialties: (value.specialties ?? []).map(
        (relation) => (relation.slug ?? relation.id) as Workshop["specialties"][number],
      ),
      reviewSpecialties: (value.specialties ?? []).map((relation) => ({
        id: relation.id,
        name: { tr: relation.name, en: relation.name },
      })),
      vehicleTypes: (value.vehicleTypes ?? []).map(
        (relation) => (relation.slug ?? relation.id) as Workshop["vehicleTypes"][number],
      ),
      rating,
      reviewCount: value.reviewCount ?? 0,
      address: value.address ?? "",
      phone: value.phone ?? "",
      description: {
        tr: value.description ?? "",
        en: value.description ?? "",
      },
      verificationStatus:
        value.verificationStatus === "VERIFIED" &&
        !["PENDING", "REJECTED", "SUSPENDED", "CANCELLED", "DRAFT"].includes(
          workshopStatus ?? "",
        )
          ? "verified"
          : "pending",
      ratingBreakdown: null,
      reviews: [],
      coverImage,
    };
  });

export const apiWorkshopReviewSchema = z.object({
  id: idSchema,
  overallRating: z.number().int().min(1).max(5),
  comment: z.string(),
  createdAt: z.string(),
  moderationStatus: z
    .enum(["PENDING", "PUBLISHED", "REJECTED", "REMOVED"])
    .optional(),
  verificationStatus: z
    .enum(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"])
    .default("UNVERIFIED"),
  author: z.object({ displayName: z.string() }),
  ownerReply: z.object({
    reply: z.string(),
    createdAt: z.coerce.string(),
    updatedAt: z.coerce.string(),
  }).nullable().optional(),
}).passthrough().transform((value) => ({
  id: value.id,
  authorName: value.author.displayName,
  rating: value.overallRating as 1 | 2 | 3 | 4 | 5,
  comment: { tr: value.comment, en: value.comment },
  createdAt: value.createdAt,
  moderationStatus: value.moderationStatus,
  verificationStatus: value.verificationStatus,
  ownerReply: value.ownerReply ?? null,
}));
