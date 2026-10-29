# Usta Rotam — Production Deploy Notu

Bu paket, Usta Rotam Next.js uygulamasının **hazır production build'i** ile
birlikte gelir. Sunucuda yeniden build almadan çalıştırılabilir.

## Paket bilgileri

- Uygulama: Usta Rotam
- Commit: `b5fd926`
- Build ID: `k2ud8_UXxS6jCqMSX0Q1-`
- Build tarihi: 2026-10-21
- Node.js gereksinimi: **>= 20.9** (önerilen: **Node.js 22 LTS**)
- Paket kök klasörü: `usta-rotam-app/`
- Çalışma zamanı: standart Next.js Node sunucusu (`next start`)
- Docker kullanılmıyor.

Build şu değerlerle alınmıştır:

```dotenv
SITE_URL=https://ustarotam.com
APP_VERSION=0.1.0
API_INTERNAL_BASE_URL=https://api.ustarotam.com/api/v1
NEXT_PUBLIC_API_BASE_URL=https://api.ustarotam.com/api/v1
```

`SITE_URL` ve `NEXT_PUBLIC_API_BASE_URL` **build sırasında gömülür**. Değişirlerse
yeniden build gerekir. `API_INTERNAL_BASE_URL` ve `APP_VERSION` çalışma
zamanında okunur.

> Paket macOS üzerinde build edilmiştir. Normalde Linux'ta çalışır; `next start`
> platform kaynaklı bir hata verirse aşağıdaki “Sunucuda yeniden build” adımını
> uygulayın. Production'da `npm run dev` çalıştırmayın.

## Paket içeriği

```text
usta-rotam-app/
├── .next/                     # hazır production build
├── public/                    # görseller, ikonlar, manifest
├── messages/                  # tr/en çeviri dosyaları
├── src/                       # kaynak kod (intl config ve yeniden build için)
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
├── .env.production.example
└── DEPLOY.md
```

`node_modules`, `.git`, `.env.local`, `.next/dev`, `.next/cache`,
`.next/diagnostics` ve `.next/types` bilinçli olarak paketlenmemiştir.
`.next/cache` çalışma zamanında Next.js tarafından yeniden oluşturulur.

## 1. Sunucu gereksinimleri

- Ubuntu 22.04/24.04 veya benzeri Linux
- Node.js 22 LTS (minimum 20.9)
- npm
- Nginx
- HTTPS sertifikası (Let's Encrypt veya Cloudflare Origin Certificate)
- Sunucuda 80/443 açık; 3000 portu **dışarı açık olmamalı**

Node.js kurulumu (NodeSource):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
node -v
npm -v
```

## 2. Dosyaları yerleştirme

Paketi sunucuya kopyaladıktan sonra:

```bash
tar -xzf usta-rotam-2026-10-21.tar.gz
sudo mkdir -p /var/www/usta-rotam
sudo cp -R usta-rotam-app/. /var/www/usta-rotam/
cd /var/www/usta-rotam
```

Servis kullanıcısı yoksa:

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin ustarotam
sudo chown -R ustarotam:ustarotam /var/www/usta-rotam
```

## 3. Ortam değişkenleri

`.env.production.example` dosyasını kopyalayın:

```bash
sudo -u ustarotam cp .env.production.example .env.production
sudo -u ustarotam chmod 600 .env.production
```

İçeriği:

```dotenv
SITE_URL=https://ustarotam.com
APP_VERSION=0.1.0
API_INTERNAL_BASE_URL=https://api.ustarotam.com/api/v1
NEXT_PUBLIC_API_BASE_URL=https://api.ustarotam.com/api/v1
```

Sunucuda `.env.local` **bulunmamalıdır**. Yerel dosyalar production
değerlerini ezebilir.

## 4. Bağımlılıkları kurma ve çalıştırma

Paket hazır build içerdiği için `npm run build` gerekmez:

```bash
cd /var/www/usta-rotam
sudo -u ustarotam npm ci --omit=dev
sudo -u ustarotam env NODE_ENV=production PORT=3000 npm run start
```

Bu akış paket hazırlanırken ayrı bir dizinde test edilmiştir:

- `/` → 200
- `/en` → 200
- `/usta-ara` → 200
- `/api/health` → 200
- `/hesabim` → 200
- geçersiz usta profili → 404

Test başarılıysa `Ctrl+C` ile durdurup systemd servisine geçin.

## 5. systemd servisi

`/etc/systemd/system/usta-rotam.service`:

```ini
[Unit]
Description=Usta Rotam
After=network.target

[Service]
Type=simple
User=ustarotam
WorkingDirectory=/var/www/usta-rotam
EnvironmentFile=/var/www/usta-rotam/.env.production
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

`ExecStart` içindeki npm yolunu kontrol edin:

```bash
which npm
```

Farklıysa yolu güncelleyin. Sonra:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now usta-rotam
sudo systemctl status usta-rotam
curl -i http://127.0.0.1:3000/api/health
```

Log takibi:

```bash
sudo journalctl -u usta-rotam -f
```

## 6. Nginx reverse proxy

`/etc/nginx/sites-available/usta-rotam`:

```nginx
server {
    listen 80;
    server_name ustarotam.com www.ustarotam.com;
    return 301 https://ustarotam.com$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name ustarotam.com;

    ssl_certificate     /etc/letsencrypt/live/ustarotam.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ustarotam.com/privkey.pem;

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
        proxy_read_timeout 60s;
    }
}
```

Etkinleştirme:

```bash
sudo ln -s /etc/nginx/sites-available/usta-rotam /etc/nginx/sites-enabled/usta-rotam
sudo nginx -t
sudo systemctl reload nginx
```

Sertifika yoksa:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ustarotam.com -d www.ustarotam.com
```

Cloudflare kullanılıyorsa SSL/TLS modu **Full (strict)** olmalıdır. Origin
sertifikası olarak Cloudflare Origin Certificate de kullanılabilir.

## 7. Cloudflare / DNS

Şu anda `https://ustarotam.com` Cloudflare üzerinden **503** ve
“UstaRotam yakinda hizmetinizde.” placeholder'ı döndürüyor. Yeni sunucunun
devreye girmesi için:

1. Cloudflare'deki mevcut placeholder Worker / Pages route'unu kaldırın veya
   yeni origin'e yönlendirin.
2. `ustarotam.com` DNS kaydını sunucu IP'sine yönlendirin; proxy (turuncu
   bulut) açık kalsın.
