# UstaRotam Backend API Contract

Base URL: `https://api.ustarotam.com/api/v1`

This document is derived from the backend validators, controllers, services, repositories, and Prisma schema. It describes the current API; values are not inferred. All protected endpoints require `Authorization: Bearer <accessToken>`. Authenticated workshop/application routes also require a verified, active account unless the route's middleware configuration explicitly says otherwise.

## Common envelopes

Successful JSON responses use:

```json
{ "success": true, "data": {} }
```

Paged responses use:

```json
{
  "success": true,
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

Errors use HTTP status plus:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed", "details": { "issues": [] } }
}
```

Validation errors are `400`; missing/invalid access tokens are `401`; insufficient role is `403`; missing resources are generally `404`; state/conflict errors are `409`; rate limits are `429`; an oversized raw document is `413`.

## Workshop application input

`POST /workshop-applications` (USER role, verified active account) and `POST /workshops` (WORKSHOP_OWNER + USER role) accept the same strict JSON body:

```json
{
  "name": "Örnek Oto Servis",
  "businessType": "SAHIS",
  "description": "Servis açıklaması",
  "provinceId": "uuid",
  "districtId": "uuid",
  "industrialSiteId": "uuid",
  "address": "Adres, en az 5 karakter",
  "phone": "+905xxxxxxxxx",
  "email": "servis@example.com",
  "website": "https://example.com",
  "postalCode": "34000",
  "latitude": 41.01,
  "longitude": 28.97,
  "vehicleTypeIds": ["uuid"],
  "brandIds": ["uuid"],
  "specialtyIds": ["uuid"]
}
```

Required: `name`, `provinceId`, `districtId`, `address`, `phone`. Defaults: `vehicleTypeIds`, `brandIds`, `specialtyIds` to `[]`. Nullable/optional: `description`, `industrialSiteId`, `email`, `website`, `postalCode`, `latitude`, `longitude`; `businessType` is optional. `businessType`: `SAHIS | LIMITED | ANONIM`. IDs must be UUIDs; unknown or mismatched location relations return `400 INVALID_LOCATION_RELATION`. Unknown JSON properties are rejected.

Create response: `201` with `{success:true,data:<workshop>}`. The application ID is `data.id` (UUID), not a separate `applicationId` field. The returned object includes `id`, `ownerId`, workshop fields, `verificationStatus`, `verificationNote`, `verifiedAt`, `createdAt`, `updatedAt`, `province`, `district`, `industrialSite`, and arrays represented as `{vehicleType}`, `{brand}`, and `{specialty}` objects. Initial status is `PENDING`.

At most one `PENDING` application exists per owner. A duplicate returns `409 WORKSHOP_APPLICATION_PENDING`. Status values are `DRAFT | PENDING | VERIFIED | REJECTED | SUSPENDED`; `APPROVED` is not a backend value. Admin approval is requested with status `VERIFIED`.

The legacy `POST /workshop-applications` contract above remains unchanged and immediately creates a `PENDING` application.

## Draft application flow

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/workshop-applications/drafts` | USER | Strict partial create body (fields from the workshop input); `{}` is allowed | `201 {success,data:<DRAFT>}`; if the user's draft already exists, `200` with that draft |
| GET | `/workshop-applications/mine?status=DRAFT` | authenticated | Existing pagination plus optional `DRAFT` status | `200 {success,data:[],meta}` |
| GET | `/workshop-applications/` | ADMIN | Same query as admin list; status defaults to `PENDING` | `200 {success,data:[],meta}`; never lists DRAFT in the review queue |
| PATCH | `/workshop-applications/:id` | USER + owner | Non-empty strict partial workshop input | `200 {success,data:<DRAFT>}` |
| POST | `/workshop-applications/:id/submit` | USER + owner | No body | `200 {success,data:<PENDING>}` |

One DRAFT is kept per user. Repeating draft creation is idempotent and returns the existing draft without applying the new request body; update it with `PATCH /:id`. PATCH and submit on another user's record return `404 WORKSHOP_APPLICATION_NOT_FOUND`; updates and repeat submissions after DRAFT state return `409 WORKSHOP_APPLICATION_NOT_DRAFT`.

Submit requires `name`, `provinceId`, `districtId`, `address`, `phone`, and `businessType` (`SAHIS | LIMITED | ANONIM`). District/province and optional industrial-site relationships, and each selected vehicle type, brand, and specialty are checked again at submission. Missing required fields return `400 WORKSHOP_APPLICATION_INCOMPLETE` with `details.missingFields`; invalid business type returns `400 INVALID_BUSINESS_TYPE`; invalid location or service relationships return `400 INVALID_LOCATION_RELATION` or `400 INVALID_SERVICE_RELATION`. Missing type-specific documents return `409 WORKSHOP_APPLICATION_DOCUMENTS_INCOMPLETE` with `details.missingDocumentTypes`. A concurrent or existing PENDING application returns `409 WORKSHOP_APPLICATION_PENDING`. Submission is single-use; only PENDING applications can be decided by an admin.

Document upload, list, and download endpoints retain their existing formats and ownership checks. They also work while the application is DRAFT. DRAFT documents remain private to the owner and administrators, are stored using the existing private storage, and are locked after submit except for existing PENDING/REJECTED handling.

## Applicant and admin application endpoints

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/workshop-applications` | USER | JSON above | `201 {success,data}` |
| GET | `/workshop-applications/mine?page=1&limit=20&status=PENDING` | authenticated | `page` 1.., `limit` 1..100, optional status | `200 {success,data:[],meta}` |
| POST | `/workshop-applications/:id/documents/:documentType` | owner + USER | raw binary, exact `Content-Type` | `201 {success,data:<document metadata>}` |
| GET | `/workshop-applications/:id/documents` | owner or ADMIN | none | `200 {success,data:[]}`; `Cache-Control: private, no-store` |
| GET | `/workshop-applications/:id/documents/:documentId` | owner or ADMIN | none | raw binary download, `200` |
| GET | `/admin/workshop-applications?status=PENDING&page=1&limit=20` | ADMIN | status required/default `PENDING` | `200 {success,data:[],meta}` |
| PATCH | `/admin/workshop-applications` | ADMIN | collection decision below | `200 {success,data:<workshop>}` |
| GET | `/admin/workshop-applications/:id/documents` | ADMIN | none | same document list |
| GET | `/admin/workshop-applications/:id/documents/:documentId` | ADMIN | none | same binary download |

