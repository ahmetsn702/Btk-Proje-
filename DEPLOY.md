# Monitoring, Analytics & Backup Stratejisi

## 1. Uptime Monitoring

### Önerilen: BetterUptime veya UptimeRobot (ücretsiz tier)

| Endpoint                                         | Kontrol Aralığı | Alert         |
| ------------------------------------------------ | --------------- | ------------- |
| Frontend (Vercel) — `https://domain.com`         | 1 dk            | Slack + Email |
| Backend API — `https://api.domain.com/`          | 1 dk            | Slack + Email |
| Backend Health — `https://api.domain.com/health` | 30 sn           | Slack + Email |

### Kurulum

1. UptimeRobot'ta hesap aç
2. HTTP(s) monitor ekle (yukarıdaki endpoint'ler)
3. Alert contact: Slack webhook + email
4. Status page oluştur (opsiyonel — kullanıcılara açık)

---

## 2. Analytics

### Önerilen: Plausible (privacy-friendly) veya PostHog (daha detaylı)

**Plausible:**

- GDPR uyumlu, cookie-free
- `<script defer data-domain="domain.com" src="https://plausible.io/js/script.js"></script>`
- Layout'a ekle

**PostHog (self-hosted veya cloud):**

- Event tracking, session replay, feature flags
- `posthog.capture('product_viewed', { productId })`
- `posthog.capture('task_completed', { taskId, rewardCp })`
- `posthog.capture('swap_executed', { categoryId, cpAmount, xpReceived })`

### Takip Edilecek Metrikler

- Günlük aktif kullanıcı (DAU)
- Görev tamamlama oranı
- Takas işlem hacmi
- Sepet dönüşüm oranı (cart → checkout → order)
- Ortalama sipariş değeri
- XP kullanım oranı (checkout'ta XP kullanan %)

---

## 3. Error Tracking — Sentry

Zaten entegre edildi (Faz 15). Ek ayarlar:

- **Alert rules:**
  - Yeni hata → Slack bildirimi
  - Hata spike (>10/dk) → PagerDuty/email
- **Performance monitoring:** tracesSampleRate: 0.2 (production)
- **Release tracking:** CI'da `sentry-cli releases` ile versiyon tag'leme

---

## 4. Backup Stratejisi

### Database (Neon Postgres)

| Yöntem                      | Sıklık        | Saklama  | Otomatik |
| --------------------------- | ------------- | -------- | -------- |
| Neon Point-in-Time Recovery | Sürekli       | 7 gün    | ✅       |
| Neon Branch Snapshot        | Deploy öncesi | Sınırsız | Manuel   |
| pg_dump → S3                | Günlük (cron) | 30 gün   | ✅       |

### pg_dump Cron Script (Railway'de veya ayrı worker)

```bash
#!/bin/bash
# backup.sh — günlük çalışır
DATE=$(date +%Y-%m-%d)
FILENAME="backup-${DATE}.sql.gz"

pg_dump "$DIRECT_URL" | gzip > /tmp/$FILENAME
aws s3 cp /tmp/$FILENAME s3://btk-proje-backups/db/$FILENAME
rm /tmp/$FILENAME

# 30 günden eski backup'ları sil
aws s3 ls s3://btk-proje-backups/db/ | awk '{print $4}' | sort | head -n -30 | \
  xargs -I {} aws s3 rm s3://btk-proje-backups/db/{}
```

### Restore Prosedürü

```bash
# 1. Neon PITR (tercih edilen)
# Neon dashboard → Project → Restore → Tarih seç

# 2. pg_dump'tan restore
aws s3 cp s3://btk-proje-backups/db/backup-2026-05-14.sql.gz /tmp/
gunzip /tmp/backup-2026-05-14.sql.gz
psql "$DIRECT_URL" < /tmp/backup-2026-05-14.sql
```

---

## 5. Domain + SSL

### Kurulum

1. Domain satın al (Namecheap, Cloudflare, Google Domains)
2. DNS ayarları:
   - `domain.com` → Vercel (A record veya CNAME)
   - `api.domain.com` → Railway custom domain
3. SSL: Vercel ve Railway otomatik Let's Encrypt sağlar
4. Vercel dashboard → Settings → Domains → domain.com ekle
5. Railway dashboard → Service → Settings → Custom Domain → api.domain.com

### Env Güncellemeleri

```env
# Frontend
NEXT_PUBLIC_API_URL=https://api.domain.com

# Backend
CORS_ORIGIN=https://domain.com
```

---

## 6. Checklist — Go Live

- [ ] Neon DB oluşturuldu, migration'lar çalıştırıldı
- [ ] Railway'de backend deploy edildi, env'ler set edildi
- [ ] Vercel'de frontend deploy edildi, env'ler set edildi
- [ ] Custom domain bağlandı (frontend + backend)
- [ ] SSL aktif (otomatik)
- [ ] Sentry DSN set edildi (frontend + backend)
- [ ] UptimeRobot monitor'ları eklendi
- [ ] Analytics script eklendi
- [ ] Backup cron aktif
- [ ] Seed data yüklendi (kategoriler, test ürünleri)
- [ ] Rate limiting production değerleri ayarlandı
- [ ] CORS origin production domain'e set edildi
