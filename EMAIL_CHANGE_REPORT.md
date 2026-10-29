# E-posta değiştirme ve doğrulama bağlantısı

Yalnız frontend değiştirildi. Mevcut tasarım, ad/soyad kaydı ve salt okunur telefon alanı korundu. Testlerde gerçek hesap kullanılmadı; auth istekleri mock edildi.

## Bağlanan API'ler

- `POST /auth/email-change/request`: `{email}`, başarılı cevap sonrasında mevcut altı haneli kod alanı açılır. Profilin mevcut e-postası değiştirilmez.
- `POST /auth/email-change/verify`: `{code}`, başarıda gateway refresh cookie'sini siler; mevcut logout akışı bellek token'ını ve auth önbelleğini temizler, diğer sekmelere çıkışı bildirir. Kullanıcı yerelleştirilmiş giriş ekranına yönlendirilir.
- `POST /auth/email-verification/resend`: mevcut `{email}` → `202 {success:true}` sözleşmesi kullanılır. `EMAIL_NOT_VERIFIED` uyarısında yeniden gönderme sunulur; başarı metni hesap varlığını açığa çıkarmaz.

İstenen hata kodları Türkçe/İngilizce mesajlara bağlandı. Kod ve doğrulama e-postası yeniden gönderiminde 60 saniyelik sayaç bulunur. Request rate limit hatası da sayaç başlatır. 401 ve ağ hataları mevcut API istemcisinin refresh/hata yönetimini kullanır; ağ hatalarında POST otomatik tekrarlanmaz.

## Değiştirilen dosyalar

- `src/features/account/profile-details.tsx`
- `src/features/account/profile-email-verification.tsx`
- `src/features/auth/login-form.tsx`
- `src/features/auth/use-resend-cooldown.ts` (yeni)
- `src/lib/api/endpoints/auth.ts`
- `src/lib/api/local-gateway.ts`
- `src/lib/api/config.ts`
- `src/lib/toast/api-error-key.ts`
- `messages/tr.json`
- `messages/en.json`
- `src/lib/api/__tests__/auth.test.ts`
- `src/lib/api/__tests__/local-gateway.test.ts`
- `src/lib/api/__tests__/config.test.ts`
- `e2e/profile-edit.spec.ts`
- `e2e/auth.spec.ts`
- `README.md`
- `EMAIL_CHANGE_REPORT.md` (bu rapor)

## Test sonuçları

- `npm test`: 17 dosya, 177 test başarılı. Request/verify başarıları, istenen hata kodları, 401, ağ hataları, gateway bearer aktarımı, cookie temizliği ve production origin kontrolü dahil.
- `npm run typecheck`: başarılı.
- `npm run build`: başarılı. SWC önbellek izinleri nedeniyle sandbox dışında çalıştırıldı.
- Değiştirilen TypeScript/TSX dosyalarında ESLint: başarılı.
- `npm run lint`: mevcut `src/features/auth/password-reset-form.tsx:56` içindeki `react-hooks/set-state-in-effect` hatası nedeniyle başarısız. Bu dosya değiştirilmedi.
- Masaüstü profil paketi: 8 test başarılı.
- Son ilgili E2E turu: masaüstü ve mobilde toplam 10 test başarılı. Doğrulanmamış e-posta, resend ve sayaç, login/refresh/logout, e-posta değişikliği sonrası yeniden giriş, request rate limit, hatalı kod ve 60 saniye sonra kod yeniden gönderimi dahil.
- Daha geniş ilk E2E denemesinde il seçimi/klavye/portal davranışlarına ilişkin üç test başarısız oldu; bu alanlara müdahale edilmedi. Tüm E2E paketinin geçtiği iddia edilmemektedir.
- Production smoke: `/api/health`, `/giris`, `/en/login`, `/usta-ara?aracTuru=suv`, `/en/find-workshops?uzmanlik=klima` → 200; `/usta/gecersiz-slug` → 404.
- App Router page/layout dosyalarında 400 satır sınırı kontrol edildi; aşım bulunmadı.

## Yayın yapılandırması

Tarayıcı istekleri production dahil `/api/local` üzerinden gider. Gateway yalnız yapılandırılmış `SITE_URL` origin'ini kabul eder; mutation origin kontrolü, HttpOnly/SameSite cookie politikası ve HTTPS'te Secure korunur. `API_INTERNAL_BASE_URL` ve mevcut hedef doğrulaması için `NEXT_PUBLIC_API_BASE_URL` aynı HTTPS `/api/v1` hedefini göstermelidir.

Önceki production mimarisindeki doğrudan API domain'ine ait refresh cookie'leri site domain'ine taşınamaz. Gateway'e geçişte bu eski oturumlar bir kez yeniden giriş gerektirebilir. Yeni login/refresh/logout akışı gateway cookie'sini kullanır.
