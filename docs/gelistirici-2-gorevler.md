---
description: Geliştirici 2 görev listesi — Ekonomi Motoru & Blockchain
---

# Geliştirici 2 — Ekonomi Motoru & Blockchain (Web3 + Algoritma)

> **Sorumluluk Alanı:** Tokenomics tasarımı + Smart Contract geliştirme + Dinamik fiyatlandırma algoritması + Görev doğrulama servisi + Web3↔Web2 senkronizasyon köprüsü.
>
> **Önerilen Stack:** Solidity + Hardhat veya Foundry, OpenZeppelin, Ethers.js, Node.js/TypeScript veya Python (FastAPI) — algoritma & doğrulama servisleri için, Polygon / Arbitrum / Base testnet, The Graph (opsiyonel indexing), Redis (cache + fiyat state).

---

## Faz 0 — Hazırlık & Tokenomics Tasarımı (Kağıt Üzerinde)

- [ ] Toolchain kurulumu: Hardhat veya Foundry, Solidity, OpenZeppelin
- [ ] Cüzdan + testnet faucet (Polygon Amoy / Arbitrum Sepolia)
- [ ] Geliştirici 1 ile API kontratlarını netleştirmek
- [ ] **Tokenomics dokümanı yazmak:**
  - [ ] CP nedir, kategori sayısı kaç, her CP nasıl basılır (mint)?
  - [ ] XP nedir, toplam arz var mı, nasıl yaratılır?
  - [ ] CP→XP dönüşüm formülü (AMM benzeri: `XP_out = f(CP_in, talep, stok, pazar_hacmi)`)
  - [ ] Fee modeli (takas işleminden kesinti olacak mı?)
  - [ ] Slippage tolerance mantığı
  - [ ] XP'nin gerçek alışverişte indirim olarak kullanım oranı (1 XP = X TL)
- [ ] Whitepaper formatında özet — takım içi referans için

---

## Faz 1 — Smart Contract Mimari Tasarımı

- [ ] Mimari diyagramı çizmek (hangi contract ne yapar)
- [ ] Contract listesi:
  - [ ] `CategoryPointToken` (ERC-20 — her kategori için ayrı instance veya tek `ERC-1155` ile multi-token)
  - [ ] `ExtendedPointToken` (XP — ERC-20)
  - [ ] `Exchange` (CP↔XP takas havuzu)
  - [ ] `TaskRewardManager` (görev tamamlamada CP mint eden contract)
  - [ ] `AccessControl` / `Ownable` — admin yetkileri
- [ ] **ERC-1155 vs çoklu ERC-20 kararı** (gas + UX açısından ERC-1155 daha verimli olabilir)
- [ ] Upgradeability stratejisi (UUPS proxy mi, immutable mı?)
- [ ] Reentrancy ve known attack vector listesi

---

## Faz 2 — Token Contract'ları

