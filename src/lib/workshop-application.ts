import { z } from "zod";

export const businessTypes = ["SAHIS", "LIMITED", "ANONIM"] as const;
export const businessTypeSchema = z.enum(businessTypes);
export type BusinessType = z.infer<typeof businessTypeSchema>;

export const businessTypeTranslationKeys: Record<BusinessType, "sole" | "limited" | "corporation"> = {
  SAHIS: "sole",
  LIMITED: "limited",
  ANONIM: "corporation",
};

// Local form values only. This is deliberately not a backend request schema.
export const businessDraftSchema = z.object({
  name: z.string().trim().min(2).max(180),
  businessType: businessTypeSchema,
  phone: z.string().regex(/^05[0-9]{9}$/),
  address: z.string().trim().min(5).max(500),
});

export type BusinessDraft = z.infer<typeof businessDraftSchema>;
export const applicationStatusSchema = z.enum(["DRAFT", "PENDING", "VERIFIED", "REJECTED", "SUSPENDED"]);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export interface WorkshopApplicationInput {
  name: string;
  businessType: BusinessType;
  phone: string;
  address: string;
  provinceId: string;
  districtId: string;
  industrialSiteId?: string | null;
  vehicleTypeIds: string[];
  brandIds: string[];
  specialtyIds: string[];
}
export const documentTypes = ["TAX_CERTIFICATE", "WORKPLACE_LICENSE", "CHAMBER_REGISTRATION", "TRADE_REGISTRY_DOCUMENT"] as const;
export type ApplicationDocumentType = typeof documentTypes[number];
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const PDF_MIME = "application/pdf";
export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function requiredDocuments(type: BusinessType): ApplicationDocumentType[] {
  return ["TAX_CERTIFICATE", "WORKPLACE_LICENSE", type === "SAHIS" ? "CHAMBER_REGISTRATION" : "TRADE_REGISTRY_DOCUMENT"];
}

export function documentError(file: Pick<File, "name" | "size" | "type">): "fileType" | "fileSize" | "fileEmpty" | null {
  if (file.size === 0) return "fileEmpty";
  if (file.size > MAX_DOCUMENT_BYTES) return "fileSize";
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!((extension === "pdf" && file.type === PDF_MIME) || (extension === "docx" && file.type === DOCX_MIME))) return "fileType";
  return null;
}

export function validCatalogSelection(value: string, items: {id: string}[] | undefined): boolean {
  return Boolean(value && items?.some(item => item.id === value));
}

export function sanitizeApplicationPhone(value: string): string {
  return value.replace(/[^0-9]/g, "").slice(0, 11);
}
