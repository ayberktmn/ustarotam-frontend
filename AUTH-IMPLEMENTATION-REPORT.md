# Giriş ve kayıt incelemesi — 25 Ekim 2026

Güncelleme: Bu ilk incelemedeki doğrudan browser → production API bağlantısı engelleri, development için same-origin gateway eklenerek ele alındı. Güncel uygulama ve test sonuçları `LOCAL-AUTH-GATEWAY-REPORT.md` dosyasındadır. Aşağıdaki CORS/SameSite bulguları doğrudan bağlantı için geçerlidir.

Yalnızca yerel frontend değiştirildi. Backend, veritabanı ve sunucu değiştirilmedi; deploy yapılmadı. Canlı API'ye yalnızca OPTIONS ve il listesi GET istekleri gönderildi. Gerçek kullanıcıyla giriş/kayıt/logout testi yapılmadı.

## Bulunan engeller

- Canlı `/auth/login` OPTIONS isteği, `Origin: http://localhost:3000` için Access-Control-Allow-Origin ve Access-Control-Allow-Credentials döndürmedi. Aynı durum il listesinin GET yanıtında da görüldü. Tarayıcı erişimi engellenir.
- Frontend'in her isteğe eklediği X-Request-Id, yerel backend kaynağındaki CORS allowedHeaders listesinde yoktu. Bu başlık kaldırıldı; hata takibi için yerel request ID üretilmeye devam eder.
- Yerel backend kaynağı refresh cookie'sini HttpOnly, production'da Secure, SameSite=Strict ve `/api/v1/auth` path ile gönderiyor. Bu cookie localhost → canlı API arasında cross-site oturum yenilemeye uygun değil. credentials=include bunu değiştirmez. Güvenli kalıcı localhost oturumu yalnızca frontend değişikliğiyle sağlanamaz.
- Backend kayıt sırasında doğrulanmamış kullanıcıya da token ve session veriyor. Frontend bu access token'ı yüklemiyor ve logout ile cookie session'ını iptal etmeye çalışıyor. Cross-site cookie engelinde sunucudaki bu session'ın iptali garanti edilemez. Backend'in kayıt sırasında session üretmemesi gerekir.
- Doğrulama e-postası tekrar gönderme endpoint'i `{success:true}` döndürüyor; frontend daha önce yanlışlıkla data zarfı bekliyordu.

## Uygulanan davranış

Giriş yanıtından sonra `/auth/me` okunur ve emailVerified denetlenir. WORKSHOP_OWNER usta paneline, diğer kullanıcılar hesap paneline gider; güvenli return URL önceliği korunur. Kayıt, doğrulama bilgilendirmesiyle giriş sayfasına yönlendirir.

Access token yalnızca bellekte tutulur; refresh token frontend tarafından okunmaz veya depolanmaz. Oturum açılışta cookie ile restore edilir; korunan isteklerde 401 tek refresh ve tek tekrar ile ele alınır. 403 genel olarak refresh tetiklemez. Refresh başarısızlığında ağ hatasıyla gerçek süre dolması ayrılır. Aynı sekmede single-flight; Web Locks destekleyen tarayıcılarda sekmeler arasında refresh kilidi vardır. Sunucu izin verdiği sürece yenilenir; kaynak kodda varsayılan refresh ömrü 30 gün, yapılandırılabilir aralık 1–90 gündür. Canlı ayar doğrulanmadı.

Logout doğrudan backend'e gider, refresh tetiklemez; hata olsa da bellek temizlenir. Ağ hatasında sunucudaki session'ın iptal edildiği iddia edilmez. SameSite=Strict CSRF riskini azaltır; cross-site cookie'ye geçiş yapılacaksa backend'de açık origin/CSRF politikası tasarlanmalıdır. Güvenlik mekanizmaları gevşetilmedi.

İller sayfa açılışında mevcut katalog hook'u ile yüklenir. Canlı yanıtın success/data/meta yapısında 81 kayıt verdiği doğrulandı. Ayrı arama alanı Türkçe harf duyarlı filtreleme yapar; native dropdown klavye/mobil/kaydırma davranışını korur. Filtre değişince seçilen il kaybolmaz. İl seçimi hiçbir şifre durumuna bağlı değildir. Mevcut hata/tekrar dene davranışı korundu. Ad/soyad uzunluğu, opsiyonel telefon ve şifre üst sınırı backend ile eşleştirildi.

Üretim API adresinin kaynak koddaki sabit fallback'i kaldırıldı. Üretimde eksik ortam değişkeni açık yapılandırma hatası verir. `.env.local` değiştirilmedi.

## Dosyalar

- src/lib/api/client.ts, token-refresh.ts, config.ts, endpoints/auth.ts
- src/features/auth/auth-provider.tsx, login-form.tsx, guest-only.tsx, register-form.tsx
- src/features/auth/province-select.tsx, registration-validation.ts, registration.test.tsx
- src/lib/api/__tests__/auth.test.ts, config.test.ts
- messages/tr.json, messages/en.json

## Doğrulama ve sınırlar

108 otomatik test geçti. Yeni testler giriş/me, hata kodları, resend sözleşmesi, logout hatası, doğrulanmamış kayıt token'ının yüklenmemesi, 81 seçenek render'ı, Türkçe arama ve alan sınırlarını kapsar. Mevcut client/catalog/refresh testleri yenileme, süre dolması, hata ve retry davranışlarını kapsar. Typecheck geçti; lint sıfır hata, mevcut src/lib/workshops.ts kullanılmayan locale uyarısı var.

Build SWC sandbox cache izinleri nedeniyle ilk denemede başarısız oldu; kullanıcı izinleriyle üretim build'i geçti. Yerel üretim çıktısında health, TR giriş/kayıt, EN login ve iki dilde filtreli arama HTTP 200; bilinmeyen profil HTTP 404 döndü. Son rol yönlendirme değişikliğinden sonra kalite kontrolleri yeniden çalıştırıldı.

Gerçek tarayıcıda mobil görünüm, etkileşimli klavye kullanımı, dil değiştirme ve gerçek kullanıcıyla cookie/session döngüsü doğrulanmadı. Canlı CORS ve SameSite engelleri giderilmeden localhost için uçtan uca giriş ve kalıcı oturum tamamlandı sayılamaz. Frontend backend yetkilendirmesinin yerini almaz.
