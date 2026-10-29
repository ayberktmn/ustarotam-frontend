# Localhost auth bağlantısı — 25 Ekim 2026

Güncel auth sayfaları ve tamamlanan tarayıcı testleri için `AUTH-COMPLETION-REPORT.md` dosyasına bakın. Bu belge önceki proxy uygulama aşamasını kaydeder.

## Uygulanan model

Development ortamında browser API base URL otomatik olarak `/api/local` olur. `.env.local` değiştirilmedi. `SITE_URL=http://localhost:3000` beklenen yerel origin'i belirler. Next.js sunucusu, `API_INTERNAL_BASE_URL` üzerindeki HTTPS backend'e bağlanır. Hedef, `NEXT_PUBLIC_API_BASE_URL` ile aynı origin ve `/api/v1` path olmak zorundadır. URL hiçbir zaman request body/query/header içinden alınmaz. Production backend'in CORS veya cookie ayarı değiştirilmedi.

Tam bir sunucu token kasası yerine mevcut backend sözleşmesiyle uyumlu, sınırlı bir same-origin gateway kullanıldı. Access token, mevcut uygulamada yalnızca JavaScript belleğinde kalır. Refresh token response body'ye eklenmez; JavaScript, localStorage veya sessionStorage'a verilmez.

## Cookie sınırı

Backend kaynağı: `ustarotam_refresh`, HttpOnly, Secure (production), SameSite=Strict, Path=/api/v1/auth, Domain yok; Max-Age sunucu ayarından gelir. Login, register ve refresh cookie üretir; logout aynı cookie'yi geçmiş Expires ile temizler.

Gateway yalnızca bu isimdeki cookie'yi kabul eder. HttpOnly/Secure/Strict, beklenen Path ve Domain yokluğu doğrulanır. Beklenmeyen veya yinelenen cookie politikası kapalı şekilde hata verir. Başka upstream cookie'leri aktarılmaz. Başarılı login/register/refresh yanıtında cookie eksikse 502 döner. Max-Age/Expires korunur; sunucunun süresi uzatılmaz. 90 günden uzun süre reddedilir (backend konfigürasyonunun üst sınırı).

Yerel karşılığı `usta_rotam_dev_refresh`, HttpOnly, SameSite=Strict, host-only ve Path=/api/local/auth olur. HTTP loopback üzerinde yalnızca development'ta Secure kaldırılır; HTTPS loopback kullanıldığında korunur. Bu, ağdaki başka hostlar için uygulanmaz. Yerel cookie yalnızca refresh/logout isteklerinde backend cookie adına çevrilip gönderilir; diğer tarayıcı cookie'leri ve gelen Cookie başlığı topluca aktarılmaz.

## Oturum akışı

1. Login → gateway → HTTPS backend. Access token belleğe; refresh cookie browser cookie deposuna gider.
2. `/auth/me`, bellekteki bearer ile gateway üzerinden okunur; backend'in profil/rol ve doğrulama bilgisi kullanılır.
3. Yenileme/yeni sekme sonrası bellek boşken bootstrap, aynı HttpOnly cookie ile refresh yapar; yeni access token alıp `/me` yükler. Cookie rotasyonu her yanıtta aynı yerel scope'a uygulanır.
4. 401 durumunda mevcut single-flight mekanizması bir kez refresh ve bir kez request tekrarı yapar. Geçersiz refresh oturumu sonlandırır; ağ hatası ayrı ele alınır.
5. Refresh ve logout, desteklenen tarayıcılarda aynı Web Locks kilidini kullanır. Böylece sekmeler arası token rotasyonu ile logout sıralanır. Web Locks olmayan tarayıcılarda sekmeler arası kilit yoktur; aynı sekmede refresh single-flight korunur. Sunucunun yarış durumunda session family iptali güvenli şekilde yeniden giriş gerektirebilir.
6. Logout backend'e mevcut refresh cookie'yi gönderir; backend'in silme cookie'si aynı yerel Path/isimle uygulanır. Bellekteki access token temizlenir. Ağ hatasında sunucudaki session'ın iptal edildiği varsayılmaz.

