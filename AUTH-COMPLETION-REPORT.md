# Giriş, kayıt, e-posta doğrulama ve oturum — 25 Ekim 2026

Bu aşamada yalnızca auth sayfaları, auth bağımlılıkları ve test altyapısı değiştirildi. Ana sayfa veya paneller geliştirilmedi. `.env.local`, production backend, PostgreSQL, Nginx ve DNS değiştirilmedi. Deploy yapılmadı.

## İl combobox'ı

`ProvinceSelect`, mevcut Radix Popover ile tek bir özel combobox olarak yeniden yazıldı; runtime bağımlılığı eklenmedi. Kapalı durumda yalnızca seçim alanı görünür. Arama açılır listenin üstündedir. Türkçe büyük/küçük harflerle filtreleme, aramayı temizleme, seçili ilin işareti, yeniden seçim, seçim sonrası kapanma, Escape ve dışarı tıklama desteği vardır.

Ok tuşları aktif seçeneği değiştirir, Enter seçer. `aria-activedescendant`, `aria-controls`, `aria-expanded`, `aria-selected`, combobox/listbox/option rolleri ve hata açıklaması kullanılır. Tab/Shift+Tab form akışına döner; arama doluyken temizleme butonuna da klavyeyle ulaşılır. Portal formun overflow sınırından çıkar; varsayılan aşağı açılış, çarpışma halinde yukarı açılış, ekranla sınırlı yükseklik, sabit üst arama ve ayrı kaydırılan liste uygulanır. Turuncu brand token'ı, yuvarlatılmış kenarlar ve mevcut gölge kullanılır.

Liste açılışta mevcut API hook'u üzerinden yüklenir. İlin gerçek API ID'si korunur ve kayıt isteğinde gönderilir; şifre veya diğer alanlarla bir doldurma sırası ilişkisi yoktur. Seçilen ID'nin yüklenen katalogda bulunduğu da doğrulanır. İl yükleme hatası ve tekrar deneme korunur.

## Kayıt

Alan sırası korundu. Ad/soyad 2–100 karakter; e-posta Zod email ve 320 karakter sınırı; opsiyonel telefon 7–32 karakter; şifre 12–128 karakter ve backend'in büyük harf/küçük harf/rakam/sembol kurallarıyla doğrulanır. Backend gibi boşluk da sembol sayılır. Şifre tekrarı, gerçek il seçimi ve koşullar/gizlilik onayı zorunludur. Hatalar ilgili alanların ARIA açıklamalarına bağlanır ve alan düzenlenince temizlenir.

Senkron ref kilidi aynı karede iki submit'i engeller; request süresince fieldset devre dışıdır. Geçersiz form API isteği göndermez. Backend hata mesajları ham olarak gösterilmez; koddan çevrilmiş hata metni hem formda hem mevcut bildirim sisteminde görünür.

Başarılı kayıt sonrası sayfada kalıcı doğrulama bilgisi, kayıt e-postası, tekrar gönderme ve giriş bağlantısı gösterilir. Doğrulanmamış kayıt access token'ı belleğe yerleştirilmez. Backend'in kayıt sırasında oluşturduğu cookie session'ı logout ile kapatılır.

Kayıt tamamlanıp logout başarısız olursa kullanıcı yeniden kayıt yapmaya yönlendirilmez: ayrı cleanup uyarısı ve yalnızca logout'u tekrarlayan buton gösterilir. Backend, hesabı kaydettikten sonra EMAIL_DELIVERY_FAILED döndürürse de yeni kayıt isteği yerine doğrulama e-postasını tekrar gönderme sunulur. Bu iki durum tarayıcı testlerinde doğrulandı.

## Giriş ve oturum

Giriş sonrası `/auth/me` yüklenip doğrulanmış profil kullanılır. WORKSHOP_OWNER usta paneline, diğer roller hesap paneline yönlendirilir; backend'in vermediği yetki türetilmez. Mevcut güvenli returnUrl davranışı korunur. Yanlış şifre, doğrulanmamış e-posta, ağ/sunucu hataları çevrilmiş metinlerle gösterilir. Doğrulama e-postası tekrar gönderme gerçek endpoint'i kullanır; eşzamanlı tıklamalar engellenir.

