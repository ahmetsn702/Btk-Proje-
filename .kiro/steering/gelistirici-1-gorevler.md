---
inclusion: always
---

# Geliştirici 1 — Çekirdek E-Ticaret & Kullanıcı Deneyimi (Full-Stack Web2)

> **Sorumluluk Alanı:** Frontend (tüm arayüzler) + Web2 Backend (e-ticaret, auth, veritabanı) + Geliştirici 2'nin sunduğu Web3/algoritma verilerini arayüze taşımak.
>
> **Önerilen Stack:** Next.js (React) + TypeScript + Tailwind, Node.js (NestJS/Express) veya Python (FastAPI), PostgreSQL + Redis, JWT, Stripe/iyzico, Ethers.js veya Wagmi (cüzdan bağlantısı için).

---

## Faz 0 — Hazırlık & Kurulum

- [x] Git repo'yu kurmak (monorepo veya `frontend/` + `backend/` ayrı)
- [x] Branch stratejisini belirlemek (`main`, `dev`, `feature/*`)
- [x] `.env.example` ve secret yönetimini ayarlamak
- [x] ESLint + Prettier + Husky pre-commit hook
- [x] Docker Compose (Postgres + Redis) ile local dev ortamı
- [ ] Issue/task board (GitHub Projects veya Linear)
- [ ] Geliştirici 2 ile API kontratlarını (OpenAPI/Swagger şeması) konuşmak

---

## Faz 1 — Veritabanı Tasarımı (PostgreSQL)

- [x] `users` tablosu (id, email, password_hash, wallet_address, created_at, ...)
- [x] `categories` tablosu (ürün kategorileri — CP kategorileriyle eşleşecek)
- [x] `products` tablosu (id, name, description, price_fiat, stock, category_id, images, ...)
- [x] `cart` ve `cart_items` tabloları
- [x] `orders` ve `order_items` tabloları (status, payment_status, shipping_address, ...)
- [x] `addresses` tablosu (kullanıcı adresleri)
- [x] `tasks` tablosu (Geliştirici 2 ile şema üzerinde uzlaşılacak)
- [x] `user_task_completions` tablosu
- [x] Migration tool (Prisma / TypeORM / Alembic) kurulumu
- [x] Seed data scripti (test ürünleri, kategoriler)
- [x] Index'ler ve foreign key constraint'ler

---

## Faz 2 — Backend: Kimlik Doğrulama & Kullanıcı Yönetimi

- [ ] `POST /auth/register` (email + password)
- [ ] `POST /auth/login` (JWT access + refresh token)
- [ ] `POST /auth/refresh`
- [ ] `POST /auth/logout`
- [ ] Email doğrulama akışı (opsiyonel ama önerilir)
- [ ] Şifre sıfırlama akışı
- [ ] `GET /users/me` (mevcut kullanıcı profili)
- [ ] `PATCH /users/me` (profil güncelleme)
- [ ] `POST /users/me/wallet` (Web3 cüzdan adresini hesaba bağlama — signature doğrulamalı)
- [ ] Auth middleware (route koruma)
- [ ] Rate limiting (özellikle login/register)
- [ ] Bcrypt/argon2 ile şifre hashing

---

## Faz 3 — Backend: Ürün & Katalog API

- [ ] `GET /products` (filter, sort, pagination, search)
- [ ] `GET /products/:id`
- [ ] `GET /categories`
- [ ] `GET /categories/:id/products`
- [ ] Admin endpoint'leri (`POST/PATCH/DELETE /products`) — basit admin guard
- [ ] Ürün görselleri için storage (S3/Cloudinary/local)
- [ ] Stok düşürme/artırma için transaction-safe servis (sipariş anında race condition önleme)
- [ ] **Geliştirici 2 için:** stok bilgisini publish eden internal endpoint veya event (algoritma stok verisini buradan çekecek)

---

## Faz 4 — Backend: Sepet & Sipariş

