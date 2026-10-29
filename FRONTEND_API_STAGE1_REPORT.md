# Usta Rotam — Frontend canlı API entegrasyonu / Aşama 1

Tarih: 27 Ekim 2026. Hedef: `https://api.ustarotam.com/api/v1`.
Kullanıcının son doğruladığı release: `api-36292fd`. Health yanıtı release
kimliği vermediği için çalışan release bağımsız olarak doğrulanmadı.

## Sonuç ve kapsam

Ortak bağlantı altyapısı hazır; tüm ekranların canlı entegrasyonu tamamlanmış
sayılmaz. Backend dosyaları, production veritabanı, tasarım, sayfa düzenleri ve
işletme/teklif/mesaj ekranları değiştirilmedi. Deploy veya migration yapılmadı.
Mevcut dosyalar silinmedi; `.env.local` korundu. Yeni secret eklenmedi.

## İncelenen yapı

- Next.js 16.4.2 App Router, React 19.3, strict TypeScript; next-intl ile TR/EN routing.
- TanStack Query v5: sunucu verisi/oturum önbelleği; React context: auth durumu.
- `src/lib/api/client.ts`: merkezi fetch, Authorization, timeout, iptal, retry,
  envelope ve Zod doğrulaması. Endpoint servisleri `src/lib/api/endpoints/` altında.
- `src/lib/toast/api-error-key.ts`: backend `error.code` değerlerini TR/EN
  kullanıcı mesajlarına çevirir; ham backend hata mesajı UI metni olarak kullanılmaz.
- `src/lib/workshops.ts` mevcut haliyle public sayfaları API'ye bağlıyor.
  `workshopPanelRepository` de API repository'sini seçiyor. README'deki eski
  “public sayfalar seed, panel tamamen mock” açıklamaları mevcut kodu yansıtmıyor.

## Yapılan değişiklikler

- `.env.example` canlı API hedefiyle güncellendi. Production public URL zorunlu;
  geliştirme fallback'i de canlı URL. Eski 4300/4391 API fallback adresleri kaldırıldı.
- Hosted tarayıcılar `NEXT_PUBLIC_API_BASE_URL` adresini doğrudan kullanır.
  Yalnız `localhost`, `127.0.0.1`, `[::1]` mevcut `/api/local` gateway'ini kullanır.
  Production bundle'ın localhost üzerinde test edilmesi de bu davranışı korur.
- API URL'lerinde HTTPS zorunlu (HTTP yalnız loopback için); URL içine gömülmüş
  kullanıcı/parola, query ve fragment reddedilir. Server-only
  `API_INTERNAL_BASE_URL` browser hedefini değiştirmez.
- Geç gelen eski-token 401 yanıtı, başka isteğin tamamladığı refresh'in token'ını
  kullanır; gereksiz ikinci refresh/rotation başlatmaz. Regresyon testi eklendi.
- Token yanıtları gerçek `data.accessToken` alanıyla işlenir. Belgelenmemiş
  `token`/`access_token` alternatifleri kaldırıldı; boş token reddedilir.
- Logout, diğer sekmeden logout ve kesin oturum kaybında panel sorgu önbelleği
  temizlenir; önceki kullanıcının özel panel verisi cache'te bırakılmaz.
- Backend health sözleşmesi düzeltildi: `{success:true, service, status:"ok"}`;
  olmayan `timestamp` alanı zorunlu tutulmaz. Localhost gateway'inde güvenli
  `GET /health` erişimi açıldı; yeni route oluşturulmadı.

## Token ve refresh sözleşmesi

Yerel backend `auth.controller.js` sözleşmesi:

- Login/register/refresh: `{success:true,data:{user,accessToken,tokenType:"Bearer"}}`.
- Access token yalnız JS belleğinde; localStorage/sessionStorage kullanılmaz.
  Authenticated çağrılarda `Authorization: Bearer ...` gönderilir.
- Refresh token yalnız `ustarotam_refresh` HttpOnly cookie'sinde; cookie path'i
  `/api/v1/auth`, SameSite=Strict, production için Secure. JS refresh token okumaz.
  “Beni hatırla” cookie ömrünü belirler. Refresh isteği gövdesiz ve credentials=include.
- Aynı anda refresh isteyen çağrılar tek Promise paylaşır. Web Locks varsa
  sekmeler arasında auth işlemleri sıraya alınır. Her sekmenin access token'ı ayrıdır.