`documentType`: `TAX_CERTIFICATE | WORKPLACE_LICENSE | CHAMBER_REGISTRATION | TRADE_REGISTRY_DOCUMENT`.

Upload is raw, not multipart: `Content-Type: application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`. Limit is 10 MiB (`10 * 1024 * 1024` bytes), and the binary signature/container is checked. Invalid/mismatched content returns `400 INVALID_DOCUMENT_TYPE`; empty/oversized content returns `400 INVALID_DOCUMENT_SIZE` or `413 PAYLOAD_TOO_LARGE`. Documents can be replaced while application status is `DRAFT`, `PENDING`, or `REJECTED`; otherwise `409 WORKSHOP_APPLICATION_DOCUMENTS_LOCKED`.

Document list item example:

```json
{
  "id": "uuid",
  "documentType": "TAX_CERTIFICATE",
  "mimeType": "application/pdf",
  "byteSize": 12345,
  "checksumSha256": "64-char-hex",
  "createdAt": "2026-10-26T00:00:00.000Z",
  "updatedAt": "2026-10-26T00:00:00.000Z"
}
```

Download uses `Content-Type: application/octet-stream`, `Content-Disposition: attachment; filename="application-document-<documentId>.<pdf|docx>"`, `Content-Length`, `Cache-Control: private, no-store`, and `X-Content-Type-Options: nosniff`. An owner requesting another user's application/document receives `404 WORKSHOP_APPLICATION_NOT_FOUND` (non-enumerating access control).

Decision request:

```json
{ "applicationId": "uuid", "status": "VERIFIED", "note": "Belgeler incelendi" }
```

For `VERIFIED`, `note` is optional. For `REJECTED`, `note` is required and 3..500 trimmed characters. On `VERIFIED`, required documents are: `SAHIS`: tax, workplace, chamber; `LIMITED`/`ANONIM`: tax, workplace, trade registry. Missing documents return `409 WORKSHOP_APPLICATION_DOCUMENTS_INCOMPLETE`; a successful verification grants `WORKSHOP_OWNER` to the applicant. Other decision errors include `404 WORKSHOP_APPLICATION_NOT_FOUND`, `409 WORKSHOP_APPLICATION_NOT_PENDING`, and `403 ADMIN_REQUIRED`.

## Workshops mine and ownership

`GET /workshops/mine` is an alias to the application's paged list and returns the same `{success,data,meta}` shape and query (`page`, `limit`, optional `status`).

`PATCH /workshops/:id` accepts a strict non-empty subset of the create fields, excluding `businessType`: `name`, `description`, `provinceId`, `districtId`, `industrialSiteId`, `address`, `phone`, `email`, `website`, `postalCode`, `latitude`, `longitude`, `vehicleTypeIds`, `brandIds`, `specialtyIds`. The management service enforces the authenticated owner can update only their own workshop; the route requires authentication.

## Email change

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/email-change/request` | `{ "email": "new@example.com" }` | `202 {success:true}` |
| POST | `/auth/email-change/verify` | `{ "code": "123456" }` | `200 {success:true,data:<public user>}` |
| POST | `/auth/email-verification/resend` | `{ "email": "user@example.com" }` | `202 {success:true}` |

The first two require a Bearer token; all are auth-rate-limited. Email-change codes are exactly six digits, expire after 10 minutes, and allow 5 attempts; a new request is blocked for 60 seconds (`429 EMAIL_CHANGE_RATE_LIMITED`). Typical errors are `400 EMAIL_UNCHANGED`, `400 INVALID_EMAIL_CHANGE_CODE`, `409 EMAIL_CHANGE_UNAVAILABLE`, and `503 EMAIL_DELIVERY_FAILED`. SMTP credentials are read from server configuration and are never part of API responses.

## Auth notes

Access token format is `Authorization: Bearer <token>`. Refresh uses the `ustarotam_refresh` HttpOnly, Secure (production), SameSite=Strict cookie at `/api/v1/auth`; `POST /auth/refresh` returns a new access token/session envelope. Never send access or refresh tokens in logs or issue examples.
