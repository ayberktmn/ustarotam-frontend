import { z } from "zod";
import { browserRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { applicationStatusSchema, businessTypeSchema, documentError, type ApplicationDocumentType, documentTypes, type WorkshopApplicationInput } from "@/lib/workshop-application";

const routeId = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);

const relationSchema = z.object({id: z.string(), name: z.string()}).passthrough();
const nestedRelationSchema = z.union([
  relationSchema,
  z.object({vehicleType: relationSchema}).transform(({vehicleType}) => vehicleType),
  z.object({brand: relationSchema}).transform(({brand}) => brand),
  z.object({specialty: relationSchema}).transform(({specialty}) => specialty),
]);
const applicationSchema = z.object({
  id: z.string().optional(),
  applicationId: z.string().optional(),
  status: applicationStatusSchema.optional(),
  verificationStatus: applicationStatusSchema.optional(),
  name: z.string(),
  businessType: businessTypeSchema,
  phone: z.string(),
  address: z.string(),
  province: relationSchema,
  district: relationSchema,
  industrialSite: relationSchema.nullable().optional(),
  vehicleTypes: z.array(nestedRelationSchema).optional().default([]),
  brands: z.array(nestedRelationSchema).optional().default([]),
  specialties: z.array(nestedRelationSchema).optional().default([]),
  rejectionReason: z.string().nullable().optional(),
  createdAt: z.coerce.string().optional(),
  updatedAt: z.coerce.string().optional(),
}).passthrough().transform((application, context) => {
  const id = application.applicationId ?? application.id;
  if (!id) {
    context.addIssue({code: "custom", path: ["applicationId"], message: "Application ID is required"});
    return z.NEVER;
  }
  const status = application.status ?? application.verificationStatus;
  if (!status) {
    context.addIssue({code: "custom", path: ["verificationStatus"], message: "Application status is required"});
    return z.NEVER;
  }
  return {...application, id, status};
});

const documentSchema = z.object({
  id: z.string(),
  documentType: z.enum(documentTypes),
  mimeType: z.string().optional(),
  byteSize: z.number().optional(),
  checksumSha256: z.string().optional(),
  fileName: z.string().optional(),
  originalName: z.string().optional(),
  status: z.string().optional(),
  createdAt: z.coerce.string().optional(),
}).passthrough();
const draftResponseSchema = z.object({success: z.literal(true), data: z.record(z.string(), z.unknown())})
  .transform(({data}, context) => {
    const id = typeof data.id === "string" ? data.id : typeof data.applicationId === "string" ? data.applicationId : null;
    if (!id) { context.addIssue({code: "custom", path: ["data", "id"], message: "Draft application ID is required"}); return z.NEVER; }
    return {...data, id} as WorkshopApplication;
  });
const applicationListResponseSchema = z.object({
  success: z.literal(true),
  data: z.union([z.array(applicationSchema), applicationSchema]),
  meta: z.object({
    page: z.number().int().positive().optional(),
    limit: z.number().int().positive().optional(),
    total: z.number().int().nonnegative().optional(),
    totalPages: z.number().int().nonnegative().optional(),
  }).passthrough().optional(),
}).transform(({data, meta}) => ({
  data: Array.isArray(data) ? data : [data],
  totalPages: Math.max(1, meta?.totalPages ?? 1),
}));

export type WorkshopApplication = {
  id: string; status: z.infer<typeof applicationStatusSchema>; name: string; businessType: z.infer<typeof businessTypeSchema>;
  phone: string; address: string; province: {id: string; name: string}; district: {id: string; name: string};
  industrialSite?: {id: string; name: string} | null; vehicleTypes: Array<{id: string; name: string}>;
  brands: Array<{id: string; name: string}>; specialties: Array<{id: string; name: string}>;
  rejectionReason?: string | null; [key: string]: unknown;
};
export type ApplicationDocument = z.infer<typeof documentSchema>;

const APPLICATION_PAGE_LIMIT = 100;

async function minePage(page: number): Promise<z.infer<typeof applicationListResponseSchema>> {
  return browserRequest({path: "/workshop-applications/mine", query: {page, limit: APPLICATION_PAGE_LIMIT}, schema: applicationListResponseSchema, responseMode: "raw", auth: "required", retries: 0});
}

export const workshopApplicationService = {
  async mine(): Promise<WorkshopApplication[]> {
    try {
      const first = await minePage(1);
      const applications = [...first.data];
      for (let page = 2; page <= first.totalPages; page++) {
        applications.push(...(await minePage(page)).data);
      }
      return applications;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return [];
      throw error;
    }
  },
  async drafts(): Promise<WorkshopApplication[]> {
    const response = await browserRequest({path: "/workshop-applications/mine", query: {page: 1, limit: APPLICATION_PAGE_LIMIT, status: "DRAFT"}, schema: applicationListResponseSchema, responseMode: "raw", auth: "required", retries: 0});
    return response.data;
  },
  createDraft(input: Partial<WorkshopApplicationInput> = {}): Promise<WorkshopApplication> {
    return browserRequest({path: "/workshop-applications/drafts", method: "POST", body: input, schema: draftResponseSchema, responseMode: "raw", auth: "required", retries: 0});
  },
  updateDraft(applicationId: string, input: Partial<WorkshopApplicationInput>): Promise<WorkshopApplication> {
    const id = routeId.parse(applicationId);
    return browserRequest({path: `/workshop-applications/${id}`, method: "PATCH", body: input, schema: applicationSchema, auth: "required", retries: 0});
  },
  submitDraft(applicationId: string): Promise<WorkshopApplication> {
    const id = routeId.parse(applicationId);
    return browserRequest({path: `/workshop-applications/${id}/submit`, method: "POST", schema: applicationSchema, auth: "required", retries: 0});
  },
  create(input: WorkshopApplicationInput): Promise<WorkshopApplication> {
    const businessType = businessTypeSchema.parse(input.businessType);
    return browserRequest({path: "/workshop-applications", method: "POST", body: {...input, businessType},
      schema: applicationSchema, auth: "required", retries: 0});
  },
  documents(applicationId: string): Promise<ApplicationDocument[]> {
    const id = routeId.parse(applicationId);
    return browserRequest({path: `/workshop-applications/${id}/documents`, schema: z.array(documentSchema), auth: "required", retries: 0});
  },
  downloadDocument(applicationId: string, documentId: string): Promise<Blob> {
    const application = routeId.parse(applicationId);
    const document = routeId.parse(documentId);
    return browserRequest({path: `/workshop-applications/${application}/documents/${document}`, schema: z.any(), responseMode: "binary", auth: "required", retries: 0});
  },
  uploadDocument(applicationId: string, type: ApplicationDocumentType, file: File): Promise<ApplicationDocument> {
    const id = routeId.parse(applicationId);
    z.enum(documentTypes).parse(type);
    if (documentError(file)) throw new TypeError("Invalid application document");
    return browserRequest({path: `/workshop-applications/${id}/documents/${type}`, method: "POST", binaryBody: file,
      schema: documentSchema, auth: "required", retries: 0, timeoutMs: 120_000});
  },
};