- `auth: none`: otomatik bearer/refresh yok. Public katalog/workshop okumaları
  bu modu kullanır. `required`: token yoksa refresh; 401 sonrasında en fazla bir
  auth tekrarı. Yenilenen token da reddedilirse token temizlenir, UI oturumu düşer.
- Refresh 401/403 veya kesin expired kodu döndürürse token temizlenir.
  Ağ/timeout/429/5xx/bozuk response durumları geçici erişim/sözleşme hatası olarak
  bildirilir; yanlışlıkla kalıcı logout yapılmaz. Refresh POST otomatik retry edilmez.
- Normal istek timeout'u 12 saniye. GET ağ/timeout/429/500/502/503/504 için en
  fazla 2 retry; mutasyonlarda genel ağ retry'si yok. 401 sonrası auth tekrarı ayrıdır.
- Logout önce bellek oturumunu kapatır ve devam eden oturum isteklerini iptal eder;
  backend cookie revocation çağrısı yapılır. Bu çağrı ağ nedeniyle başarısızsa
  frontend sunucudaki cookie'nin iptal edildiğini garanti edemez.

SameSite=Strict nedeniyle doğrudan cookie akışı HTTPS `ustarotam.com` ve
alt alan adlarında çalışacak şekilde kurulmalıdır; farklı bir siteye ait preview
alan adı için yalnız CORS yeterli olmaz. Localhost'ta önceden var olan gateway,
backend refresh cookie'sini HttpOnly `usta_rotam_dev_refresh` olarak yerelleştirir.
Cookie politikası backend'de değiştirilmedi. Eski hosted gateway cookie'si ile
doğrudan API cookie'si farklıdır; bu geçişte mevcut hosted kullanıcıların yeniden
giriş yapması gerekebilir.

Bellekteki access token XSS'ye karşı mutlak koruma sağlamaz; kalıcı tarayıcı
depolaması riskini azaltır. Refresh token'ın JS'ye açıldığı bir yöntem eklenmedi.

## Envelope ve canlı GET doğrulaması

27 Ekim 2026'da yalnız güvenli GET istekleri gönderildi:

| Kontrol | Sonuç |
| --- | --- |
| `/health` | HTTP 200, `success:true`, `status:ok` |
| `/locations/provinces`, Origin=`https://ustarotam.com` | HTTP 200, 81 il; `success/data/meta.count` |
| `/health`, Origin=`https://www.ustarotam.com` | HTTP 200 |
| İki production origin için CORS | Tam origin eşleşmesi, `Access-Control-Allow-Credentials:true` |

Bu GET kontrolleri Authorization içeren preflight'ın veya gerçek login/refresh
cookie döngüsünün canlı browser doğrulaması değildir. Kullanıcı isteği gereği
canlı hesap oluşturma, login, refresh, logout veya başka mutasyon gönderilmedi.
Auth sözleşmesi kaynak kod ve izole testlerle doğrulandı.

Client varsayılanı `success:true` envelope içindeki `data` alanını Zod ile doğrular.
Katalog/sayfalama servisleri raw envelope şemasıyla `meta` bilgisini korur;
health ve `202 {success:true}` yanıtları raw, `204` ise void olarak işlenir.

## Kalan demo, yerel veri ve Aşama 2 eksikleri

| Yer | Mevcut durum / yapılacak iş |
| --- | --- |
| `src/data/testimonials.ts` → `home-testimonials-section.tsx` | Aktif statik demo referanslar; gerçek API yorumlarıyla karıştırılmamalı. Bu aşamada UI değiştirilmedi. |
| `src/data/workshops.ts`, `specialties.ts`, `vehicle-types.ts` ve `local-workshop-repository.ts` | Seed kaynaklar kalıyor; aktif `workshops.ts` bu repository'yi kullanmıyor. |
| `workshop-panel-mock-data.ts`, `createMockWorkshopPanelRepository()` | Mock implementasyon testler için kalıyor; aktif panel singleton'ı API repository'si. Otomatik mock fallback yok. |
| Favoriler | Kullanıcıya göre localStorage; backend senkronizasyonu yok. Token depolaması değildir. |
| Hesabım/yorumlar | Şu anda boş dizi; gerçek kullanıcı yorum geçmişi bağlanmamış. |
| `NEXT_PUBLIC_WORKSHOP_PANEL_PREVIEW` | Yalnız UI erişim kapısını gevşetiyor, mock servisi seçmiyor. Örnekte false. |
| `/api/local` gateway allowlist | Panel work-offers/conversations/notifications ve owner profile uçlarını kapsamıyor; localhost panel istekleri engellenebilir. Kapsam gereği panel/gateway genişletmesi yapılmadı. |
| İşletme başvurusu | Frontend `/workshop-applications` çağırıyor; incelenen yerel backend route listesinde bu mount yok. Canlı mutasyonla denenmedi; Aşama 2'de sözleşme teyidi gerekli. |
| Mesaj gönderme | Repository `/requests/:id/messages` için conversationId geçiriyor; yerel backend requestId bekliyor. Aşama 2'de düzeltilmeli; bu aşamada mesaj ekranına dokunulmadı. |
| Eski README/agent notları | Bazı seed/mock ve profil salt okunur açıklamaları eski; bu rapor mevcut kaynak kod tespitini esas alır. |

