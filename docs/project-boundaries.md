---
description: Proje iş bölümü ve sınır kuralları — Geliştirici 2 perspektifinden
---

# Proje İş Bölümü & Sınır Kuralları

Bu proje 2 geliştirici tarafından yürütülmektedir. Aşağıdaki kurallar kesindir.

## Senin Rolün

**Sen Geliştirici 2'sin.**

## Kesin Kurallar

1. `frontend/`, `backend/`, `database/` klasörlerine **dokunma**.
2. Smart contract ABI'larını doğrudan değiştirme — sadece import et ve kullan.
3. CP/XP bakiyesi hesaplama mantığını frontend veya backend'de kendin yazma; her zaman Geliştirici 1'in API'sinden çek.
4. Görev doğrulama logic'ini backend'de implemente etme — sadece `/tasks/:id/verify` endpoint'ine forward et.
5. `algorithm/` klasörüne dokunma.
6. Fiyatlandırma formülünü frontend veya kendi backend'inde hesaplama — her zaman quote endpoint'inden al.

## Sorumluluk Alanın

Sadece şu klasörlere dokunabilirsin:

- `contracts/` — Solidity smart contract'lar
- `algorithm/` — Dinamik fiyatlandırma motoru
- `listener/` — Blockchain event listener servisi

## Geliştirici 1'in Sunduğu (Senin Kullandığın)

- `GET /internal/stock/:categoryId` — stok verisi
- `GET /internal/market-volume/:categoryId` — pazar hacmi verisi

## Geliştirici 2'nin Sunduğu (Geliştirici 1'in Kullandığı)

- `GET /exchange/rate/:categoryId`
- `GET /exchange/quote?categoryId=&cpAmount=`
- `GET /exchange/chart/:categoryId`
- `GET /users/:userId/balances`
- `GET /users/:userId/transactions`
- `POST /tasks/:id/verify`
- `POST /xp/apply-discount`

## Geliştirici 2 API'si Hazır Değilse

Mock data kullan, hiçbir zaman kendi implementasyonunu yazma. Örnek:

```typescript
// DEV2_API_READY: false — mock kullanılıyor
const rate = DEV2_API_READY
  ? await fetchExchangeRate(categoryId)
  : { cpToXp: 10, lastUpdated: new Date() };
```

Her mock'a `// DEV2_API_READY` yorumu ekle.

## Entegrasyon Noktaları

| Nokta           | Geliştirici 1'in görevi     | Senin görevin                   |
| --------------- | --------------------------- | ------------------------------- |
| Cüzdan bağlama  | Arayüz + signature gönderme | Signature doğrulama endpoint'i  |
| Stok verisi     | Internal endpoint yaz       | Bu endpoint'i çek               |
| Görev tamamlama | UI + forward isteği         | Doğrulama ve CP mint            |
| XP indirim      | Checkout'ta endpoint çağır  | `apply-discount` endpoint'i yaz |
| Anlık fiyat     | WebSocket/SSE dinle         | WebSocket/SSE yayınla           |

## Klasör Yapısı

```
/
├── frontend/        → Geliştirici 1 (DOKUNMA)
├── backend/         → Geliştirici 1 (DOKUNMA)
├── database/        → Geliştirici 1 (DOKUNMA)
├── contracts/       → Geliştirici 2 (SENİN)
├── algorithm/       → Geliştirici 2 (SENİN)
├── listener/        → Geliştirici 2 (SENİN)
└── shared/
    └── api-contracts.md   → İkisi birlikte yazar
```
