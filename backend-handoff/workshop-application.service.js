import { createHash, randomUUID } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { HttpError } from "../utils/http-error.js";
import {
  createWorkshopApplicationDocumentStorage,
  DEFAULT_WORKSHOP_DOCUMENT_STORAGE_DIR,
} from "../storage/workshop-application-document.storage.js";
import { REQUIRED_WORKSHOP_APPLICATION_DOCUMENTS } from "../repositories/workshop-application.repository.js";

export const WORKSHOP_APPLICATION_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const WORKSHOP_APPLICATION_DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const documentMimeTypes = new Set(["application/pdf", WORKSHOP_APPLICATION_DOCX_MIME_TYPE]);

export function detectWorkshopApplicationDocumentMime(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  if (buffer.length >= 8 && buffer.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  return isDocxArchive(buffer) ? WORKSHOP_APPLICATION_DOCX_MIME_TYPE : null;
}

function isDocxArchive(buffer) {
  const minimumEndRecordSize = 22;
  const endRecordSignature = 0x06054b50;
  const centralDirectorySignature = 0x02014b50;
  const localFileSignature = 0x04034b50;
  const searchStart = Math.max(0, buffer.length - minimumEndRecordSize - 0xffff);
  let endRecordOffset = -1;

  for (let offset = buffer.length - minimumEndRecordSize; offset >= searchStart; offset -= 1) {
    if (buffer.readUInt32LE(offset) === endRecordSignature
        && offset + minimumEndRecordSize + buffer.readUInt16LE(offset + 20) === buffer.length) {
      endRecordOffset = offset;
      break;
    }
  }
  if (endRecordOffset < 0) return false;

  const diskNumber = buffer.readUInt16LE(endRecordOffset + 4);
  const centralDirectoryDisk = buffer.readUInt16LE(endRecordOffset + 6);
  const entriesOnDisk = buffer.readUInt16LE(endRecordOffset + 8);
  const entryCount = buffer.readUInt16LE(endRecordOffset + 10);
  const centralDirectorySize = buffer.readUInt32LE(endRecordOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(endRecordOffset + 16);
  if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesOnDisk !== entryCount
      || entryCount === 0xffff || centralDirectoryOffset + centralDirectorySize > endRecordOffset) {
    return false;
  }

  const requiredEntries = new Set(["[Content_Types].xml", "word/document.xml"]);
  let hasWordDocumentContentType = false;
  let offset = centralDirectoryOffset;
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > centralDirectoryEnd || buffer.readUInt32LE(offset) !== centralDirectorySignature) return false;
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const entryEnd = offset + 46 + nameLength + extraLength + commentLength;
    if (entryEnd > centralDirectoryEnd || (flags & 1) !== 0 || ![0, 8].includes(method)) return false;

    const entryName = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);
    if (requiredEntries.has(entryName)) {
      if (uncompressedSize === 0 || localOffset + 30 > centralDirectoryOffset
          || buffer.readUInt32LE(localOffset) !== localFileSignature) return false;
      const localFlags = buffer.readUInt16LE(localOffset + 6);
      const localMethod = buffer.readUInt16LE(localOffset + 8);
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const localNameEnd = localOffset + 30 + localNameLength;
      const dataOffset = localNameEnd + localExtraLength;
      const dataEnd = dataOffset + compressedSize;
      if (localFlags !== flags || localMethod !== method || dataEnd > centralDirectoryOffset
          || buffer.toString("utf8", localOffset + 30, localNameEnd) !== entryName) return false;
      if (entryName === "[Content_Types].xml") {
        if (uncompressedSize > 65536 || compressedSize > 65536) return false;
        let contentTypes;
        try {
          const compressedContentTypes = buffer.subarray(dataOffset, dataEnd);
          contentTypes = method === 0
            ? compressedContentTypes
            : inflateRawSync(compressedContentTypes, { maxOutputLength: 65536 });
        } catch (error) {
          if (error?.code?.startsWith("Z_") || error?.code === "ERR_BUFFER_TOO_LARGE") return false;
          throw error;
        }
        hasWordDocumentContentType = contentTypes.length === uncompressedSize
          && contentTypes.includes(Buffer.from(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
          ));
        if (!hasWordDocumentContentType) return false;
      }
      requiredEntries.delete(entryName);
    }
    offset = entryEnd;
  }
  if (offset !== centralDirectoryEnd || requiredEntries.size !== 0 || !hasWordDocumentContentType) return false;
  return true;
}