Component'lerde dağınık canlı API host'u tespit edilmedi. API hedefi config/env
üzerinden yönetiliyor; `/api/local` mevcut loopback geliştirme taşımasıdır.
Yeni frontend backend taklidi veya otomatik sahte veri fallback'i eklenmedi.

## Kontroller

| Komut / kontrol | Sonuç |
| --- | --- |
| `npm run typecheck` | Başarılı; son kaynak değişikliklerinden sonra tekrar çalıştırıldı. |
| `npm run test` | 20 dosya, 208 test başarılı. |
| `npm run build` | Başarılı; son kaynak değişiklikleriyle production build tamamlandı (52 statik sayfa). |
| `npm run lint` | Başarısız: önceden mevcut `src/features/auth/password-reset-form.tsx:56` için `react-hooks/set-state-in-effect`. Bu form kapsam dışında bırakıldı. |
| Değiştirilen 12 TS/TSX dosyasına doğrudan ESLint | Başarılı; API/oturum değişikliklerinde lint hatası yok. |
| Güncellenen `e2e/auth.spec.ts` için ESLint | Başarılı. |
| `npm run test:e2e` | İlk tam çalıştırma: 69 başarılı / 1 hatalı (5.6 dakika). |
| Düzeltme sonrası `npm run test:e2e -- --grep "remember me survives a real Chromium profile restart"` | Desktop + mobile: 2/2 başarılı (25.6 saniye). Tam 70 test ikinci kez çalıştırılmadı. |
| Sayfa/layout 400 satır sınırı | Aşan dosya bulunmadı. |
| Production `GET /api/health` | HTTP 200. |
| Production `GET /usta-ara?aracTuru=suv` | HTTP 200. |
| Production `GET /en/find-workshops?uzmanlik=klima` | HTTP 200. |
| Production `GET /usta/gecersiz-slug` | HTTP 404. |

Production smoke için yalnız bu çalışma sırasında başlatılan `localhost:3101`
sunucusu kullanıldı ve kontrol sonunda durduruldu. Başlangıçtaki build/start, sandbox'ın SWC native cache
erişim engeline takıldı; izinli tekrarlarında başarılı oldu. Bağımlılık sürümü
değiştirilmedi. Tüm istenen npm komutları mevcut; eksik script yok.

E2E ilk tam çalıştırmasında “session cookie ile browser yeniden başlayınca
refresh çağrısı sıfır olmalı” beklentisi masaüstünde zamanlamaya bağlı hata verdi.
Oturum geri açılmıyordu; yanlış olan browser refresh yoklaması sayacıydı. HttpOnly
cookie yokluğunu JS okuyamadığı için bootstrap bir yoklama gönderir. Test,
bu çağrıyı gateway öncesinde mock ile yakalar. Beklenti bir çağrı olacak şekilde
ve `expect.poll` ile deterministik hale getirildi; session cookie'nin yeniden
başlatmada oturum açmaması, persistent cookie'nin açması koşulları korundu.
E2E login/register/mutasyonları mock ile izole edilir; canlı auth'a gönderilmez.

Production kalite kapısını tamamen yeşile getirmek için mevcut lint ihlali
giderilmeli. Aşama 2'de panel gateway kapsamı, başvuru sözleşmesi ve mesaj ID
eşleşmesi ele alınmalı. Gerçek canlı login/refresh döngüsü bu çalışmanın güvenli
GET sınırı gereği doğrulanmış sayılmamalı; yetkili bir staging/test ortamında
ayrıca doğrulanmalı.

Git komutu ortam PATH'inde yok; workspace kökünde ve frontend klasöründe `.git`
bulunmadı. Bu nedenle Git diff/status üzerinden önceki değişiklik karşılaştırması
yapılamadı. Mevcut çalışma dosyaları üzerine sınırlı patch uygulandı; reset/clean
veya dosya silme işlemi yapılmadı.
