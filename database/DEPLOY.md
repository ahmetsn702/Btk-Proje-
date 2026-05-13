# Managed PostgreSQL — Neon Yapılandırması

## Kurulum

1. [neon.tech](https://neon.tech) üzerinden proje oluştur
2. Connection string'i al (pooled + direct)
3. Environment variable'ları ayarla

## Environment Variables

```env
# Production (Neon pooled — uygulama bağlantısı)
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require&pgbouncer=true"

# Direct connection (migration'lar için)
DIRECT_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"
```

## Prisma Config

`database/prisma/schema.prisma` dosyasında:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Migration Komutları

```bash
# Geliştirme — migration oluştur
cd database && npx prisma migrate dev --name <migration_name>

# Production — migration uygula
cd database && npx prisma migrate deploy

# Seed data
cd database && npx prisma db seed
```

## Railway'de DB Ayarı

Railway dashboard'da backend service'e şu env'leri ekle:

- `DATABASE_URL` → Neon pooled connection string
- `DIRECT_URL` → Neon direct connection string

## Neon Özellikleri

- **Branching:** Dev/staging için DB branch'leri oluşturulabilir
- **Auto-suspend:** Kullanılmadığında compute kapanır (maliyet tasarrufu)
- **Point-in-time recovery:** Son 7 güne kadar geri dönülebilir
- **Connection pooling:** PgBouncer dahili
