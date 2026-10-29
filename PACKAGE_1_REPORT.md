# Usta Rotam — Paket 1

## Doğrulanan iş talebi sözleşmesi

- Müşteri listesi: `GET /api/v1/work-requests/mine`.
- Oluşturma: `POST /api/v1/work-requests` ve body’de `vehicleTypeId`, nullable `vehicleBrandId`, nullable `vehicleModelId`, `specialtyId`, `provinceId`, `districtId`, `address`, `description`.
- Yeni kayıt backend repository tarafından `PUBLISHED` oluşturulur; create/update body’sinde `status` kabul edilmez.
- Güncelleme: `PATCH /api/v1/work-requests/:id`.
- İptal: body’siz `POST /api/v1/work-requests/:id/cancel`.
- Response zarfı `{ success: true, data }`; müşteri detail kaydı ilişkisel araç, uzmanlık ve konum nesneleri ile `photoCount` döndürür.

## Başarılı kayıt sonrası yanlış hata mesajı

Doğrulanan HTTP 201 / `{ success: true, data }` yanıtında API client raw response zarfını doğrular. Work request servisi zarfın `data` alanını yalnız bir kez açar; çift `data` erişimi yoktur.

Önceki uygulamada cache yazma, toast ve dinamik router geçişi TanStack Query `onSuccess` callback’i içindeydi. `mutateAsync` bu callback’i beklediğinden callback içindeki bir hata başarılı mutation promise’ini reddedebilir; form catch’i de bu reddi genel “Talep kaydedilemedi” mesajına dönüştürürdü. Başarı sonrası yan etkiler mutation sonucundan ayrıldı. API mutation başarılıysa:

1. Liste cache’i asenkron yenilenir ve detail cache’i en iyi çabayla güncellenir.
2. Başarı bildirimi gösterilir.
3. Talep detayına yönlendirme denenir; yönlendirme hata verirse taleplerim sayfasına geçiş denenir.
4. Bu yan etkilerdeki bir hata, kaydedilmiş talebi başarısız göstermez.

Formda ref tabanlı gönderim kilidi eklendi; React state güncellenmeden gelen ikinci tıklama aynı create mutation’ı başlatamaz.

## Araç modeli seçimi

`GET /vehicles/models` sadece `brandId` ve `typeId` UUID filtrelerini kabul eder, pagination uygulamaz ve tüm eşleşen modelleri döndürür. Frontend zaten pagination parametresi göndermiyordu. Katalogda olmayan model için formdaki “Modelim listede yok” / “My model is not listed” seçeneği `vehicleModelId: null` gönderir. Model adı veya sahte UUID gönderilmez; açıklama alanında modelin yazılmasını önerir.

## Test ve doğrulama

- HTTP 201 başarı zarfının tek sefer açılması ve gerçek API hata zarfının reddedilmesi için API mock testleri.
- Başarı toast/detail yönlendirmesi ile yönlendirme hatasında liste fallback’i için testler.
- Gateway’de body’nin upstream’e değiştirilmeden iletilmesi için test.
- Nullable “model listede yok” seçeneği için test.
- `npm.cmd run typecheck`: başarılı.
- `npm.cmd run lint`: 0 hata; yalnız değiştirilmemiş backend referans/handoff dosyalarında 5 unused-vars uyarısı.
- `npm.cmd test`: 28 dosyada 279 test başarılı.
- `npm.cmd run build`: başarılı; 58 statik sayfa üretildi.

Backend referanslarına, veritabanına veya production API’ye yazma yapılmadı. Git reset, restore, clean, commit, push veya deploy yapılmadı.
