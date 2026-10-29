import { Router } from "express";
import express from "express";
import { createWorkshopApplicationController } from "../controllers/workshop-application.controller.js";
import {
  WORKSHOP_APPLICATION_DOCUMENT_MAX_BYTES,
  WORKSHOP_APPLICATION_DOCX_MIME_TYPE,
} from "../services/workshop-application.service.js";

export function createWorkshopApplicationRouters(service, authenticate) {
  const applicant = Router();
  const admin = Router();
  const controller = createWorkshopApplicationController(service);
  const parseDocument = express.raw({
    type: ["application/pdf", WORKSHOP_APPLICATION_DOCX_MIME_TYPE],
    limit: WORKSHOP_APPLICATION_DOCUMENT_MAX_BYTES,
    inflate: false,
  });

  applicant.post("/drafts", authenticate, controller.createDraft);
  applicant.get("/mine", authenticate, controller.listMine);
  applicant.patch("/:id", authenticate, controller.updateDraft);
  applicant.post("/:id/submit", authenticate, controller.submitDraft);
  applicant.post("/", authenticate, controller.create);
  applicant.get("/", authenticate, controller.listAdmin);
  applicant.post("/:id/documents/:documentType", authenticate, parseDocument, controller.uploadDocument);
  applicant.get("/:id/documents", authenticate, controller.listDocuments);
  applicant.get("/:id/documents/:documentId", authenticate, controller.readDocument);
  admin.get("/workshop-applications", authenticate, controller.listAdmin);
  admin.patch("/workshop-applications", authenticate, controller.decideFromCollection);
  admin.get("/workshop-applications/:id", authenticate, controller.getAdmin);
  admin.get("/workshop-applications/:id/documents", authenticate, controller.listDocuments);
  admin.get("/workshop-applications/:id/documents/:documentId", authenticate, controller.readDocument);

  return { applicant, admin };
}
