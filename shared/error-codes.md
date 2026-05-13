# Ortak Error Code Sözlüğü

Geliştirici 1 & Geliştirici 2 arasında paylaşılan hata kodları.

## Format

```json
{
  "error": {
    "code": "DOMAIN_ERROR_NAME",
    "message": "Kullanıcı dostu Türkçe mesaj",
    "status": 400
  }
}
```

## Kodlar

### Auth

| Code                     | Status | Mesaj                     |
| ------------------------ | ------ | ------------------------- |
| AUTH_INVALID_CREDENTIALS | 401    | E-posta veya şifre hatalı |
| AUTH_TOKEN_EXPIRED       | 401    | Oturum süresi doldu       |
| AUTH_UNAUTHORIZED        | 401    | Giriş yapmanız gerekiyor  |
| AUTH_FORBIDDEN           | 403    | Yetkiniz yok              |

### User

| Code                   | Status | Mesaj                       |
| ---------------------- | ------ | --------------------------- |
| USER_NOT_FOUND         | 404    | Kullanıcı bulunamadı        |
| USER_EMAIL_EXISTS      | 409    | E-posta zaten kayıtlı       |
| USER_WALLET_EXISTS     | 409    | Cüzdan başka hesaba bağlı   |
| USER_INVALID_SIGNATURE | 400    | Cüzdan imzası doğrulanamadı |

### Product / Stock

| Code                       | Status | Mesaj            |
| -------------------------- | ------ | ---------------- |
| PRODUCT_NOT_FOUND          | 404    | Ürün bulunamadı  |
| PRODUCT_OUT_OF_STOCK       | 400    | Ürün stokta yok  |
| PRODUCT_INSUFFICIENT_STOCK | 400    | Yeterli stok yok |

### Cart

| Code                | Status | Mesaj                  |
| ------------------- | ------ | ---------------------- |
| CART_EMPTY          | 400    | Sepet boş              |
| CART_ITEM_NOT_FOUND | 404    | Sepet ürünü bulunamadı |

### Order

| Code                    | Status | Mesaj                      |
| ----------------------- | ------ | -------------------------- |
| ORDER_NOT_FOUND         | 404    | Sipariş bulunamadı         |
| ORDER_PAYMENT_FAILED    | 400    | Ödeme başarısız            |
| ORDER_ADDRESS_NOT_FOUND | 404    | Teslimat adresi bulunamadı |

### Task

| Code                     | Status | Mesaj                       |
| ------------------------ | ------ | --------------------------- |
| TASK_NOT_FOUND           | 404    | Görev bulunamadı            |
| TASK_ALREADY_COMPLETED   | 400    | Görev zaten tamamlanmış     |
| TASK_VERIFICATION_FAILED | 400    | Görev doğrulaması başarısız |
| TASK_RATE_LIMITED        | 429    | Çok fazla istek             |

### Exchange (Takas)

| Code                       | Status | Mesaj                       |
| -------------------------- | ------ | --------------------------- |
| EXCHANGE_INSUFFICIENT_CP   | 400    | Yeterli CP yok              |
| EXCHANGE_SLIPPAGE_EXCEEDED | 400    | Slippage aşıldı             |
| EXCHANGE_RATE_UNAVAILABLE  | 503    | Oran alınamıyor             |
| EXCHANGE_PAUSED            | 503    | Takas durduruldu            |
| EXCHANGE_TX_FAILED         | 400    | Blockchain işlemi başarısız |
| EXCHANGE_TX_PENDING        | 202    | İşlem onay bekliyor         |

### XP / Discount

| Code                      | Status | Mesaj                            |
| ------------------------- | ------ | -------------------------------- |
| XP_INSUFFICIENT_BALANCE   | 400    | Yeterli XP yok                   |
| XP_DISCOUNT_INVALID       | 400    | XP indirim doğrulaması başarısız |
| XP_DISCOUNT_EXCEEDS_TOTAL | 400    | İndirim toplamı aşıyor           |

### Blockchain / Web3

| Code                      | Status | Mesaj              |
| ------------------------- | ------ | ------------------ |
| WEB3_WALLET_NOT_CONNECTED | 400    | Cüzdan bağlı değil |
| WEB3_WRONG_NETWORK        | 400    | Yanlış ağ          |
| WEB3_TX_REJECTED          | 400    | İşlem reddedildi   |
| WEB3_TX_REVERTED          | 400    | İşlem geri alındı  |

### General

| Code                | Status | Mesaj                  |
| ------------------- | ------ | ---------------------- |
| INTERNAL_ERROR      | 500    | Bir hata oluştu        |
| RATE_LIMITED        | 429    | Çok fazla istek        |
| VALIDATION_ERROR    | 400    | Girdi doğrulama hatası |
| SERVICE_UNAVAILABLE | 503    | Servis kullanılamıyor  |