function requireActor(actor) {
  if (!actor?.id) throw new HttpError(401, "AUTHENTICATION_REQUIRED", "Authentication required");
}

function requireApplicant(actor) {
  requireActor(actor);
  if (!actor.roles?.includes("USER")) {
    throw new HttpError(403, "USER_ROLE_REQUIRED", "Customer role required");
  }
}

async function requireAdmin(actor, repository) {
  requireActor(actor);
  if (!actor.roles?.includes("ADMIN") || !await repository.hasRole(actor.id, "ADMIN")) {
    throw new HttpError(403, "ADMIN_REQUIRED", "Administrator role required");
  }
}

function pagedResult({ rows, total }, query) {
  return {
    data: rows,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export function createWorkshopApplicationService(repository, {
  now = () => new Date(),
  storage = createWorkshopApplicationDocumentStorage(
    process.env.WORKSHOP_DOCUMENT_STORAGE_DIR ?? DEFAULT_WORKSHOP_DOCUMENT_STORAGE_DIR,
  ),
} = {}) {
  async function requireDocumentAccess(actor, applicationId) {
    requireActor(actor);
    const application = await repository.findApplication(applicationId);
    if (!application) throw new HttpError(404, "WORKSHOP_APPLICATION_NOT_FOUND", "Workshop application not found");
    if (application.ownerId === actor.id) return application;
    if (actor.roles?.includes("ADMIN") && await repository.hasRole(actor.id, "ADMIN")) return application;
    throw new HttpError(404, "WORKSHOP_APPLICATION_NOT_FOUND", "Workshop application not found");
  }

  return {
    async create(actor, input) {
      requireApplicant(actor);
      return repository.createPending(actor.id, input);
    },

    async createDraft(actor, input) {
      requireApplicant(actor);
      return repository.createDraft(actor.id, input);
    },

    async updateDraft(actor, id, input) {
      requireApplicant(actor);
      return repository.updateDraft(actor.id, id, input);
    },

    async submitDraft(actor, id) {
      requireApplicant(actor);
      return repository.submitDraft(actor.id, id, now());
    },

    async createAsOwner(actor, input) {
      requireActor(actor);
      if (!actor.roles?.includes("WORKSHOP_OWNER")) {
        throw new HttpError(403, "WORKSHOP_OWNER_REQUIRED", "Workshop owner role required");
      }
      if (!actor.roles.includes("USER")) {
        throw new HttpError(403, "USER_ROLE_REQUIRED", "Customer role required");
      }
      return repository.createPending(actor.id, input, { requireOwner: true });
    },

    async listMine(actor, query) {
      requireActor(actor);
      return pagedResult(await repository.listMine(actor.id, query), query);
    },

    async listAdmin(actor, status, query) {
      await requireAdmin(actor, repository);
      return pagedResult(await repository.listAdmin(status, query), query);
    },

    async getAdmin(actor, id) {
      await requireAdmin(actor, repository);
      const application = await repository.findAdminApplication(id);
      if (!application) throw new HttpError(404, "WORKSHOP_APPLICATION_NOT_FOUND", "Workshop application not found");
      const requiredDocumentTypes = REQUIRED_WORKSHOP_APPLICATION_DOCUMENTS[application.businessType ?? "LEGACY"];
      const uploaded = new Set(application.applicationDocuments.map(({ documentType }) => documentType));
      return {
        ...application,
        requiredDocumentTypes,
        missingDocumentTypes: requiredDocumentTypes.filter((documentType) => !uploaded.has(documentType)),
      };
    },

    async uploadDocument(actor, applicationId, documentType, bytes, contentType) {
      requireActor(actor);
      const application = await repository.findApplication(applicationId);
      if (!application || application.ownerId !== actor.id) {
        throw new HttpError(404, "WORKSHOP_APPLICATION_NOT_FOUND", "Workshop application not found");
      }
      if (!actor.roles?.includes("USER")) throw new HttpError(403, "USER_ROLE_REQUIRED", "Customer role required");
      if (!["DRAFT", "PENDING", "REJECTED"].includes(application.verificationStatus)) {
        throw new HttpError(409, "WORKSHOP_APPLICATION_DOCUMENTS_LOCKED", "Documents cannot be changed after a decision");
      }
      if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > WORKSHOP_APPLICATION_DOCUMENT_MAX_BYTES) {
        throw new HttpError(400, "INVALID_DOCUMENT_SIZE", "Document must be between 1 byte and 10 MB");
      }
      const detectedMime = detectWorkshopApplicationDocumentMime(bytes);
      if (!detectedMime || !documentMimeTypes.has(contentType) || detectedMime !== contentType) {
        throw new HttpError(400, "INVALID_DOCUMENT_TYPE", "Document content must match PDF or DOCX");
      }

      const documentId = randomUUID();
      const storageKey = await storage.put(applicationId, bytes, detectedMime);
      let saved;
      try {
        saved = await repository.saveDocument(actor.id, applicationId, {
          id: documentId,
          documentType,
          storageKey,
          mimeType: detectedMime,
          byteSize: bytes.length,
          checksumSha256: createHash("sha256").update(bytes).digest("hex"),
        });
      } catch (error) {
        try {
          await storage.delete(storageKey);
        } catch (cleanupError) {
          console.error("Failed to clean up a rejected workshop application document", {
            code: cleanupError?.code ?? cleanupError?.name,
          });
        }
        throw error;
      }
      if (saved.previousStorageKey) {
        try {
          await storage.delete(saved.previousStorageKey);
        } catch (error) {
          console.error("Failed to clean up a replaced workshop application document", {
            code: error?.code ?? error?.name,
          });
          throw new HttpError(500, "DOCUMENT_REPLACEMENT_CLEANUP_FAILED", "Document was updated but old private file cleanup failed");
        }
      }
      return saved.data;
    },

    async listDocuments(actor, applicationId) {
      await requireDocumentAccess(actor, applicationId);
      return repository.listDocuments(applicationId);
    },

    async readDocument(actor, applicationId, documentId) {
      await requireDocumentAccess(actor, applicationId);
      const document = await repository.findDocument(applicationId, documentId);
      if (!document) throw new HttpError(404, "WORKSHOP_APPLICATION_DOCUMENT_NOT_FOUND", "Application document not found");
      const bytes = await storage.read(document.storageKey);
      const { storageKey: _storageKey, ...metadata } = document;
      return { metadata, bytes };
    },

    async decide(actor, id, input) {
      await requireAdmin(actor, repository);
      const result = await repository.decide(id, actor.id, input.status, input.note, now());
      if (result.outcome === "NOT_FOUND") throw new HttpError(404, "WORKSHOP_APPLICATION_NOT_FOUND", "Workshop application not found");
      if (result.outcome === "OWNER_NOT_FOUND") throw new HttpError(404, "USER_NOT_FOUND", "Applicant not found");
      if (result.outcome === "DOCUMENTS_INCOMPLETE") {
        throw new HttpError(409, "WORKSHOP_APPLICATION_DOCUMENTS_INCOMPLETE", "Required application documents are missing");
      }
      if (result.outcome !== "UPDATED") {
        throw new HttpError(409, "WORKSHOP_APPLICATION_NOT_PENDING", "Workshop application is no longer pending");
      }
      return result.data;
    },
  };
}