Access token yalnızca bellektedir; HttpOnly refresh cookie JavaScript'e veya web storage'a açılmaz. Sayfa yeniden yüklendiğinde/yeni sekmede refresh → me ile restore yapılır. Oturum süresi backend tarafından belirlenir; süresiz oturum sözü verilmez.

Login/register/refresh/logout cookie işlemleri aynı Web Locks kilidiyle sıralanır. Web Locks yoksa aynı sekmede Promise kuyruğu kullanılır; tarayıcılar arası/sekme arası kilit desteği Web Locks'a bağlıdır. Login/register/logout başlamadan önce eski bootstrap sorgusu iptal edilir; eski profil sonucunun yeni oturumu ezmesi önlenir. Logout access token'ı kilit içinde temizler; diğer açık sekmelere BroadcastChannel ile yalnızca `logout` sinyali iletilir, token taşınmaz. BroadcastChannel yoksa diğer sekmenin durumu sonraki sunucu kontrolünde güncellenir.

## E-posta doğrulama

Doğrulama sayfası yalnızca açıldı diye başarı iddia etmez. Token yoksa e-postadaki bağlantıyı açma ve giriş açıklaması görünür. `?token=...` içeren frontend bağlantısı varsa kullanıcı açıkça onay verir; POST `/auth/email-verification/confirm` 204 döndürdüğünde başarı gösterilir. Geçersiz/süresi dolmuş bağlantılar için özel mesaj vardır. Token browser adres çubuğu/geçmişinden kaldırılır; sayfa noindex/no-referrer kullanır. Development request log'larında doğrulama token'lı URL'ler hariç tutulur. Access/refresh token değerleri loglanmaz.

Backend'in gönderdiği mevcut bağlantı doğrudan backend GET doğrulamasını da kullanabilir; bu endpoint kullanıcı doğrulamasını yapıp yapılandırılmış adrese yönlendirir. Frontend'e tokensız redirect geldiğinde frontend bağımsız bir başarı kanıtı alamadığı için nötr açıklama gösterir. Backend link/redirect ayarlarına dokunulmadı.

Proxy izin listesine yalnızca doğrulama POST yolu eklendi; doğrulama GET yolu proxy üzerinden açılmadı. Same-origin/Host/CSRF kontrolleri, sabit HTTPS hedefi, cookie politika doğrulaması, production kapatma ve log güvenliği korunur.

## Backend'in desteklemediği özellikler

- **Beni hatırla:** Login şeması yalnızca email/password kabul ediyor; cookie süresi sunucu tarafından tek sözleşmeyle belirleniyor. İşlevsiz checkbox kaldırıldı, gerçek oturum süresini açıklayan metin eklendi.
- **Şifremi unuttum:** Request/confirm endpoint'leri mevcut; ancak yerel backend kaynağında `createSmtpEmailProvider` yalnızca doğrulama e-postasını uyguluyor. `sendPasswordReset` varsayılanı hiçbir gönderim yapmıyor. Bu nedenle çalışan bir sıfırlama deneyimi vaat edilmedi: buton devre dışı ve nedeni sayfada açık. Backend e-posta teslimi uygulanmadan bu özellik tamamlanamaz. Canlı sağlayıcı yapılandırması hakkında varsayım yapılmadı veya gerçek hesaba reset isteği gönderilmedi.
- Backend kayıt sırasında doğrulanmamış kullanıcıya session üretmeye devam ediyor. Frontend bunu kullanmıyor ve kapatıyor; bu backend davranışı değiştirilmedi.

## Testler ve kanıt