3. SSL/TLS modunu **Full (strict)** yapın.
4. `www.ustarotam.com` → `ustarotam.com` 308 yönlendirmesini koruyun.
5. Cloudflare cache kuralında HTML ve `/api/*` cache'lenmesin;
   `/_next/static/*` cache'lenebilir.
6. Sunucu güvenlik duvarında yalnızca 80/443 açık olsun.

Backend CORS'u kontrol edildi: `https://ustarotam.com` ve
`https://www.ustarotam.com` origin'leri API tarafından kabul ediliyor.

## 8. Yayın sonrası kontrol

```bash
curl -I https://ustarotam.com
curl https://ustarotam.com/api/health
curl https://ustarotam.com/robots.txt
curl https://ustarotam.com/sitemap.xml | head
curl -I https://ustarotam.com/en
curl -I https://ustarotam.com/usta/gecersiz-slug   # 404 olmalı
```

Beklenenler:

- Ana sayfa ve `/en` → 200
- `/api/health` → `{"status":"ok",...}`
- Canonical → `https://ustarotam.com`
- Sitemap URL'leri → `https://ustarotam.com/...`
- Geçersiz profil → 404
- `www` → apex'e redirect

Ardından tarayıcıda giriş/kayıt, hesap paneli, favori ekleme, dil değiştirme
ve mobil görünümü test edin.

## 9. Sunucuda yeniden build (gerekirse)

Platform farkı veya bağımlılık sorunu olursa:

```bash
cd /var/www/usta-rotam
sudo -u ustarotam npm ci
sudo -u ustarotam npm run build
sudo systemctl restart usta-rotam
```

`npm ci` sonrası tekrar `npm run build` çalıştırmak gerekir. Build öncesi
`.env.production` içindeki `SITE_URL` ve `NEXT_PUBLIC_API_BASE_URL`
değerlerinin doğru olduğundan emin olun.

## 10. Sorun giderme

| Belirti | Kontrol |
|---|---|
| Cloudflare 502 | `systemctl status usta-rotam`, port 3000 ve Nginx |
| Cloudflare 503 / placeholder | Worker/Pages route, DNS ve SSL modu |
| `next start` başlamıyor | Node >= 20.9, `npm ci --omit=dev`, `journalctl` |
| Görseller optimize edilmiyor | `.next/cache` yazma izni, `sharp` kurulumu |
| Canonical `localhost` | Build `SITE_URL` olmadan alınmış; yeniden build |
| API çağrıları CORS hatası | Backend allowlist'inde apex/www origin'leri |
| 3000 portu dışarıdan erişilebilir | Nginx dışında portu kapatın |

İzin sorunu için:

```bash
sudo chown -R ustarotam:ustarotam /var/www/usta-rotam
```

## 11. Güvenlik notları

- `.env.production` dosya izni `600` olmalı.
- 3000 portu internete açılmamalı; yalnızca Nginx erişmeli.
- `.env.local`, `.git`, `node_modules` paket içinde yoktur.
- Secret/credential paket içine eklenmemelidir.
- Cloudflare proxy ve HTTPS zorunlu tutulmalıdır.
- Mevcut sürümü geri almak için önceki `.next` klasörünü veya önceki release
  dizinini saklayın; yeni sürümü ayrı dizine alıp symlink kullanmak en
  güvenlisidir.
