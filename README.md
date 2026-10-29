# Usta Rotam

Güncel canlı API bağlantısı, oturum sözleşmesi, kalan demo verileri ve Aşama 1
kontrolleri için [API entegrasyon raporuna](FRONTEND_API_STAGE1_REPORT.md) bakın.
Bu rapor aşağıdaki eski seed/mock geçiş açıklamalarının yerine geçer.

Usta Rotam, araç sahiplerinin şehir, ilçe, araç türü ve hizmet kategorisine
göre oto tamir ustalarını ve servis işletmelerini bulmasına yardımcı olan
Türkiye geneli bir web platformudur. Manisa, başlangıç verisi olarak kullanılır;
ürün kapsamı tüm illeri kapsar.

Uygulama Türkçe ve İngilizce olarak yayınlanır. Backend ayrı bir servis olarak
geliştirilecek ve mevcut repository katmanı üzerinden HTTP ile bağlanacaktır.

## Teknoloji yığını

- Next.js 16.4.2 (App Router, Turbopack)
- React 19
- TypeScript (strict)
- Tailwind CSS v4
- shadcn/ui ve lucide-react
- next-intl (Türkçe / İngilizce)
- ESLint
- npm (`package-lock.json`)

## Gereksinimler

- Node.js `>= 20.9.0` (Next.js 16 gereksinimi)
- npm

## Kurulum ve geliştirme

```bash
npm install
cp .env.example .env.local
npm run dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde açılır.
Varsayılan dil Türkçe'dir; İngilizce sayfalar `/en` ön ekiyle yayınlanır.

### Komutlar

| Komut               | Açıklama                                      |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Geliştirme sunucusu                           |
| `npm run lint`      | ESLint kontrolü                               |
| `npm run typecheck` | TypeScript kontrolü (`tsc --noEmit`)          |
| `npm run build`     | Production build                              |
| `npm run start`     | Production sunucusu (`next start`)            |

## Dil ve URL yapısı

Varsayılan dil için URL ön eki kullanılmaz; İngilizce için `/en` kullanılır.
Yol adları da dile göre yerelleştirilir:

| Sayfa            | Türkçe             | İngilizce                 |
| ---------------- | ------------------ | ------------------------- |
| Ana sayfa        | `/`                | `/en`                     |
| Usta arama       | `/usta-ara`        | `/en/find-workshops`      |
| İşletme profili  | `/usta/[slug]`     | `/en/workshop/[slug]`     |
| Hizmetler        | `/hizmetler`       | `/en/services`            |
| Nasıl çalışır?   | `/nasil-calisir`   | `/en/how-it-works`        |
| Hakkımızda       | `/hakkimizda`      | `/en/about`               |
| Giriş            | `/giris`           | `/en/login`               |
| Kayıt            | `/kayit`           | `/en/register`            |
| Hesabım          | `/hesabim`         | `/en/account`             |
| Profil bilgileri | `/hesabim/profil`  | `/en/account/profile`     |
| Favoriler        | `/hesabim/favoriler` | `/en/account/favorites` |
| Yorumlar         | `/hesabim/yorumlar` | `/en/account/reviews`    |

Dil değiştirici mevcut sayfayı ve query parametrelerini korur. Her sayfada
`canonical` ve `hreflang` bağlantıları üretilir.

## Tasarım sistemi

Tasarım token'larının tek kaynağı `src/styles/tokens.css` dosyasıdır:

- Marka ve yüzey renkleri (`brand`, `ink`, `cream`, `peach`, `line`, `success`)
- Tipografi ölçeği (`display`, `h1`, `h2`, `h3`, `body`, `body-lg`)
- Boşluk, gölge ve yarıçap değerleri
- Tailwind ve shadcn değişken eşlemeleri

Bir rengi veya tipografi ölçeğini değiştirmek için component'lere dokunmak
gerekmez; ilgili token güncellenir. Sayfa yerleşimlerinde `page-container` ve
`section-y` yardımcı sınıfları kullanılır. Tipografi için **Manrope** yüklenir.

Ortak arayüz bileşenleri `src/components/ui/` altında, sayfaya özel bileşenler
`src/features/` altında tutulur. Sayfalar bu bileşenleri birleştirir.

## Ortam değişkenleri

| Değişken       | Zorunlu | Açıklama                                                                 |
| -------------- | ------- | ------------------------------------------------------------------------ |
| `SITE_URL`                   | Hayır | Canonical URL tabanı. Build sırasında okunur. Varsayılan: `http://localhost:3000` |
| `APP_VERSION`                | Hayır | `/api/health` yanıtında gösterilen sürüm. Varsayılan: `0.1.0`             |
| `API_INTERNAL_BASE_URL`      | Hayır | Sunucu tarafı API adresi; yoksa public adres kullanılır. Localhost gateway için public adres ile aynı HTTPS hedefi olmalı. |
| `NEXT_PUBLIC_API_BASE_URL`   | Production için evet | `https://api.ustarotam.com/api/v1`. Hosted tarayıcılar doğrudan API'ye, yalnız loopback tarayıcılar mevcut `/api/local` gateway'ine bağlanır. Build sırasında sabitlenir. |
| `NEXT_PUBLIC_WORKSHOP_PANEL_PREVIEW` | Hayır | `true` yalnız arayüzde panel erişimini gevşetir; mock veri kaynağı seçmez. Production için `false` bırakılmalı. |