- `npm.cmd run test`: **14 dosya, 128 test başarılı.** Auth yanıtları, login hata kodları, me, registration failure/cleanup ayrımı, email confirmation, reload bootstrap, expiry, refresh single-flight, login/restore yarışı, logout bildiriminin token taşımaması, katalog ve form kuralları kapsanır.
- `npx.cmd playwright test`: **26 tarayıcı testi başarılı**, 13 masaüstü + 13 Pixel 7 mobil Chromium. Kayıt/giriş/confirmation API çağrıları tamamen otomatik test mock'larıyla karşılanır; harici browser istekleri engellenir.
- Son geometri testi güçlendirildikten sonra `npx.cmd playwright test --grep bounded`: **2 test başarılı**, masaüstü/mobil aşağı ve yukarı açılış, viewport sınırı, portal, iç scroll ve üstte kalan arama doğrulandı.
- Browser testleri: 81 API ili, combobox aç/kapat/arama/seçim/yeniden seçim, Türkçe karakterler, klavye/Tab/Escape, mobil genişlik ve scroll, her alanın validasyonu, çift submit, kayıt hata/başarı/cleanup/e-posta teslim hatası, resend, yanlış şifre/doğrulanmamış hesap, login→me, yeniden sayfa yükleme/yeni sekme, HttpOnly cookie, memory-only token, logout ve expiry, email confirmation ve süresi dolmuş bağlantı, İngilizce arayüz.
- `npm.cmd run typecheck`: başarılı.
- `npm.cmd run lint`: sıfır hata; yalnızca önceden var olan `src/lib/workshops.ts:19` kullanılmayan locale uyarısı. Auth dışı dosyayı değiştirmemek için bırakıldı.
- `npm.cmd run build`: başarılı. Derleme, önceki SWC cache sandbox engeli nedeniyle normal kullanıcı izinleriyle çalıştırıldı.
- Son production çıktısı 3100 portunda ayrıca başlatıldı: `/giris`, `/kayit`, `/en/login`, `/en/register`, `/email-verified` HTTP 200; development gateway `/api/local/locations/provinces` HTTP 404 döndü. Yalnızca bu kontrol için başlatılan production process durduruldu; mevcut development sunucusu korundu. Page/layout 400 satır sınırı kontrolünde ihlal bulunmadı.
- Gerçek il endpoint'i localhost proxy üzerinden salt okunur GET ile okunup 81 kayıt doğrulandı; public yanıt yalnızca test fixture'ına kaydedildi. Production'da test kaydı oluşturulmadı veya gerçek kullanıcıyla otomatik giriş yapılmadı.
- Masaüstü ve mobil screenshot'ları görsel olarak incelendi: `test-results/combobox-desktop.png`, `test-results/combobox-mobile.png`. Ekran görüntüleri test çıktısıdır ve gitignore kapsamındadır. Mobil kontrol gerçek fiziksel telefon yerine Chromium cihaz emülasyonudur.

Playwright yalnızca devDependency olarak eklendi. `npm run test:e2e` tarayıcı testlerini yeniden çalıştırır; Vitest yalnızca `src/**/*.test.{ts,tsx}` dosyalarını çalıştırır. Uygulamanın runtime'ında mock veri yoktur. Production backend/veritabanı/sunucu değişikliği veya deploy yapılmadı.

## Başlıca dosyalar

- `src/features/auth/province-select.tsx`, `register-form.tsx`, `registration-success.tsx`, `registration-validation.ts`
- `src/features/auth/login-form.tsx`, `panel-path.ts`, `guest-only.tsx`, `auth-provider.tsx`
- `src/features/auth/email-verification.tsx`, `src/app/[locale]/(auth)/email-verified/page.tsx`
- `src/lib/api/endpoints/auth.ts`, `token-refresh.ts`, `local-gateway.ts`, `src/types/auth.ts`, `src/lib/toast/api-error-key.ts`
- `messages/tr.json`, `messages/en.json`, `next.config.ts`
- `src/lib/api/__tests__/auth.test.ts`, `src/features/auth/registration.test.tsx`
- `e2e/auth.spec.ts`, `auth-fixture.ts`, `fixtures/provinces.json`, `playwright.config.ts`, `vitest.config.mts`, `package.json`, `package-lock.json`, `.gitignore`
