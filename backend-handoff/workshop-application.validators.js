import { z } from "zod";
import { createWorkshopSchema } from "./workshop.validators.js";
import { HttpError } from "../utils/http-error.js";

const uuid = z.uuid({ error: "Must be a valid UUID" });
const pageQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
const applicationStatus = z.enum(["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"]);
const applicantApplicationStatus = z.enum(["DRAFT", "PENDING", "VERIFIED", "REJECTED", "SUSPENDED"]);
const decisionNote = z.string().trim().min(3).max(500);

export const createWorkshopApplicationSchema = createWorkshopSchema;
export const createWorkshopApplicationDraftSchema = createWorkshopSchema.partial();
export const updateWorkshopApplicationDraftSchema = z.preprocess(
  (value) => value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0
    ? value
    : undefined,
  createWorkshopSchema.partial(),
);
export const workshopApplicationDocumentTypeSchema = z.enum([
  "TAX_CERTIFICATE",
  "WORKPLACE_LICENSE",
  "CHAMBER_REGISTRATION",
  "TRADE_REGISTRY_DOCUMENT",
]);
export const workshopApplicationIdParamsSchema = z.object({ id: uuid }).strict();
export const workshopApplicationDocumentParamsSchema = z.object({
  id: uuid,
  documentType: workshopApplicationDocumentTypeSchema,
}).strict();
export const workshopApplicationDocumentReadParamsSchema = z.object({
  id: uuid,
  documentId: uuid,
}).strict();
export const workshopApplicationMineQuerySchema = z.object({
  ...pageQuery,
  status: applicantApplicationStatus.optional(),
}).strict();
export const adminWorkshopApplicationListQuerySchema = z.object({
  ...pageQuery,
  status: applicationStatus.default("PENDING"),
  search: z.string().trim().min(2).max(180).optional(),
}).strict();
export const workshopApplicationCollectionDecisionSchema = z.discriminatedUnion("status", [
  z.object({ applicationId: uuid, status: z.literal("VERIFIED"), note: decisionNote.optional() }).strict(),
  z.object({ applicationId: uuid, status: z.literal("REJECTED"), note: decisionNote }).strict(),
]);

export function validateWorkshopApplicationInput(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Request validation failed", {
      issues: result.error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
    });
  }
  return result.data;
}