`SITE_URL`, production build öncesinde gerçek alan adına ayarlanmalıdır. Bu
değer canonical etiketlerine, `robots.txt` ve `sitemap.xml` içeriğine yansır.
`API_INTERNAL_BASE_URL` gibi sunucu tarafı değerlerde `NEXT_PUBLIC_` ön eki
kullanılmamalıdır. `NEXT_PUBLIC_API_BASE_URL` secret değildir. Gerçek secret
değerleri `.env.local` veya deployment ortamında tutulmalı; Git'e
eklenmemelidir.

## API servis katmanı

Backend ayrı bir servistir; frontend kendi API endpoint'lerini yazmaz. Hazır
backend endpoint'leri doğrudan tüketilir.

- `src/lib/api/client.ts` — timeout, envelope doğrulama, `ApiError`, auth, retry,
  abort ve request ID altyapısı.
- `src/lib/api/failure.ts` — HTTP hata sınıflandırma, güvenli JSON okuma ve
  `Retry-After` ayrıştırma.
- `src/lib/api/retry.ts` — exponential backoff ve iptal edilebilir bekleme.
- `src/lib/api/endpoints/` — auth, katalog ve workshop servisleri.
- `src/lib/api/index.ts` — tarayıcı tarafı servisler.
- `src/lib/api/server.ts` — server component'ler için cache etiketli servisler.
- `src/lib/api/token-store.ts` — access token'ı yalnız bellekte tutar.
- `src/lib/api/token-refresh.ts` — tek uçuşlu (single-flight) refresh akışı.

### Kullanılan backend endpoint'leri

| Alan | Endpoint |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| Konum | `GET /locations/provinces`, `GET /locations/provinces/:id/districts`, `GET /locations/districts/:id/industrial-sites` |
| Araç | `GET /vehicles/types`, `GET /vehicles/brands`, `GET /vehicles/models` |
| Uzmanlık | `GET /specialties` |
| Workshop | `GET /workshops`, `GET /workshops/:id`, `POST /workshops`, `PATCH /workshops/:id` |
| Yorum | `GET /workshops/:id/reviews`, `POST /workshops/:id/reviews` |

Backend'de favori listesi, profil güncelleme ve kullanıcının kendi yorum
geçmişi endpoint'leri henüz bulunmuyor. Hesap panelindeki favoriler bu nedenle
`localStorage` üzerinde kullanıcı bazlı tutulur; profil sayfası salt okunurdur
ve yorumlar sayfası mevcut seed yorumlarıyla önizleme olarak gösterilir.

Auth ve workshop mutasyonları tarayıcıdan doğrudan API'ye gider. Public
okumalar için `serverCatalogService` ve `serverWorkshopService` hazırdır; sayfa
veri kaynağının API'ye tam geçişi, backend yanıt alanları doğrulandıkça
yapılacaktır. Bu aşamada mevcut public sayfalar yerel seed repository'sini
kullanmaya devam eder; auth akışı gerçek API'ye bağlıdır.