- [ ] `GET /cart`
- [ ] `POST /cart/items` (ürün ekle)
- [ ] `PATCH /cart/items/:id` (adet güncelle)
- [ ] `DELETE /cart/items/:id`
- [ ] `POST /orders/checkout` — XP indirimini hesaba katacak (Geliştirici 2'nin verdiği oran ile)
- [ ] Stok kontrolü ve rezervasyon mantığı
- [ ] Ödeme entegrasyonu (Stripe/iyzico) — test mode ile başla
- [ ] `GET /orders` (kullanıcı sipariş geçmişi)
- [ ] `GET /orders/:id`
- [ ] Sipariş durum güncellemeleri (pending → paid → shipped → delivered)
- [ ] Webhook handler (ödeme provider'dan)

---

## Faz 5 — Frontend: Temel Yapı

- [ ] Next.js projesi + routing yapısı
- [ ] Tailwind + UI library seçimi (shadcn/ui önerilir)
- [ ] Layout component'leri (Navbar, Footer, Sidebar)
- [ ] Tema sistemi (dark/light opsiyonel)
- [ ] API client (axios/fetch wrapper + interceptor — JWT ekleme, refresh logic)
- [ ] State management (Zustand veya Redux Toolkit)
- [ ] Form library (React Hook Form + Zod)
- [ ] Toast/notification sistemi
- [ ] Loading & error state pattern'leri
- [ ] 404 / 500 sayfaları

---

## Faz 6 — Frontend: Auth Sayfaları

- [ ] `/register` sayfası
- [ ] `/login` sayfası
- [ ] `/forgot-password` ve `/reset-password`
- [ ] Email doğrulama sayfası
- [ ] Protected route HOC veya middleware
- [ ] Auth context / store

---

## Faz 7 — Frontend: Ürün & Katalog

- [ ] Anasayfa (öne çıkan ürünler, kategoriler, banner)
- [ ] `/products` — listeleme, filtreleme (kategori, fiyat aralığı), sıralama, arama
- [ ] `/products/:id` — detay sayfası, görseller, "sepete ekle"
- [ ] `/categories/:slug` — kategori bazlı listeleme
- [ ] Pagination veya infinite scroll
- [ ] Skeleton loader'lar

---

## Faz 8 — Frontend: Sepet & Ödeme

- [ ] `/cart` — sepet sayfası, adet değiştirme, kaldırma
- [ ] **XP indirim toggle/slider** — kullanıcı ne kadar XP harcayacağını seçer (anlık XP→fiat oranı Geliştirici 2'den)
- [ ] `/checkout` — adres seçimi, ödeme yöntemi, özet
- [ ] Ödeme provider entegrasyonu (Stripe Elements / iyzico iframe)
- [ ] `/orders/success/:id` ve `/orders/failed`
- [ ] Anlık fiyat hesaplama (sepet + XP indirimi + kargo)

---

## Faz 9 — Frontend: Kullanıcı Profili

- [ ] `/profile` — kişisel bilgiler, adresler, parola değiştirme
- [ ] `/profile/orders` — sipariş geçmişi
- [ ] `/profile/wallet` — bağlı cüzdan adresi, CP bakiyeleri (kategori bazlı), XP bakiyesi
- [ ] `/profile/transactions` — işlem geçmişi (görev kazançları + takas işlemleri — Geliştirici 2'den)

---

## Faz 10 — Frontend: Görev Panosu (Dashboard)

- [ ] `/tasks` — mevcut görev listesi
- [ ] Görev kartı component'i (kategori, ödül CP, zorluk, süre)
- [ ] Görev detay sayfası / modal
- [ ] "Görevi Başlat" / "Tamamladım" butonları
- [ ] Tamamlama isteğini Geliştirici 2'nin doğrulama servisine gönderme
- [ ] Başarılı tamamlamada CP kazanım animasyonu/bildirimi
- [ ] Tamamlanan görevler geçmişi

---

## Faz 11 — Frontend: Takas (Exchange) Ekranı

- [ ] `/exchange` — kategori seçici (hangi CP'yi XP'ye dönüştürecek)
- [ ] Anlık CP→XP oranını gösteren panel (Geliştirici 2'nin algoritmasından)
- [ ] **Canlı fiyat grafiği** — Recharts veya TradingView lightweight-charts
- [ ] Miktar girişi + "ne kadar XP alacağı" hesaplaması
- [ ] Slippage/onay ekranı
- [ ] İşlemi başlatma → Geliştirici 2'nin smart contract çağrısını tetikleme
- [ ] İşlem durumu takibi (pending/confirmed/failed)
- [ ] İşlem geçmişi tablosu

---

## Faz 12 — Web3 Cüzdan Entegrasyonu (Frontend)

- [ ] Wagmi + RainbowKit (veya ConnectKit) kurulumu
- [ ] "Cüzdanı Bağla" butonu (Navbar)
- [ ] Bağlı ağ kontrolü (Polygon/Arbitrum vb.) — yanlış ağda uyarı
- [ ] Cüzdan adresini backend'e signature ile bağlama (`/users/me/wallet`)
- [ ] Geliştirici 2'nin contract ABI'larını import etme
- [ ] Transaction trigger fonksiyonları (takas için)
- [ ] İşlem onay/red/error state'leri
- [ ] Gas fee tahmini gösterme

---

## Faz 13 — Entegrasyon Noktaları (Geliştirici 2 ile Ortak)

- [ ] Stok verisini algoritmaya açan internal endpoint/event
- [ ] Görev tamamlama isteğini Geliştirici 2'nin doğrulama servisine forward eden endpoint
- [ ] XP bakiyesini ödeme akışında kullanma — Geliştirici 2'nin servisinden çekilecek
- [ ] CP/XP bakiyelerini profil & sepet ekranında gösterme
- [ ] Anlık fiyat oranlarını WebSocket veya polling ile alma
- [ ] Smart contract event'lerini dinleyip UI'da güncelleme
- [ ] Ortak error code / hata mesajı sözlüğü

---

## Faz 14 — Test & Kalite

- [ ] Backend unit testler (Jest/Vitest veya pytest)
- [ ] API entegrasyon testleri (kritik akışlar: register → login → sepete ekle → ödeme)
- [ ] Frontend component testleri (React Testing Library)
- [ ] E2E test (Playwright veya Cypress) — kayıt → alışveriş → görev → takas flow
- [ ] Mobil responsive kontrol
- [ ] Lighthouse / Web Vitals optimizasyonu
- [ ] Accessibility (a11y) basic pass

---

## Faz 15 — Deploy & İzleme

- [ ] Frontend: Vercel veya Netlify
- [ ] Backend: Railway / Render / Fly.io / AWS
- [ ] DB: managed Postgres (Supabase, Neon, RDS)
- [ ] Domain + SSL
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Error tracking (Sentry)
- [ ] Basic analytics (Plausible/PostHog)
- [ ] Uptime monitoring
- [ ] Backup stratejisi (DB snapshot)

---

## Kritik Notlar

- **Stok = tek doğru kaynak (single source of truth)**. Algoritma stok için sana bağımlı, bu yüzden stok güncellemelerinin atomic olması şart (transaction + row lock).
- **XP indirimini ödeme akışında uygularken** Geliştirici 2'den gelen oranı sunucu tarafında **yeniden doğrula** — client'a güvenme, fiyat manipülasyonu önle.
- **Cüzdan bağlama mutlaka signature ile** (`personal_sign`) — kullanıcı o cüzdanın sahibi olduğunu kanıtlasın.
- API kontratları erkenden netleşsin; Geliştirici 2 ile mock data üzerinden paralel çalışın, blocking olmasın.
