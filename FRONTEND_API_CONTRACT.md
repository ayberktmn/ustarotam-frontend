# UstaRotam Frontend API Sözleşmesi

Bu belge güncel backend `route/controller/validator/service/repository` ve Prisma şemasından çıkarılmıştır. API kökü: `/api/v1`. Korunan endpointlerde `Authorization: Bearer <accessToken>` zorunludur. Access token yoksa `401 AUTHENTICATION_REQUIRED`, geçersiz/süresi dolmuşsa `401 INVALID_ACCESS_TOKEN`, hesap pasifse `401 ACCOUNT_INACTIVE`, e-posta doğrulanmamışsa `403 EMAIL_NOT_VERIFIED` döner.

## Ortak biçimler ve enumlar

Başarılı tekil yanıt: `{ "success": true, "data": { ... } }`. Sayfalı yanıt: `{ "success": true, "data": [], "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 } }`. `204` yanıtların gövdesi yoktur.

Hata yanıtı:

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed", "details": { "issues": [{ "path": "amount", "message": "Too small" }] } } }
```

Genel gövde hataları: `400 INVALID_JSON`, `413 PAYLOAD_TOO_LARGE`, beklenmeyen hata için `500 INTERNAL_SERVER_ERROR`. Path ID'leri UUID'dir. Tarihler JSON'da ISO-8601 string olarak serileşir.

- `WorkRequestStatus`: `DRAFT | PUBLISHED | CANCELLED | ASSIGNED | IN_PROGRESS | COMPLETED`
- `WorkOfferStatus`: `SUBMITTED | WITHDRAWN | REJECTED | ACCEPTED | EXPIRED`
- `Currency`: `TRY | EUR | USD`
- `ResolutionStatus`: `YES | NO | PARTIAL`
- `ReviewModerationStatus`: `PENDING | PUBLISHED | REJECTED | REMOVED`
- `ServiceVerificationStatus`: `UNVERIFIED | PENDING | VERIFIED | REJECTED`
- Roller: `USER | WORKSHOP_OWNER | ADMIN | SUPER_ADMIN`

Ortak katalog nesnesi `{ "id": "uuid", "name": "Ad", "slug": "ad" }`; `province` ayrıca `code`, `specialty` ayrıca `description` içerebilir. `vehicleBrand` ve `vehicleModel` nullable olabilir.

`WorkRequestDTO`:

```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "vehicleType": { "id": "00000000-0000-4000-8000-000000000002", "name": "Otomobil", "slug": "otomobil" },
  "vehicleBrand": null,
  "vehicleModel": null,
  "specialty": { "id": "00000000-0000-4000-8000-000000000003", "name": "Motor", "slug": "motor", "description": "Motor hizmetleri" },
  "province": { "id": "00000000-0000-4000-8000-000000000004", "code": "34", "name": "İstanbul", "slug": "istanbul" },
  "district": { "id": "00000000-0000-4000-8000-000000000005", "name": "Örnek İlçe", "slug": "ornek-ilce" },
  "address": "Örnek Mahallesi, örnek adres",
  "description": "Araç için motor kontrolü gerekiyor.",
  "status": "PUBLISHED",
  "assignedWorkshopId": null,
  "photoCount": 0,
  "createdAt": "2026-11-01T09:00:00.000Z",
  "updatedAt": "2026-11-01T09:00:00.000Z"
}
```

`WorkOfferDTO`:

```json
{
  "id": "00000000-0000-4000-8000-000000000010",
  "requestId": "00000000-0000-4000-8000-000000000001",
  "amount": 2500,
  "currency": "TRY",
  "description": "Parça ve işçilik dahil teklif.",
  "expiresAt": "2026-11-08T09:00:00.000Z",
  "status": "SUBMITTED",
  "createdAt": "2026-11-01T09:05:00.000Z",
  "updatedAt": "2026-11-01T09:05:00.000Z",
  "request": {
    "id": "00000000-0000-4000-8000-000000000001", "status": "PUBLISHED",
    "vehicleType": { "id": "00000000-0000-4000-8000-000000000002", "name": "Otomobil", "slug": "otomobil" },
    "vehicleBrand": null, "vehicleModel": null,
    "specialty": { "id": "00000000-0000-4000-8000-000000000003", "name": "Motor", "slug": "motor" },
    "province": { "id": "00000000-0000-4000-8000-000000000004", "name": "İstanbul", "slug": "istanbul" },
    "district": { "id": "00000000-0000-4000-8000-000000000005", "name": "Örnek İlçe", "slug": "ornek-ilce" },
    "address": "Örnek Mahallesi, örnek adres"
  }
}
```

## İş talepleri

### `POST /api/v1/work-requests`

- Auth/rol: Bearer; `USER`.
- Request (strict; fazladan alan reddedilir): `vehicleTypeId`, `specialtyId`, `provinceId`, `districtId` UUID zorunlu; `vehicleBrandId`, `vehicleModelId` UUID/null opsiyonel; `address` 5–500; `description` 5–5000 karakter.
- Örnek: `{ "vehicleTypeId":"00000000-0000-4000-8000-000000000002", "vehicleBrandId":null, "vehicleModelId":null, "specialtyId":"00000000-0000-4000-8000-000000000003", "provinceId":"00000000-0000-4000-8000-000000000004", "districtId":"00000000-0000-4000-8000-000000000005", "address":"Örnek Mahallesi, örnek adres", "description":"Araç için motor kontrolü gerekiyor." }`
- `201`: `WorkRequestDTO`; başlangıç durumu `PUBLISHED`.
- Hatalar: `400 VALIDATION_ERROR`, `400 INVALID_WORK_REQUEST_REFERENCE`, `403 USER_ROLE_REQUIRED` ve ortak auth hataları.

### `GET /api/v1/work-requests/mine`

- Auth/rol: Bearer; servis rol kontrolü yapmaz, sonuç `actor.id` ile sahipliğe göre süzülür.
- Query (strict): `status?`, `page?=1`, `limit?=20` (1–100). Validator ayrıca katalog filtrelerini kabul eder; repository bu endpointte yalnız `status/page/limit` uygular.
- `200`: sayfalı `WorkRequestDTO[]`.
- Hatalar: `400 VALIDATION_ERROR` ve ortak auth hataları.

### `GET /api/v1/work-requests`

- Auth/rol: Bearer; `WORKSHOP_OWNER` ve aktif, `VERIFIED` işletme.
- Query (strict): `status?`, `provinceId?`, `districtId?`, `vehicleTypeId?`, `vehicleBrandId?`, `vehicleModelId?`, `specialtyId?`, `page?=1`, `limit?=20`. Not: repository sonuçları daima `PUBLISHED` ile sınırlar; gönderilen `status` uygulanmaz.
- Görünürlük: işletmenin uzmanlığı ve merkez/hizmet bölgesiyle eşleşen talepler.
- `200`: sayfalı `WorkRequestDTO[]`.
- Hatalar: `400 VALIDATION_ERROR`, `403 WORKSHOP_OWNER_REQUIRED`, `403 WORKSHOP_REQUIRED` ve ortak auth hataları.

### `GET /api/v1/work-requests/:id`

- Auth/rol: Bearer. Sahibi olan müşteri görebilir. Doğrulanmış işletme yalnız eşleşen `PUBLISHED` talebi veya kendisine atanmış `ASSIGNED/IN_PROGRESS/COMPLETED` talebi görebilir.
- Request body: yok.
- `200`: `WorkRequestDTO`.
- Hatalar: `400 VALIDATION_ERROR`, `404 WORK_REQUEST_NOT_FOUND` ve ortak auth hataları.

### `PATCH /api/v1/work-requests/:id`

- Auth/rol: Bearer; yalnız müşteri sahibi; talep `DRAFT` veya `PUBLISHED`.
- Request: oluşturma alanlarının en az biri; aynı alan sınırları; strict.
- Örnek: `{ "description": "Güncellenmiş arıza açıklaması." }`
- `200`: `WorkRequestDTO`.
- Hatalar: `400 VALIDATION_ERROR`, `400 INVALID_WORK_REQUEST_REFERENCE`, `404 WORK_REQUEST_NOT_FOUND`, `409 WORK_REQUEST_NOT_EDITABLE` ve ortak auth hataları.

### `POST /api/v1/work-requests/:id/cancel`

- Auth/rol: Bearer; yalnız müşteri sahibi; durum `DRAFT | PUBLISHED | ASSIGNED`.
- Request body: yok. İşlem atomiktir; açık teklifler `REJECTED` olur.
- `200`: durumu `CANCELLED` olan `WorkRequestDTO`.
- Hatalar: `400 VALIDATION_ERROR`, `404 WORK_REQUEST_NOT_FOUND`, `409 WORK_REQUEST_NOT_CANCELLABLE` ve ortak auth hataları.

### `POST /api/v1/work-requests/:id/start`

- Auth/rol: Bearer; `WORKSHOP_OWNER`, aktif/doğrulanmış ve talebe atanmış işletme; talep `ASSIGNED` olmalı.
- Request body: yok. İşlem atomiktir.
- `200`: durumu `IN_PROGRESS` olan `WorkRequestDTO`.
- Hatalar: `400 VALIDATION_ERROR`, `403 WORKSHOP_OWNER_REQUIRED`, `403 WORKSHOP_REQUIRED`, `409 WORK_REQUEST_NOT_STARTABLE` ve ortak auth hataları.

### `POST /api/v1/work-requests/:id/complete`

- Auth/rol: Bearer; yalnız müşteri sahibi; talep `IN_PROGRESS` ve atanmış işletmesi olmalı.
- Request body: yok. İşlem atomik olarak talebi `COMPLETED` yapar ve bağlı `VERIFIED` servis doğrulaması oluşturur.
- `200`: durumu `COMPLETED` olan `WorkRequestDTO`.
- Hatalar: `400 VALIDATION_ERROR`, `404 WORK_REQUEST_NOT_FOUND`, `409 WORK_REQUEST_NOT_COMPLETABLE` ve ortak auth hataları.

Durum geçişleri: oluşturma → `PUBLISHED`; teklif kabulü `PUBLISHED → ASSIGNED`; işletme başlatması `ASSIGNED → IN_PROGRESS`; müşteri tamamlaması `IN_PROGRESS → COMPLETED`; iptal yalnız yukarıda belirtilen durumlardan `CANCELLED`.

## Teklifler

Teklif yazma DTO'su strict ve tam nesnedir: `amount` number/coerce, `>0`, en çok `9999999999.99`; `currency`; `description` 3–5000; `expiresAt` parse edilebilir ve doğrulama anında gelecekte olan tarih.

### `POST /api/v1/work-requests/:id/offers`

- Auth/rol: Bearer; aktif/doğrulanmış işletme sahibi. Talep `PUBLISHED`, işletmenin uzmanlık ve hizmet bölgesiyle eşleşmiş olmalı. İşletme/talep çifti benzersizdir.
- Request örneği: `{ "amount":2500, "currency":"TRY", "description":"Parça ve işçilik dahil teklif.", "expiresAt":"2026-11-08T09:00:00.000Z" }`
- `201`: `WorkOfferDTO`, durum `SUBMITTED`.
- Hatalar: `400 VALIDATION_ERROR`, `400 INVALID_OFFER_EXPIRY`, `403 WORKSHOP_OWNER_REQUIRED`, `409 WORK_REQUEST_NOT_AVAILABLE`, `409 OFFER_ALREADY_EXISTS` ve ortak auth hataları.
- Uyumluluk alias'ı: `POST /api/v1/work-offers/requests/:id` aynı controller/DTO/yanıtı kullanır. Canonical path üstteki `/work-requests/:id/offers` yoludur.

### `GET /api/v1/work-requests/:id/offers`

- Auth/rol: Bearer; yalnız talebin müşteri sahibi.
- Query: `page?=1`, `limit?=20` (1–100), strict.
- `200`: sayfalı `WorkOfferDTO[]`.
- Hatalar: `400 VALIDATION_ERROR`, `404 WORK_REQUEST_NOT_FOUND` ve ortak auth hataları.

### `GET /api/v1/work-offers/mine`

- Auth/rol: Bearer; aktif/doğrulanmış işletme sahibi.
- Query: `page?=1`, `limit?=20`.
- `200`: sayfalı `WorkOfferDTO[]`.
- Hatalar: `400 VALIDATION_ERROR`, `403 WORKSHOP_OWNER_REQUIRED` ve ortak auth hataları.

### `GET /api/v1/work-offers/matching`

- Auth/rol: Bearer; aktif/doğrulanmış işletme sahibi.
- Query: `page?=1`, `limit?=20`.
- `200`: sayfalı eşleşen talep özeti: `{ "id":"uuid", "description":"...", "status":"PUBLISHED", "createdAt":"...", "vehicleType":{}, "vehicleBrand":null, "vehicleModel":null, "specialty":{}, "province":{}, "district":{}, "_count":{ "photos":0 } }`. Bu DTO `WorkRequestDTO` değildir; `address` içermez ve `_count.photos` mevcut mapper'da sabit `0` döner.
- Hatalar: `400 VALIDATION_ERROR`, `403 WORKSHOP_OWNER_REQUIRED` ve ortak auth hataları.

### `GET /api/v1/work-offers/:id`

- Auth/rol: Bearer; teklifin müşteri sahibi veya teklif veren doğrulanmış işletme.
- `200`: `WorkOfferDTO`.
- Hatalar: `400 VALIDATION_ERROR`, `404 WORK_OFFER_NOT_FOUND` ve ortak auth hataları.

### `PATCH /api/v1/work-offers/:id`

- Auth/rol: Bearer; teklif veren doğrulanmış işletme; durum `SUBMITTED`.
- Request: teklif yazma DTO'sunun tamamı zorunlu (partial update değildir).
- `204`: gövde yok.
- Hatalar: `400 VALIDATION_ERROR`, `400 INVALID_OFFER_EXPIRY`, `403 WORKSHOP_OWNER_REQUIRED`, `409 OFFER_NOT_EDITABLE` ve ortak auth hataları.

### `POST /api/v1/work-offers/:id/withdraw`

- Auth/rol: Bearer; teklif veren doğrulanmış işletme; durum `SUBMITTED`.
- Request body: yok. `204`: gövde yok.
- Hatalar: `400 VALIDATION_ERROR`, `403 WORKSHOP_OWNER_REQUIRED`, `409 OFFER_NOT_WITHDRAWABLE` ve ortak auth hataları.

### `POST /api/v1/work-offers/:id/accept`

- Auth/rol: Bearer; yalnız teklifin bağlı olduğu talebin müşteri sahibi.
- Request body: yok. Kabul atomik ve request-row lock ile korunur: teklif `ACCEPTED`, talep `ASSIGNED`, atanmış işletme seçilen işletme olur; süresi geçen açık teklifler `EXPIRED`, kalan açık teklifler `REJECTED` olur.
- `204`: gövde yok.
- Hatalar: `400 VALIDATION_ERROR`, `404 WORK_OFFER_NOT_FOUND`, `409 WORK_REQUEST_NOT_AVAILABLE`, `409 OFFER_NOT_AVAILABLE` ve ortak auth hataları.

### `POST /api/v1/work-offers/:id/reject`

- Auth/rol: Bearer; yalnız teklifin bağlı olduğu talebin müşteri sahibi; teklif `SUBMITTED`, talep `PUBLISHED`.
- Request body: yok. İşlem offer-row lock ile atomiktir. `204`: gövde yok.
- Hatalar: `400 VALIDATION_ERROR`, `409 OFFER_NOT_REJECTABLE` ve ortak auth hataları. Yetkisiz/olmayan/değişmiş teklif ayrımı bu endpointte özellikle yapılmaz.

## Tamamlanmış iş değerlendirmesi

### `POST /api/v1/work-requests/:id/review`

- Auth/rol: Bearer; `USER`, talebin müşteri sahibi. Talep `COMPLETED`, atanmış işletmeli ve bağlı servis doğrulaması `VERIFIED` olmalı. Aynı servis yalnız bir kez değerlendirilebilir. 15 dakikada 10 review yazma isteği sınırı vardır.
- Request (strict): `overallRating` int 1–5; kriter puanları (`workmanshipRating`, `priceRating`, `speedRating`, `trustRating`, `communicationRating`, `resolutionRating`) int 1–5/null opsiyonel; `serviceDescription` 3–1000; `serviceDate` gelecekte olamaz; `amountPaid` 0–9999999999.99/null opsiyonel; `resolutionStatus`; `comment` 3–5000; `specialtyRatings` 1–20 benzersiz `{specialtyId,rating}`. `serviceVerificationId` bu endpointte kabul edilmez. Metinlerde `<`/`>` HTML entity'ye çevrilir.
- Örnek:

```json
{
  "overallRating": 5,
  "workmanshipRating": 5,
  "priceRating": 4,
  "speedRating": 5,
  "trustRating": 5,
  "communicationRating": 5,
  "resolutionRating": 5,
  "serviceDescription": "Motor arızası giderildi.",
  "serviceDate": "2026-10-31T12:00:00.000Z",
  "amountPaid": 2500,
  "resolutionStatus": "YES",
  "comment": "Hizmet zamanında tamamlandı.",
  "specialtyRatings": [{ "specialtyId":"00000000-0000-4000-8000-000000000003", "rating":5 }]
}
```

- `201`: `{success:true,data:ReviewOwnerDTO}`. `ReviewOwnerDTO`, yukarıdaki giriş alanlarına ek olarak `id`, `workshopId`, `authorId`, `verificationStatus`, `moderationStatus`, `moderationNote`, `moderatedAt`, `withdrawnAt`, `createdAt`, `updatedAt`, `author:{firstName,lastName}`, `specialtyRatings:[{rating,specialty:{id,name,slug}}]`, `ownerReply`, `serviceVerificationId` ve `serviceVerification:{id,status,referenceNumber,documentType,documentKey,createdAt}` alanlarını içerir. Bu, repository'nin gerçek create select'idir.
- Hatalar: `400 VALIDATION_ERROR`, `400 INVALID_SPECIALTY`, `403 USER_ROLE_REQUIRED`, `403 OWN_WORKSHOP_REVIEW_FORBIDDEN`, `404 COMPLETED_SERVICE_NOT_FOUND`, `404 WORKSHOP_NOT_FOUND`, `404 SERVICE_VERIFICATION_NOT_FOUND`, `409 SERVICE_ALREADY_REVIEWED`, `429 REVIEW_COOLDOWN_ACTIVE`, `429 REVIEW_RATE_LIMITED` ve ortak auth hataları.

İlgili müşteri endpointleri: `GET /api/v1/reviews/mine?page=1&limit=20` (Bearer, sayfalı `ReviewOwnerDTO[]`), `PATCH /api/v1/reviews/:id` (Bearer, yalnız yazar; create alanlarının `serviceVerificationId` hariç en az biri; `200 ReviewOwnerDTO`), `DELETE /api/v1/reviews/:id` (Bearer, yalnız yazar; `204`). Ek hatalar: `404 REVIEW_NOT_FOUND`, `409 REVIEW_WITHDRAWN`.

## Google OAuth 2.0 / OpenID Connect

### Şu an erişilebilir gerçek davranış

`GET /api/v1/auth/google/start` ve `GET /api/v1/auth/google/callback` route'ları vardır; ikisi de 15 dakikada 10 auth isteği limiti altındadır (`429 AUTH_RATE_LIMITED`). Ancak güncel `createApiV1Router`, `authModule.config.google` nesnesini `createAuthRouter`/controller'a aktarmamaktadır. Bu nedenle:

- `GET /api/v1/auth/google/start?mode=login|register` şu an `503 GOOGLE_OAUTH_NOT_CONFIGURED` üretir.
- `GET /api/v1/auth/google/callback?...` şu an JSON olarak `503 GOOGLE_OAUTH_NOT_CONFIGURED` döner.
- Dolayısıyla frontend redirect, refresh cookie ve Google oturumu mevcut route wiring düzeltilmeden çalışmaz. Bu belge tahmini bir çalışan callback URL ilan etmez.

### Controller/service içinde tanımlı sözleşme (wiring düzeltildiğinde)

#### `GET /api/v1/auth/google/start?mode=login|register`

- Auth: yok. `mode` varsayılan `login`; yalnız `login | register`.
- `302`: Google authorization endpointine yönlendirir; Authorization Code + PKCE S256, `state`, `nonce`, `openid email profile` kullanır.
- `Set-Cookie: ustarotam_google_oauth=...; HttpOnly; SameSite=Lax; Path=/api/v1/auth/google; Max-Age=600`; production'da `Secure`.
- Hatalar: `400 INVALID_OAUTH_MODE`, `503 GOOGLE_OAUTH_NOT_CONFIGURED`, `429 AUTH_RATE_LIMITED`.

#### `GET /api/v1/auth/google/callback?code=...&state=...`

- Auth: yok; bu URL Google Provider callback'idir ve ENV'deki `GOOGLE_OAUTH_CALLBACK_URL` değeridir. Kodda sabit bir host değeri yoktur.
- Signed flow cookie, süre, `state`, PKCE verifier; ID token issuer, audience, `nonce`, `sub`, email ve `email_verified=true` doğrulanır. Kimlik `GOOGLE + sub` ile eşlenir; aynı e-posta ile otomatik hesap birleştirme yapılmaz.
- Başarı: OAuth flow cookie temizlenir; `ustarotam_refresh` HttpOnly, SameSite=Strict, `Path=/api/v1/auth`, production'da Secure session-cookie olarak yazılır; `GOOGLE_OAUTH_FRONTEND_REDIRECT_URL` adresine `303` ile `?status=success` eklenerek gidilir. Token URL'ye konmaz.
- Hata: flow cookie temizlenir; aynı frontend URL'ye `303` ile `?status=error&code=<CODE>` eklenir. Olası kodlar: `OAUTH_CALLBACK_INVALID`, `OAUTH_STATE_INVALID`, `OAUTH_STATE_EXPIRED`, `GOOGLE_TOKEN_EXCHANGE_FAILED`, `GOOGLE_ID_TOKEN_MISSING`, `GOOGLE_ID_TOKEN_INVALID`, `GOOGLE_IDENTITY_INVALID`, `GOOGLE_ACCOUNT_NOT_REGISTERED`, `GOOGLE_ACCOUNT_LINK_REQUIRED`, `GOOGLE_REGISTRATION_UNAVAILABLE`, `INVALID_CREDENTIALS`; bilinmeyen hata `GOOGLE_OAUTH_FAILED`.

Frontend dönüş sayfası başarıdan sonra cookie göndererek `POST /api/v1/auth/refresh` çağırmalıdır (`credentials: "include"`). `200` yanıtı:

```json
{
  "success": true,
  "data": {
    "user": { "id":"00000000-0000-4000-8000-000000000020", "email":"user@example.test", "firstName":"Örnek", "lastName":"Kullanıcı", "phone":null, "phoneVerified":false, "residenceProvince":null, "emailVerified":true, "roles":["USER"] },
    "accessToken": "<access-token>",
    "tokenType": "Bearer"
  }
}
```

Access token JSON ile frontend'e verilir; refresh token yalnız HttpOnly cookie'dedir. ENV isimleri: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_CALLBACK_URL`, `GOOGLE_OAUTH_FRONTEND_REDIRECT_URL`; state imzası mevcut `REFRESH_TOKEN_PEPPER` ile yapılır. Örnek olarak belirtilen `GOOGLE_OAUTH_FRONTEND_REDIRECT_URL=https://ustarotam.com/oauth/google/callback`, controller'ın query parametreleri eklediği frontend dönüş URL'si biçimiyle uyumludur; fakat ilgili frontend sayfasının varlığı bu backend sözleşmesinin konusu değildir.

## Kaynakta doğrulanmış eksikler/uyumsuzluklar

1. Google config route/controller'a aktarılmadığı için OAuth akışı şu an çalışmaz; yukarıdaki tasarlanmış davranış erişilemez.
2. İşletme iş-talebi listesinde `status` query validator tarafından kabul edilse de repository tarafından uygulanmaz ve sonuçlar daima `PUBLISHED` olur.
3. `GET /work-offers/matching` yanıtında fotoğraf sayısı gerçek DB sayımı değil, mapper'da sabit `0` değeridir.
4. Review create yanıtı repository seçimi nedeniyle `serviceVerification.documentKey` alanını sahibine döndürür; frontend bu alanı gerekli kabul etmemelidir.