Tarayıcıdan API'ye giden isteklerde backend CORS allowlist'i yalnız
`https://ustarotam.com` ve `https://www.ustarotam.com` origin'lerini içermeli;
`credentials: include` kullanıldığı için wildcard origin kullanılamaz.

### Retry, auth ve cache davranışı

- GET istekleri ağ, timeout, 429, 500, 502, 503 ve 504 hatalarında en fazla 2
  kez exponential backoff ile tekrar denenir. 501/505 gibi kalıcı 5xx hataları
  ve 429 dışındaki 4xx hataları otomatik tekrar edilmez.
- POST/PATCH istekleri otomatik tekrar edilmez.
- `auth` varsayılanı `optional`'dır: token varsa eklenir, 401 alınırsa tek bir
  refresh çalışır ve istek bir kez tekrar edilir. Token yoksa istek anonim
  gönderilir.
- `auth: "required"` isteklerinde token yoksa önce refresh denenir. Refresh
  kesin olarak sona ermişse oturum kapatılır; ağ/5xx gibi geçici hatalarda
  oturum sonlandırılmaz.
- `auth: "none"` otomatik bearer token ve refresh kullanmaz. Public katalog,
  workshop okuma ve health istekleri bu modu kullanır.
- `auth: "none"` cookie gönderimini kapatmaz; login/register/refresh cookie
  akışı için browser istekleri varsayılan `credentials: include` kullanır.
  Tamamen anonim istekler için `credentials: "omit"` verilebilir. Caller'ın
  açıkça gönderdiği `Authorization` header'ı korunur.
- `Retry-After` saniye veya HTTP tarihi olarak desteklenir. Geçerli süre
  olduğu gibi beklenir; `DEFAULT_MAX_RETRY_DELAY_MS` üzerindeki sürelerde
  otomatik retry yapılmaz, hata `retryAfterMs` ile çağırana bırakılır. React
  Query de aynı limiti uygular.
- Başarılı HTTP yanıtındaki bozuk/boş JSON gövdesi `contract` hatası sayılır;
  network hatasına dönüştürülmez.
- Request body'leri JSON olarak serileştirilir; `FormData` veya dosya yükleme
  bu istemcide desteklenmez.
- Çağıranın `AbortSignal`'ı hem istek sırasında hem backoff beklemesinde
  dinlenir. İptal `REQUEST_CANCELLED` koduyla, retry edilmeden döner.
- React Query: katalog 1 saat, workshop listesi 60 saniye, detay 5 dakika
  staleTime ile cache'lenir; mutation sonrası ilgili query'ler invalidate
  edilir.
- Server fetch: katalog 1 saat, workshop 60 saniye revalidate; tag'ler
  `catalog` ve `workshops`. `next` seçenekleri yalnız server modunda uygulanır.

## Giriş ve kayıt sayfaları

`/giris` ve `/kayit` sayfaları gerçek backend auth endpoint'lerine bağlıdır.
Access token yalnız bellekte tutulur; refresh token HttpOnly cookie ile
yönetilir. Sayfa yenilendiğinde `/auth/refresh` ve `/auth/me` ile oturum geri
yüklenir. Çıkışta API çağrılır ve yerel oturum her durumda temizlenir.

Auth sayfaları `noindex` olarak işaretlenmiştir. Backend yoksa veya istek
başarısızsa kullanıcıya lokalize hata toast'u gösterilir.

## Hesap paneli

Giriş yapan kullanıcı `/hesabim` altındaki panele erişir:

- **Genel bakış:** kullanıcı özeti, e-posta doğrulama durumu, favori sayısı ve
  son favoriler.
- **Profil bilgileri:** ad, soyad, e-posta, telefon ve doğrulama durumu; backend
  güncelleme endpoint'i olmadığı için salt okunur.
- **Favoriler:** kullanıcı ID'sine göre `localStorage`'da saklanır
  (`usta-rotam.favorites.v1.<userId>`). Cihazlar arası senkron yoktur; backend
  favori API'si geldiğinde aynı arayüz API'ye bağlanacaktır.