- [ ] `ExtendedPointToken.sol` (ERC-20, mint/burn yetkisi sadece Exchange'de)
- [ ] `CategoryPointToken.sol` veya `CategoryPoints1155.sol`
  - [ ] Mint yetkisi → `TaskRewardManager`
  - [ ] Burn yetkisi → `Exchange` (CP→XP dönüşümünde yakacak)
- [ ] OpenZeppelin'in `AccessControl` ile rol bazlı yetki (MINTER_ROLE, BURNER_ROLE)
- [ ] Transfer kısıtlamaları (CP'ler kullanıcılar arası serbestçe transfer edilebilir mi? — tokenomics kararına göre)
- [ ] Events: `Minted`, `Burned`, `Transferred` (indexing için kritik)
- [ ] Unit testler (Hardhat/Foundry)

---

## Faz 3 — Exchange (Takas) Contract'ı

- [ ] `Exchange.sol` iskeleti
- [ ] `swapCPforXP(categoryId, cpAmount, minXpOut)` fonksiyonu
- [ ] Slippage protection (`minXpOut` parametresi)
- [ ] Reentrancy guard (OpenZeppelin)
- [ ] Pausable mekanizma (acil durum)
- [ ] Fee mekanizması (varsa)
- [ ] Anlık oran sorgulaması: `getQuote(categoryId, cpAmount) returns (xpOut)` — view function
- [ ] Oracle / fiyat güncelleme entegrasyonu:
  - [ ] **Karar:** fiyat on-chain mi hesaplanacak (deterministik formül) yoksa off-chain hesaplanıp oracle ile mi push edilecek?
  - [ ] Off-chain seçilirse: signed price ile (ECDSA imza doğrulama) veya Chainlink ile
- [ ] Events: `Swap`, `PriceUpdated`
- [ ] Unit + invariant testler

---

## Faz 4 — Dinamik Fiyatlandırma Algoritması (Off-chain Servis)

- [ ] Algoritma servisi için repo/klasör (Node.js veya Python)
- [ ] Girdi parametrelerini netleştir:
  - [ ] Kategori bazlı CP arzı (toplam basılmış CP)
  - [ ] Kategori bazlı CP talep hacmi (son N saatte yapılan takas)
  - [ ] İlgili kategorideki ürünlerin **stok durumu** (Geliştirici 1'in DB'sinden çekilecek)
  - [ ] İlgili kategorideki ürünlerin **pazar hacmi** (satış sayısı / ciro)
  - [ ] Toplam XP arzı
- [ ] Fiyat formülü v1 (basit constant product market maker):
  - [ ] `price = (xpPool / cpPool) * marketDemandFactor * stockScarcityFactor`
  - [ ] `marketDemandFactor` ve `stockScarcityFactor` için ağırlık tunelama
- [ ] Hesaplama döngüsü (cron / interval — 30sn? 5dk?)
- [ ] Sonucu Redis'e cache'lemek (her kategori için anlık oran)
- [ ] On-chain'e push mekanizması (eğer oracle modeli seçildiyse): imzalı transaction
- [ ] **Backtest scripti** — geçmiş veri uydurarak fiyat eğrilerini simüle et
- [ ] Edge case'ler: sıfır likidite, sıfır stok, manipülasyon savunması (max change per interval)

---

## Faz 5 — Görev Doğrulama Motoru

- [ ] `tasks` tablosunun şemasını Geliştirici 1 ile netleştir (kim tutacak?)
- [ ] Görev tipleri taksonomisi:
  - [ ] Ürün incelemesi okuma
  - [ ] Ürün paylaşma (sosyal medya)
  - [ ] Anket doldurma
  - [ ] Quiz çözme
  - [ ] Davet (referral)
- [ ] Her tip için doğrulama mantığı:
  - [ ] Server-side timer / interaction tracking
  - [ ] Anti-bot (rate limit, captcha, behavior analysis)
  - [ ] Tek bir kullanıcının aynı görevi spam etmesini önleme
- [ ] `POST /tasks/:id/complete` endpoint (Geliştirici 1'in proxy'lediği istek buraya düşer)
- [ ] Doğrulama başarılıysa → `TaskRewardManager.mintCP(user, categoryId, amount)` çağrısı
- [ ] **Gas optimizasyonu:** her görev için anında mint yerine batch mint (örn. saatte bir, biriken ödülleri topluca mint et)
- [ ] Görev tamamlama logu (DB + on-chain event)

---

## Faz 6 — Web3 ↔ Web2 Köprüsü (Event Listener)

- [ ] Listener servisi (Node.js + Ethers.js veya ethers-rs)
- [ ] Dinlenecek event'ler:
  - [ ] `Swap` (Exchange) → DB'ye işlem geçmişi yaz, kullanıcı XP bakiyesini cache'le
  - [ ] `Minted` (CategoryPointToken) → DB'ye CP kazanım kaydı
  - [ ] `Transfer` → bakiye senkronizasyonu
- [ ] Block reorganization handling (1 confirmation yetmez, en az 5-10)
- [ ] Failed transaction retry mantığı
- [ ] Son işlenen block numarasını persist etme (servis restart olursa kaldığı yerden devam)
- [ ] **Alternatif:** The Graph subgraph yazmak — daha temiz indexing
- [ ] WebSocket veya SSE ile Geliştirici 1'in frontend'ine canlı update

---

## Faz 7 — Backend API (Geliştirici 1'e Veri Sunma)

- [ ] `GET /exchange/rate/:categoryId` — anlık CP→XP oranı (Redis'ten)
- [ ] `GET /exchange/quote?categoryId=&cpAmount=` — slippage dahil tahmini çıktı
- [ ] `GET /exchange/history/:userId` — kullanıcının takas geçmişi
- [ ] `GET /exchange/chart/:categoryId?range=1h|24h|7d` — grafik için time-series data
- [ ] `GET /users/:userId/balances` — tüm CP bakiyeleri + XP bakiyesi
- [ ] `GET /users/:userId/transactions` — birleşik işlem geçmişi (kazanım + takas)
- [ ] `POST /tasks/:id/verify` — Geliştirici 1'den proxy edilen görev tamamlama
- [ ] `POST /xp/apply-discount` — ödeme akışında XP indirim oranını sunucu tarafında doğrulayan endpoint (Geliştirici 1'in checkout'unda çağıracağı)
- [ ] OpenAPI/Swagger şeması

---

## Faz 8 — Smart Contract Güvenlik & Test

- [ ] **Hardhat/Foundry unit testleri** — her contract için %90+ coverage
- [ ] Fuzz testleri (Foundry'nin invariant testing özelliği)
- [ ] Bilinen attack vector kontrolleri:
  - [ ] Reentrancy
  - [ ] Integer overflow/underflow (Solidity 0.8+ otomatik koruma var ama yine de kontrol)
  - [ ] Front-running (MEV) — slippage protection ile mitigate
  - [ ] Flash loan attack (özellikle fiyat oracle'da)
  - [ ] Access control bypass
- [ ] Slither veya Mythril ile static analysis
- [ ] Gas raporu (Hardhat gas reporter)
- [ ] Testnet'te en az 2 hafta canlı test
- [ ] **Mini audit checklist** — eğer profesyonel audit yapılmayacaksa, ekip içi peer review

---

## Faz 9 — Algoritma & Backend Test

- [ ] Algoritma için unit testler (formülün matematiksel doğruluğu)
- [ ] Integration test: stok değişti → fiyat güncellendi → contract'a yansıdı → frontend gördü
- [ ] Load test (1000+ concurrent quote isteği)
- [ ] Chaos testing: listener servisi crash olunca tutarlılık bozulmuyor mu?
- [ ] DB ↔ on-chain reconciliation scripti (gece çalışıp uyumsuzluk varsa alarm)

---

## Faz 10 — Deploy

- [ ] **Testnet deploy** (Polygon Amoy veya Arbitrum Sepolia):
  - [ ] Tüm contract'ları deploy et
  - [ ] Geliştirici 1'e ABI ve adres dosyalarını ver
  - [ ] Block explorer'da verify et
- [ ] **Mainnet öncesi kontrol listesi:**
  - [ ] Tüm testler geçti
  - [ ] Admin key'ler multisig'e taşındı (Gnosis Safe)
  - [ ] Emergency pause test edildi
  - [ ] Upgrade path (varsa) test edildi
- [ ] Mainnet deploy (Polygon veya Arbitrum)
- [ ] Algoritma servisi deploy (Railway / Fly.io / dedicated VPS)
- [ ] Listener servisi deploy (uptime kritik — supervisord/pm2/systemd)
- [ ] Monitoring:
  - [ ] Contract event'leri için alert
  - [ ] Anormal fiyat değişimi alert
  - [ ] Listener gecikmesi alert
  - [ ] RPC node failure fallback (Alchemy + Infura ikili setup)

---

## Faz 11 — Entegrasyon Noktaları (Geliştirici 1 ile Ortak)

- [ ] Cüzdan signature doğrulamasında Geliştirici 1'e yardım (`personal_sign` verify mantığı)
- [ ] Anlık fiyat oranını frontend'e besleyen WebSocket/SSE kanalı
- [ ] Stok endpoint'ine erişim için API key/internal token
- [ ] Görev tamamlama akışında error code sözlüğü
- [ ] Checkout'ta XP indirimini server-side validate eden endpoint kontratı
- [ ] Smart contract event → UI bildirimi pipeline'ı

---

## Kritik Notlar

- **Tokenomics yanlışsa proje yanlış.** Kod yazmaya başlamadan önce formülü kağıt üzerinde simüle et — Excel/Python notebook ile farklı senaryoları (yüksek talep, düşük stok, manipülasyon denemesi) test et.
- **L2 seçimi gas'ı belirler.** Polygon ucuz ama bazen tıkanır, Arbitrum daha stabil. Base de güçlü bir alternatif. Mainnet Ethereum **kesinlikle değil** — kullanıcı her takasta dolar harcar.
- **Off-chain hesaplama + on-chain doğrulama** muhtemelen en pragmatik yaklaşım. Tüm fiyatlandırmayı on-chain yapmak gas açısından savurgan; ama tamamen off-chain de güvensiz. Hibrit model: off-chain hesapla, imzala, on-chain doğrula.
- **Görev tamamlamada her seferinde mint maliyetli.** Batch mint mantığını başından kur. Kullanıcı UI'da "pending" görür, dakikada bir batch toplu işlem yapılır.
- **Reorg ve finality:** L2'lerde bile minimum 5-10 block confirmation bekle, yoksa kullanıcı puanı görür ama chain'de geri alınır.
- Geliştirici 1 stok ve görev şemasının tek doğru kaynağı; sen ondan veri **çekiyorsun**, ona veri **basıyorsun**. Bu sınır net tutulmalı.
