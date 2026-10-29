# Usta olarak katıl — frontend raporu

## Hazırlanan ekranlar

- Ana sayfanın mevcut arama kartında `Usta Bul` yanına `Usta Olarak Katıl` eklendi. Mobilde tek sütun, uygun genişlikte iki sütun, masaüstünde yan yana butonlar kullanılır.
- `/usta-ol` ve `/en/join-as-workshop`: işletme bilgileri, konum/hizmet, belgeler ve durum/özet olmak üzere dört adımlı ekran.
- Mevcut renkler, kartlar, tipografi, butonlar ve aranabilir katalog bileşeni kullanıldı. Yeni form için dropdown çarpışma kontrolü açıldı; diğer kullanımların varsayılan davranışı korundu.
- İl değişince ilçe/sanayi sitesi; ilçe değişince sanayi sitesi sıfırlanır. Liste dışındaki değerler kabul edilmez. Ankara/İzmir senaryosu test edildi.
- Şahıs için vergi levhası, ruhsat, oda kayıt belgesi; Limited/Anonim için vergi levhası, ruhsat, ticaret sicil belgesi zorunlu.
- PDF/DOCX uzantısı ve MIME eşleşmesi, boş dosya ve 10 MiB sınırı doğrulanır. Seçilen belgeler açıkça **henüz yüklenmedi** olarak gösterilir.
- Oturumsuz kullanıcı girişe yönlendirilir; dil, dönüş yolu ve query korunur. E-postası doğrulanmamış kullanıcıya doğrulama/resend ve 60 saniye bekleme gösterilir. Doğrulanmış `WORKSHOP_OWNER` mevcut panele yönlendirilir.

## Gerçek bağlantılar ve hazırlanan taşıma katmanı

- İl, ilçe, sanayi sitesi ve uzmanlık listeleri mevcut katalog servisleriyle `/api/local` üzerinden alınır.
- `GET /workshop-applications/mine` authenticated olarak çağrılır. Cevabın sözleşmesi sağlanmadığı için cevap **opaque `unknown`** olarak tutulur; durum, ID veya mevcut başvurunun yokluğu çıkarılmaz.
- `GET /workshop-applications/{id}/documents` için authenticated okuma servisi ve gateway geçişi hazırdır; formda doğrulanmış ID olmadığı için otomatik çağrılmaz.
- `POST /workshop-applications/{id}/documents/{documentType}` için raw binary servis/gateway desteği hazırdır. Caller gerçek ID'yi sağlamalıdır. PDF/DOCX Content-Type korunur; dosya JSON'a veya multipart'a çevrilmez. Gateway de 10 MiB sınırını uygular.
- `POST /workshop-applications` gateway allowlist'ine alındı; bilinmeyen JSON payload'ını üreten bir frontend servis veya UI gönderimi eklenmedi.
- Bearer token yalnız izinli endpoint'lere taşınır. Başvuru/belge isteklerinde refresh cookie upstream'e iletilmez. Mevcut origin, CSRF, cookie ve auth-refresh güvenlik kontrolleri korunur.

Bu bağlantıların taşıma davranışı mock testleriyle doğrulandı. Gerçek kullanıcı adına başvuru oluşturulmadı veya belge yüklenmedi.

## Eksik API sözleşmesi nedeniyle kapalı tutulan işlemler

Yerel backend'in güncel olmadığı kullanıcı tarafından belirtildi; yeni akışta referans alınmadı. Kontrol edilen herkese açık OpenAPI/Swagger JSON adresleri 404 döndü. Verilen endpoint adları, belge türleri ve limitler dışında production request/response şeması doğrulanamadı.

Tamamlama için gerekenler:

1. `POST /workshop-applications` request alanları: işletme türü enum'u/alanı, adres/telefon alanları, konum ve uzmanlık alanları, zorunlu/nullable değerler.
2. Oluşturma cevabı: gerçek başvuru ID'sinin bulunduğu alan ve response envelope.
3. `/mine` cevabı: başvuru yokken dönüş biçimi, tekil/liste yapısı, gerçek durum alanı ve enum'ları, onay/red gerekçesi.
4. Belge listesi/yükleme cevapları: dosyanın gerçekten saklandığını ve gerekiyorsa güvenlik kontrolünü geçtiğini gösteren alanlar; gerekli ek header ve dosya adı sözleşmesi; mükerrer yükleme davranışı.

Bu nedenle **başvuru gönderimi kapalıdır**. Mevcut başvuru olmadığı varsayılmaz, mükerrer başvuru üretilmez. Gerçek başvuru oluşturma, formdan belge yükleme/ilerleme ve `PENDING`/onay/red gösterimi henüz devrede değildir. Dördüncü adım yerel bilgilerin özetini ve gönderilmediği bilgisini gösterir; sahte onay veya incelemeye alındı mesajı üretilmez.

## Test sonuçları

- `npm test`: **19 dosya / 200 test başarılı**. Yerel validasyonlar, doğru belge türleri, 10 MiB sınırı, MIME, raw byte aktarımı, bearer/cookie ayrımı, upload hata cevapları ve mevcut auth testleri dahil.
- `npm run typecheck`: başarılı.
- Yeni/değişen TypeScript dosyalarında ESLint: başarılı.
- Genel `npm run lint`: değiştirilmemiş `src/features/auth/password-reset-form.tsx:56` içindeki mevcut `react-hooks/set-state-in-effect` hatası nedeniyle başarısız.
- Yeni sayfa Playwright: **7 masaüstü + 7 mobil test başarılı**. Hero bağlantısı, oturumsuz dönüş adresi, zorunlu alanlar, il/ilçe bağımlılığı, dosya validasyonu, bilinmeyen sözleşmede gönderimin engellenmesi, `/mine` hatası, e-posta doğrulama ve owner yönlendirmesi.
- Regresyon Playwright: **8 test başarılı**; masaüstü/mobil login, resend, refresh/logout, profil kaydı, e-posta değişikliği ve yeniden giriş.
- `npm run build`: başarılı; SWC önbellek erişimi için sandbox dışında çalıştırıldı.
- Production smoke: `/api/health`, `/usta-ol`, `/en/join-as-workshop`, `/giris`, `/usta-ara?aracTuru=suv`, `/en/find-workshops?uzmanlik=klima` → 200; `/usta/gecersiz-slug` → 404.
- Masaüstü/mobil ekran görüntüleri incelendi; yatay taşma kontrolleri geçti. Page/layout 400 satır sınırında aşım bulunmadı.

## Dosyalar

Yeni:

- `src/app/[locale]/(site)/usta-ol/page.tsx`
- `src/features/workshop-application/workshop-application.tsx`
- `src/features/workshop-application/application-location.tsx`
- `src/features/workshop-application/application-documents.tsx`
- `src/lib/workshop-application.ts`
- `src/lib/api/endpoints/workshop-applications.ts`
- `src/lib/__tests__/workshop-application.test.ts`
- `src/lib/api/__tests__/workshop-applications.test.ts`
- `e2e/workshop-application.spec.ts`
- `WORKSHOP_APPLICATION_REPORT.md`

Güncellenen:

- `src/features/search/home-search-form.tsx`
- `src/features/auth/province-select.tsx`
- `src/i18n/routing.ts`
- `src/lib/api/index.ts`
- `src/lib/api/client.ts`
- `src/lib/api/local-gateway.ts`
- `src/lib/api/__tests__/local-gateway.test.ts`
- `messages/tr.json`
- `messages/en.json`