- **Yorumlar:** kullanıcı yorum geçmişi endpoint'i hazır olana kadar seed
  yorumlarıyla önizleme gösterilir ve sayfada örnek veri olduğu belirtilir.

Panel sayfaları istemci tarafında oturum kontrolü yapar; oturum yoksa
`/giris?returnUrl=...` adresine yönlendirir. Giriş sonrası kullanıcı geldiği
sayfaya döner. Panel sayfaları `noindex, nofollow` olarak işaretlenmiştir ve
`robots.txt` içinde engellenmiştir.

## Usta paneli (mock)

Usta hesapları `/usta-panel` altındaki panele erişir. Panel şu anda **örnek
verilerle** çalışır; backend'de iş talebi ve teklif uçları hazır olduğunda aynı
arayüz HTTP repository'sine bağlanacaktır. Mesajlaşma, bildirim ve yorum
ekranları da demo verisi kullanır ve arayüzde bu durum açıkça belirtilir.

- **Genel bakış:** uygun iş talepleri, bekleyen teklifler, kazanılan işler,
  ortalama puan ve okunmamış mesaj özeti.
- **Eşleşen işler:** uzmanlık, araç ve konuma göre filtrelenen talepler; teklif
  verme, düzenleme ve tam adres gizliliği notu.
- **Tekliflerim:** teklif durumları, güncelleme, geri çekme ve kabul edilen iş
  özeti.
- **Mesajlar:** işe bağlı konuşma listesi, okundu işaretleme ve mesaj gönderme.
- **Bildirimler:** teklif, mesaj, iş ve yorum bildirimleri; okundu işaretleme.
- **Yorumlar:** ortalama puan, yıldız dağılımı ve doğrulanmış iş etiketleri.
- **Profil:** işletme bilgileri, uzmanlıklar, hizmet bölgeleri ve düzenleme
  formu. Profil fotoğrafı ve belge yükleme henüz kapsam dışıdır.

Erişim `WORKSHOP_OWNER` veya `ADMIN` rolüyle sınırlıdır. Mock aşamasında paneli
giriş yapmış herkesle önizlemek için `.env.local` dosyasına
`NEXT_PUBLIC_WORKSHOP_PANEL_PREVIEW=true` eklenebilir. Bu ayar yalnızca arayüz
kapısını gevşetir; gerçek yetkilendirme backend'de uygulanmalıdır.

## Toast ve hata yönetimi

- Sonner tabanlı tek `Toaster`, `AppProviders` içinde yönetilir.
- Başarılı login/register/logout ve mutation'larda success toast'u gösterilir.
- API hataları `error.code` üzerinden Türkçe/İngilizce mesaja çevrilir; ham
  backend mesajı gösterilmez.
- Form doğrulama hataları alan bazında inline gösterilir.
- Oturum süresi dolduğunda info toast'u gösterilir ve auth state temizlenir.

## Görseller

Hero, işletme kartları ve giriş sayfası görselleri Unsplash'ten alınmıştır.
Kaynak listesi `public/images/CREDITS.md` dosyasındadır. Görseller `next/image`
ile WebP olarak sunulur. Proje fotoğrafları hazır olduğunda aynı dosya adlarıyla
değiştirilebilir.

## SEO ve erişilebilirlik

- `lang` özniteliği aktif dile göre ayarlanır.
- Sayfa bazlı başlık, açıklama, canonical ve `hreflang` üretilir.
- `sitemap.xml` iki dildeki sayfaları ve işletme profillerini içerir.
- Giriş/kayıt sayfaları `noindex`dır.
- Semantik başlık hiyerarşisi, görünür focus durumları, skip link ve etiketli
  form alanları kullanılır.
- Gerçek ve doğrulanmış veri olmadan yapılandırılmış veri (JSON-LD)
  eklenmemelidir.

## Production

Bu proje Docker kullanmaz. Production çalıştırması standart Next.js Node
sunucusu ile yapılır:

```bash
SITE_URL="https://alan-adiniz" npm run build
npm run start
```

`https://alan-adiniz` yerine gerçek alan adınızı yazın. `SITE_URL` build
sırasında okunur.

