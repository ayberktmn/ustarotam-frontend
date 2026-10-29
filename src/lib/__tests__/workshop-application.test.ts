import { expect, it } from "vitest";
import { sanitizeApplicationPhone, businessDraftSchema, businessTypeSchema, documentError, requiredDocuments, validCatalogSelection, MAX_DOCUMENT_BYTES, PDF_MIME, DOCX_MIME } from "../workshop-application";

it("requires valid business information without defining an API payload", () => {
  const valid = {name: "Test Servis", phone: "05551234567", address: "Test Mahallesi 12", businessType: "SAHIS"};
  expect(businessDraftSchema.safeParse(valid).success).toBe(true);
  for (const field of ["name", "phone", "address", "businessType"]) expect(businessDraftSchema.safeParse({...valid, [field]: ""}).success).toBe(false);
});

it("requires the correct three documents for each business type", () => {
  expect(requiredDocuments("SAHIS")).toEqual(["TAX_CERTIFICATE", "WORKPLACE_LICENSE", "CHAMBER_REGISTRATION"]);
  for (const type of ["LIMITED", "ANONIM"] as const) expect(requiredDocuments(type)).toEqual(["TAX_CERTIFICATE", "WORKPLACE_LICENSE", "TRADE_REGISTRY_DOCUMENT"]);
});

it.each(["SAHIS", "LIMITED", "ANONIM"] as const)("accepts backend business type enum %s", businessType => {
  expect(businessTypeSchema.parse(businessType)).toBe(businessType);
});

it.each(["sole", "limited", "corporation", "", "SAHİS"])("rejects non-backend business type %s", businessType => {
  expect(businessTypeSchema.safeParse(businessType).success).toBe(false);
});

it.each([["document.pdf", PDF_MIME], ["document.docx", DOCX_MIME]])("accepts %s up to exactly 10 MiB", (name, type) => {
  expect(documentError({name, type, size: MAX_DOCUMENT_BYTES})).toBeNull();
  expect(documentError({name, type, size: MAX_DOCUMENT_BYTES + 1})).toBe("fileSize");
  expect(documentError({name, type, size: 0})).toBe("fileEmpty");
});

it.each([["image.png", "image/png"], ["test.doc", "application/msword"], ["test.pdf", DOCX_MIME], ["test.docx", PDF_MIME], ["test.pdf", ""]])("rejects mismatched or unsupported file %s (%s)", (name, type) => {
  expect(documentError({name, type, size: 100})).toBe("fileType");
});

it("accepts only selections present in the current parent catalog", () => {
  expect(validCatalogSelection("ankara-district", [{id: "izmir-district"}])).toBe(false);
  expect(validCatalogSelection("ankara-district", undefined)).toBe(false);
  expect(validCatalogSelection("", [{id: "ankara-district"}])).toBe(false);
  expect(validCatalogSelection("ankara-district", [{id: "ankara-district"}])).toBe(true);
});

it.each(["5551234567", "0555123456", "055512345678", "02121234567", "          ", "+905551234567"])('rejects invalid mobile number %s', phone => {
 expect(businessDraftSchema.shape.phone.safeParse(phone).success).toBe(false);
});
it('cleans pasted phone text and caps the digits', () => {
 expect(sanitizeApplicationPhone('0 (555) abc 123-45-67!89')).toBe('05551234567');
});
it('rejects whitespace and enforces backend text limits', () => {
 expect(businessDraftSchema.shape.name.safeParse('   ').success).toBe(false);
 expect(businessDraftSchema.shape.address.safeParse('     ').success).toBe(false);
 expect(businessDraftSchema.shape.name.safeParse('x'.repeat(181)).success).toBe(false);
 expect(businessDraftSchema.shape.address.safeParse('x'.repeat(501)).success).toBe(false);
});
