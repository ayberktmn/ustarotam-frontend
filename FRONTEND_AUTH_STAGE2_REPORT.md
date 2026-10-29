# UstaRotam Frontend Auth Entegrasyonu — Aşama 2

Tarih: 2026-10-27  
Frontend: `frontend/usta-rotam-app`  
API: `https://api.ustarotam.com/api/v1`

## Sonuç

Kayıt, giriş, e-posta doğrulama, doğrulama e-postasını yeniden gönderme, şifre sıfırlama, oturum yenileme/çıkış ve profil oturumu mevcut ortak API istemcisi üzerinden backend sözleşmesine bağlandı. Tasarım ve responsive yapı korunmuştur.

Canlı API'de veri değiştiren veya e-posta gönderen hiçbir istek çalıştırılmadı. Yalnızca CORS için güvenli `OPTIONS /auth/login` kontrolü yapıldı; production origin, credentials ve `Authorization`/`Content-Type` başlıkları kabul edildi.

## Doğrulanan endpoint eşleşmeleri

| Akış | Method ve endpoint | İstek | Başarılı yanıt |
| --- | --- | --- | --- |
| Kayıt | `POST /auth/register` | `firstName`, `lastName`, `email`, `password`, `provinceId`, `termsAccepted`, `privacyAccepted` | auth payload |
| Giriş | `POST /auth/login` | `email`, `password`, `rememberMe` | auth payload |
| Yetkili profil | `GET /auth/me` | Bearer access token | kullanıcı ve backend rolleri |
| Profil güncelleme | `PATCH /auth/me` | yalnızca `firstName`, `lastName` | güncel kullanıcı |
| Refresh | `POST /auth/refresh` | HttpOnly refresh cookie | yeni access token ve kullanıcı |
| Çıkış | `POST /auth/logout` | HttpOnly refresh cookie | `204` |
| Doğrulama tekrar gönder | `POST /auth/email-verification/resend` | `email` | `202 { success: true }` |
| E-posta doğrulama (uygulama) | `POST /auth/email-verification/confirm` | `token` | `204` |
| E-posta doğrulama (e-posta linki) | `GET /auth/email-verification/confirm?token=...` | query token | token tüketilir, frontend doğrulandı sayfasına `303` |
| Şifre sıfırlama isteği | `POST /auth/password-reset/request` | `email` | `202 { success: true }` |
| Yeni şifre | `POST /auth/password-reset/confirm` | `token`, `newPassword` | `204` |

Frontend'in daha önce varsaydığı `/auth/email-change/request` ve `/auth/email-change/verify` endpoint'leri backend'de yoktur. Bu nedenle profil e-postası salt okunur yapıldı; bu hayali endpoint'lere ağ isteği çıkması engellendi.

## Auth davranışı

- Access token yalnızca bellekte tutulur; kalıcı tarayıcı depolamasına yazılmaz.
- Refresh token backend'in HttpOnly cookie sözleşmesiyle yönetilir.
- Login cevabındaki rol tek başına yetki kaynağı değildir. Login sonrasında `GET /auth/me` çağrılır ve kullanıcı/roller backend'den yeniden doğrulanır.
- Sayfa yenileme ve yeni sekmede refresh cookie ile oturum kurulup ardından `/auth/me` alınır.
- Tekrarlanan refresh çağrıları tek uçuş kilidiyle birleştirilir. Refresh sona ermişse erişim token'ı temizlenir; oturum kapanır ve korumalı veriler query cache'den çıkarılır.
- Logout yerel oturumu her durumda temizler ve diğer sekmelere `BroadcastChannel` ile bildirilir.
- `EMAIL_NOT_VERIFIED` için istenen Türkçe açıklama ve resend eylemi gösterilir.
- Resend sonucu hesap varlığını açıklamayan sabit mesaj kullanır. İstek sürerken tekrar tıklama engellenir; başarı/hata sonrasında 60 saniye istemci bekleme süresi uygulanır; backend `429` hataları ortak hata eşlemesiyle gösterilir.
- Şifre sıfırlama ve doğrulama token'ları URL'den alındıktan sonra browser history URL'sinden kaldırılır.

## Testler

| Komut | Sonuç |
| --- | --- |
| `npm.cmd run typecheck` | geçti |
| `npm.cmd run lint` | geçti |
| `npm.cmd run test` | 20 dosya, 200 test geçti |
| `npm.cmd run test:e2e` | desktop + mobile, 64 test geçti |
| `npm.cmd run build` | production build geçti, 52 route üretildi |

Testler tüm dış auth çağrılarını mock gateway ile izole eder. Canlı register/login/resend/password-reset endpoint'leri testler tarafından çağrılmaz.

## Kalan uyumsuzluklar ve sınırlar

- Backend doğrulanmış e-posta değiştirme sözleşmesi sunmuyor. Profil e-postası bu nedenle değiştirilemez. Eski, artık kullanılmayan `profile-email-verification.tsx` bileşeni dosyada korunmuştur; servis katmanı bu bileşenden gelebilecek çağrıyı ağ isteği yapmadan `EMAIL_CHANGE_UNAVAILABLE` ile durdurur.
- E-posta doğrulama GET linki backend tarafından token tüketildikten sonra sabit frontend URL'sine yönlenir; yönlendirmede başarı parametresi yoktur. Frontend bu token'sız dönüşü başarı ekranı olarak gösterir. Bu ekran yetki vermez; giriş sırasında backend doğrulama durumunu tekrar zorunlu tutar.
- SMTP teslimatı, gerçek kullanıcı girişi ve gerçek refresh cookie üretimi güvenlik kısıtları nedeniyle canlı production üzerinde uçtan uca tetiklenmedi. Bunlar sözleşme/kaynak kodu ve izole tarayıcı testleriyle doğrulandı.
- Kayıt cevabı refresh cookie oluşturduğu için frontend başarı sonrasında `POST /auth/logout` ile oturumu temizler. Temizleme isteği başarısız olursa yeni kayıt isteği atılmaz; kullanıcıya yalnızca temizlemeyi yeniden deneme seçeneği sunulur.
- Ortamda `git` komutu kurulu/erişilebilir olmadığı için çalışma ağacı fark listesi Git üzerinden doğrulanamadı. Mevcut dosyalar silinmedi.

## Aşama 3 öncesi değerlendirme

Auth entegrasyonu frontend tarafında hazırdır. Zorunlu engel yoktur. Production üzerinde gerçek e-posta teslimatı ve gerçek hesapla oturum davranışı için daha sonra kontrollü, yetkilendirilmiş bir kabul testi gerekir; mevcut güvenlik talimatı gereği bu aşamada yapılmamıştır.