### Reverse proxy ve HTTPS

Production'da Next.js sunucusunu doğrudan internete açmak yerine Nginx,
Caddy veya benzeri bir reverse proxy arkasında çalıştırın. Proxy; TLS
sonlandırma, istek boyutu limitleri, rate limiting ve güvenlik başlıkları gibi
konuları üstlenmelidir.

```nginx
server {
    listen 80;
    server_name alan-adiniz;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name alan-adiniz;

    ssl_certificate     /etc/letsencrypt/live/alan-adiniz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/alan-adiniz/privkey.pem;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

HTTPS sertifikası için Let's Encrypt/Certbot veya sunucu sağlayıcınızın
yönetilen sertifika çözümünü kullanabilirsiniz.

## Sağlık kontrolü

```bash
curl -i http://localhost:3000/api/health
```

Yanıt `200 OK` ve uygulama sürümü, zaman damgası, uptime ve uygulama kontrolü
bilgisini içeren bir JSON gövdesi döner. Endpoint `Cache-Control: no-store` ve
`X-Robots-Tag: noindex` başlıklarını gönderir; secret içermez.

## Proje yapısı

```text
src/app/[locale]/          Dil bazlı sayfalar, layout, 404/hata
src/app/api/               Sağlık endpoint'i
src/components/ui/         shadcn/ui bileşenleri
src/components/layout/     Header, footer, logo, dil değiştirici, mobil menü
src/features/search/       Arama formu, filtreler, sıralama, iskelet
src/features/workshops/    Usta kartı, puan, yorum ve profil bileşenleri
src/features/auth/         Auth provider ve giriş/kayıt formları
src/features/account/      Hesap paneli, profil, favori ve yorum görünümleri
src/features/usta-panel/   Usta paneli, iş talepleri, teklifler, mesajlar ve profil
src/features/favorites/    Kullanıcı bazlı favori provider'ı ve kalp butonu
src/features/catalog/      React Query katalog hook'ları
src/lib/api/               API client, şemalar, endpoint servisleri, token yönetimi
src/lib/query/             React Query client ve query key'leri
src/lib/toast/             API hata mesajı eşleme ve toast hook'ları
src/components/providers/  Query, auth ve Sonner provider'ları
src/lib/                   Veri erişimi, doğrulama, biçimlendirme, site yapılandırması
src/lib/repositories/      Yerel seed veri kaynağı (public sayfalar)
src/data/                  Yerel uzmanlık, araç türü ve işletme verileri
src/types/                 Domain, arama, locale ve repository tipleri
src/i18n/                  next-intl routing, navigation ve request yapılandırması
src/styles/tokens.css      Tasarım token'ları
messages/                  Türkçe ve İngilizce arayüz metinleri
public/                    Logo, ikon, OG görseli, web manifest, fotoğraflar
```

## Kalite kontrolü

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Manuel kontrol örnekleri:

```bash
# Türkçe arama ve araç türü filtresi
curl -s "http://localhost:3000/usta-ara?aracTuru=suv"

# İngilizce arama
curl -s "http://localhost:3000/en/find-workshops?uzmanlik=klima"

# İngilizce profil
curl -s "http://localhost:3000/en/workshop/motor-rotasi-oto-servis"

# Geçersiz profil 404 dönmeli
curl -i "http://localhost:3000/usta/gecersiz-slug"

# Hesap paneli sayfaları (oturum yoksa istemci tarafında login'e yönlenir)
curl -s "http://localhost:3000/hesabim"
curl -s "http://localhost:3000/en/account/favorites"
```

## Sıradaki adımlar

- Public workshop/katalog sayfalarının API repository'sine geçişi
- Favori API'si, profil güncelleme ve kullanıcı yorum geçmişi endpoint'leri
- Gerçek işletme verisi, görseller ve yönetim paneli
- Yetkilendirme ve işletme doğrulama
- Owner onboarding ve admin doğrulama akışı
- Yorum gönderme, moderasyon ve kötüye kullanım bildirimi
- Gerçek verilerle yapılandırılmış veri ve zengin SEO sayfaları
