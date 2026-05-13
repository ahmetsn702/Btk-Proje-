---
inclusion: always
---

# Proje İş Bölümü & Sınır Kuralları

Bu proje 2 geliştirici tarafından yürütülmektedir. Aşağıdaki kurallar kesindir — öneri üretirken, kod yazarken veya dosya oluştururken bu sınırlara uy.

---

## Geliştirici 1 (Bu Kiro instance'ı) — Sorumluluk Alanı

**Sahip olduğu her şey:**

- `frontend/` — tüm arayüzler (Next.js / React)
- `backend/` — e-ticaret API'leri, auth, sipariş, sepet
- `database/` — PostgreSQL şeması, migration'lar, seed data
- Kullanıcı kimlik doğrulaması (JWT, session)
- Ürün kataloğu, stok yönetimi, sipariş akışı
- Görev panosu UI (frontend)
- Takas ekranı UI (frontend — backend veriyi Geliştirici 2'den alır)
- Web3 cüzdan bağlantısı UI (Wagmi/RainbowKit — sadece arayüz)
- `tasks` tablosu ve `user_task_completions` tablosu (DB sahibi benim)

**Geliştirici 1'in dışarıya sunduğu:**

- `GET /internal/stock/:categoryId` — Geliştirici 2'nin algoritması için stok verisi
- `GET /internal/market-volume/:categoryId` — pazar hacmi verisi

---

## Geliştirici 2 — Sorumluluk Alanı

**Sahip olduğu her şey:**

- `blockchain/` veya `contracts/` — tüm Solidity smart contract'lar
- `algorithm/` — dinamik fiyatlandırma motoru
- `listener/` — blockchain event listener servisi
- Görev doğrulama backend servisi
- CP/XP token mantığı (mint, burn, transfer)
- Exchange contract ve takas logic'i

**Geliştirici 2'nin dışarıya sunduğu (bunları fetch et, kendin yazma):**

- `GET /exchange/rate/:categoryId`
- `GET /exchange/quote?categoryId=&cpAmount=`
- `GET /exchange/chart/:categoryId`
- `GET /users/:userId/balances`
- `GET /users/:userId/transactions`
- `POST /tasks/:id/verify`
- `POST /xp/apply-discount`

---

## Kesin Kurallar

1. `contracts/` veya `blockchain/` klasörü altında hiçbir şey oluşturma veya değiştirme.
2. Smart contract ABI'larını doğrudan değiştirme — sadece import et ve kullan.
3. CP/XP bakiyesi hesaplama mantığını frontend veya backend'de kendin yazma; her zaman Geliştirici 2'nin API'sinden çek.
4. Görev doğrulama logic'ini backend'de implemente etme — sadece `/tasks/:id/verify` endpoint'ine forward et.
5. `algorithm/` klasörüne dokunma.
6. Fiyatlandırma formülünü frontend veya kendi backend'inde hesaplama — her zaman quote endpoint'inden al.

---

## Geliştirici 2'nin API'si Hazır Değilse

Mock data kullan, hiçbir zaman kendi implementasyonunu yazma. Örnek:

```typescript
// DEV2_API_READY: false — mock kullanılıyor
const rate = DEV2_API_READY
  ? await fetchExchangeRate(categoryId)
  : { cpToXp: 10, lastUpdated: new Date() };
```

Her mock'a `// DEV2_API_READY` yorumu ekle — entegrasyon anında kolayca bulunabilsin.

---

## Entegrasyon Noktaları (Ortak Çalışma)

| Nokta | Geliştirici 1'in görevi | Geliştirici 2'nin görevi |
|---|---|---|
| Cüzdan bağlama | Arayüz + signature gönderme | Signature doğrulama endpoint'i |
| Stok verisi | Internal endpoint yaz | Bu endpoint'i çek |
| Görev tamamlama | UI + forward isteği | Doğrulama ve CP mint |
| XP indirim | Checkout'ta endpoint çağır | `apply-discount` endpoint'i yaz |
| Anlık fiyat | WebSocket/SSE dinle | WebSocket/SSE yayınla |

---

## Klasör Yapısı (Genel)

```
/
├── frontend/        → Geliştirici 1
├── backend/         → Geliştirici 1
├── database/        → Geliştirici 1
├── contracts/       → Geliştirici 2 (DOKUNMA)
├── algorithm/       → Geliştirici 2 (DOKUNMA)
├── listener/        → Geliştirici 2 (DOKUNMA)
└── shared/
    └── api-contracts.md   → İkisi birlikte yazar
```
