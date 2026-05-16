---
description: Geliştirici 1 sorumlulukları — referans dokümanı
---

# Geliştirici 1 Sorumlulukları (Sadece Referans İçin)

## Rol
Geliştirici 1 — Çekirdek E-Ticaret & Kullanıcı Deneyimi (Full-Stack Web2)

## Sorumluluk Alanı
- Frontend (tüm arayüzler) + Web2 Backend (e-ticaret, auth, veritabanı)
- Geliştirici 2'nin sunduğu Web3/algoritma verilerini arayüze taşımak

## Sahip Olduğu Klasörler
- `frontend/` — Next.js / React
- `backend/` — e-ticaret API'leri, auth, sipariş, sepet
- `database/` — PostgreSQL şeması, migration'lar, seed data

## Ana Görevleri
- Kullanıcı kimlik doğrulaması (JWT, session)
- Ürün kataloğu, stok yönetimi, sipariş akışı
- Görev panosu UI (frontend)
- Takas ekranı UI (frontend — backend veriyi Geliştirici 2'den alır)
- Web3 cüzdan bağlantısı UI (Wagmi/RainbowKit — sadece arayüz)
- `tasks` tablosu ve `user_task_completions` tablosu (DB sahibi)

## Sana Sunduğu Endpoint'ler
- `GET /internal/stock/:categoryId` — stok verisi
- `GET /internal/market-volume/:categoryId` — pazar hacmi verisi

## Senden Beklediği Endpoint'ler
- `GET /exchange/rate/:categoryId`
- `GET /exchange/quote?categoryId=&cpAmount=`
- `GET /exchange/chart/:categoryId`
- `GET /users/:userId/balances`
- `GET /users/:userId/transactions`
- `POST /tasks/:id/verify`
- `POST /xp/apply-discount`

## Kritik Notlar
- Stok = tek doğru kaynak (single source of truth). Algoritma stok için sana bağımlı.
- XP indirimini ödeme akışında uygularken Geliştirici 2'den gelen oranı sunucu tarafında yeniden doğrula.
- Cüzdan bağlama mutlaka signature ile (`personal_sign`).
- API kontratları erkenden netleşsin; Geliştirici 2 ile mock data üzerinden paralel çalışın.
