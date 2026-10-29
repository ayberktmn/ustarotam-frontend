import {
  adminWorkshopApplicationListQuerySchema,
  workshopApplicationCollectionDecisionSchema,
  createWorkshopApplicationDraftSchema,
  createWorkshopApplicationSchema,
  updateWorkshopApplicationDraftSchema,
  validateWorkshopApplicationInput,
  workshopApplicationDocumentParamsSchema,
  workshopApplicationDocumentReadParamsSchema,
  workshopApplicationIdParamsSchema,
  workshopApplicationMineQuerySchema,
} from "../validators/workshop-application.validators.js";

export function createWorkshopApplicationController(service) {
  return {
    create: async (req, res) => {
      const input = validateWorkshopApplicationInput(createWorkshopApplicationSchema, req.body);
      res.status(201).json({ success: true, data: await service.create(req.auth, input) });
    },
    createAsOwner: async (req, res) => {
      const input = validateWorkshopApplicationInput(createWorkshopApplicationSchema, req.body);
      res.status(201).json({ success: true, data: await service.createAsOwner(req.auth, input) });
    },
    createDraft: async (req, res) => {
      const input = validateWorkshopApplicationInput(createWorkshopApplicationDraftSchema, req.body ?? {});
      const result = await service.createDraft(req.auth, input);
      res.status(result.created ? 201 : 200).json({ success: true, data: result.data });
    },
    updateDraft: async (req, res) => {
      const { id } = validateWorkshopApplicationInput(workshopApplicationIdParamsSchema, req.params);
      const input = validateWorkshopApplicationInput(updateWorkshopApplicationDraftSchema, req.body);
      res.status(200).json({ success: true, data: await service.updateDraft(req.auth, id, input) });
    },
    submitDraft: async (req, res) => {
      const { id } = validateWorkshopApplicationInput(workshopApplicationIdParamsSchema, req.params);
      res.status(200).json({ success: true, data: await service.submitDraft(req.auth, id) });
    },
    listMine: async (req, res) => {
      const query = validateWorkshopApplicationInput(workshopApplicationMineQuerySchema, req.query);
      res.status(200).json({ success: true, ...await service.listMine(req.auth, query) });
    },
    uploadDocument: async (req, res) => {
      const { id, documentType } = validateWorkshopApplicationInput(
        workshopApplicationDocumentParamsSchema,
        req.params,
      );
      const contentType = req.get("content-type")?.split(";")[0].trim().toLowerCase();
      const data = await service.uploadDocument(req.auth, id, documentType, req.body, contentType);
      res.status(201).json({ success: true, data });
    },
    listDocuments: async (req, res) => {
      const { id } = validateWorkshopApplicationInput(workshopApplicationIdParamsSchema, req.params);
      res.status(200)
        .set("Cache-Control", "private, no-store")
        .json({ success: true, data: await service.listDocuments(req.auth, id) });
    },
    readDocument: async (req, res) => {
      const { id, documentId } = validateWorkshopApplicationInput(
        workshopApplicationDocumentReadParamsSchema,
        req.params,
      );
      const { metadata, bytes } = await service.readDocument(req.auth, id, documentId);
      const extension = {
        "application/pdf": "pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
      }[metadata.mimeType];
      res.status(200)
        .set({
          "Content-Type": metadata.mimeType,
          "Content-Disposition": `${metadata.mimeType === "application/pdf" ? "inline" : "attachment"}; filename="application-document-${metadata.id}.${extension}"`,
          "Content-Length": String(bytes.length),
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        })
        .send(bytes);
    },
    listAdmin: async (req, res) => {
      const { status, ...query } = validateWorkshopApplicationInput(adminWorkshopApplicationListQuerySchema, req.query);
      res.status(200).json({ success: true, ...await service.listAdmin(req.auth, status, query) });
    },
    getAdmin: async (req, res) => {
      const { id } = validateWorkshopApplicationInput(workshopApplicationIdParamsSchema, req.params);
      res.status(200).json({ success: true, data: await service.getAdmin(req.auth, id) });
    },
    decideFromCollection: async (req, res) => {
      const { applicationId, ...input } = validateWorkshopApplicationInput(
        workshopApplicationCollectionDecisionSchema,
        req.body,
      );
      res.status(200).json({ success: true, data: await service.decide(req.auth, applicationId, input) });
    },
  };
}