Backend kayıt sırasında doğrulanmamış kullanıcıya session üretmeye devam ediyor. Önceki frontend düzeltmesi bu access token'ı kurmaz ve logout çağırır. Same-origin cookie katmanı bu logout'un yeni cookie'yi backend'e iletmesini mümkün kılar. Backend'de doğrulanmamış kullanıcıya kayıt sırasında session verilmemesi yine daha iyi bir sözleşmedir; bu görevde backend değiştirilmedi.

## Güvenlik kontrolleri

- Route sadece NODE_ENV=development'ta açık; production'da upstream'e gitmeden 404 döner. Production browser API seçimi değişmez. `npm run start` bu localhost istisnasını etkinleştirmez; geliştirme için `npm run dev` kullanılır.
- SITE_URL ve request URL loopback olmalı; origin ve Host tam eşleşmelidir. Ağ IP'si/başka Host kabul edilmez.
- POST için Origin zorunlu ve tam eşleşmeli. Farklı Origin, cross-site/same-site Sec-Fetch-Site reddedilir. GET üzerinde farklı Origin de reddedilir. CORS izin başlığı üretilmez.
- İzinli yollar/methodlar açık listeyle sınırlıdır: auth login/register/refresh/logout/resend/me ve mevcut public katalog/workshop GET yolları. Admin ve diğer yazma işlemleri bu gateway'e eklenmedi.
- Yol segmentleri doğrulanır; traversal, keyfi URL ve redirect takibi reddedilir. Upstream fetch timeout 10 saniye; JSON body sınırı 16 KiB.
- Authorization yalnızca `/auth/me` için aktarılır. Origin, Host, X-Forwarded-* ve keyfi browser header'ları backend'e taşınmaz.
- Response cookie, Location, CORS veya server header'ları körlemesine geçirilmez. Yanıtlar no-store ve nosniff kullanır. Token/cookie değerleri loglanmaz.

## Değişen dosyalar

- `src/app/api/local/[...path]/route.ts`: Node route.
- `src/lib/api/local-gateway.ts`: izin listesi, origin/body/header kontrolü, upstream bağlantısı, cookie dönüşümü.
- `src/lib/api/config.ts`: yalnızca development'ta same-origin browser base URL.
- `src/lib/api/token-refresh.ts`, `endpoints/auth.ts`: ortak refresh/logout kilidi.
- `src/lib/api/__tests__/local-gateway.test.ts`, `config.test.ts`: gateway güvenlik ve auth sözleşmesi testleri.

Önceki AGENTS.md'deki yeni API route eklememe kuralı, kullanıcının bu görevde açıkça istediği Next.js proxy uygulaması kapsamında geçersiz kılındı.

## Kontroller

- 120 otomatik test geçti (14 dosya). Bunların 12'si yeni gateway testidir: login, bearer ile me, cookie rotasyonu, yeniden yükleme/yeni sekme için cookie ile yeni request'ler, logout silmesi, doğrulanmamış kullanıcı ve geçersiz refresh hatası, 81 il, production kapatma, CSRF/Host/yol/redirect/header/cookie/body sınırları. Önceki kayıt validasyonu ve arama testleri de geçti.
- Typecheck geçti. Lint sıfır hata; mevcut `src/lib/workshops.ts` kullanılmayan locale uyarısı var.
- Production build geçti. İlk sandbox SWC cache engeli nedeniyle build normal kullanıcı izinleriyle çalıştırıldı.
- Mevcut localhost:3000 development sunucusu üzerinden gerçek `/api/local/locations/provinces`: HTTP 200 ve 81 il; Set-Cookie yok.
- Yerel farklı-origin login isteği: HTTP 403; izin verilmeyen `/api/local/admin`: HTTP 404; kayıt sayfası HTTP 200. Bunlar upstream auth işlemi yapmayan kontrollerdir.

Gerçek kullanıcı hesabıyla login yapılmadı; test hesabı oluşturulmadı ve gerçek kullanıcı verisi değiştirilmedi. Login/refresh/logout ve sekme/yenileme cookie döngüsü mock otomatik testlerle doğrulandı; gerçek tarayıcıda gerçek hesapla uçtan uca test yapılmadı. Production backend/veritabanı/Nginx/DNS değiştirilmedi, deploy yapılmadı. Mevcut backend sözleşmesi bu development same-origin çözümünü destekliyor.
