/**
 * Ortak Error Code Sözlüğü
 * Geliştirici 1 & Geliştirici 2 arasında paylaşılan hata kodları.
 *
 * Format: DOMAIN_ERROR_NAME
 * HTTP Status + code + message (TR)
 */

export const ERROR_CODES = {
  // ─── Auth ──────────────────────────────────────────────────────────────
  AUTH_INVALID_CREDENTIALS: {
    status: 401,
    code: 'AUTH_INVALID_CREDENTIALS',
    message: 'E-posta veya şifre hatalı',
  },
  AUTH_TOKEN_EXPIRED: {
    status: 401,
    code: 'AUTH_TOKEN_EXPIRED',
    message: 'Oturum süresi doldu, lütfen tekrar giriş yapın',
  },
  AUTH_UNAUTHORIZED: {
    status: 401,
    code: 'AUTH_UNAUTHORIZED',
    message: 'Bu işlem için giriş yapmanız gerekiyor',
  },
  AUTH_FORBIDDEN: { status: 403, code: 'AUTH_FORBIDDEN', message: 'Bu işlem için yetkiniz yok' },

  // ─── User ──────────────────────────────────────────────────────────────
  USER_NOT_FOUND: { status: 404, code: 'USER_NOT_FOUND', message: 'Kullanıcı bulunamadı' },
  USER_EMAIL_EXISTS: {
    status: 409,
    code: 'USER_EMAIL_EXISTS',
    message: 'Bu e-posta adresi zaten kayıtlı',
  },
  USER_WALLET_EXISTS: {
    status: 409,
    code: 'USER_WALLET_EXISTS',
    message: 'Bu cüzdan başka bir hesaba bağlı',
  },
  USER_INVALID_SIGNATURE: {
    status: 400,
    code: 'USER_INVALID_SIGNATURE',
    message: 'Cüzdan imzası doğrulanamadı',
  },

  // ─── Product / Stock ───────────────────────────────────────────────────
  PRODUCT_NOT_FOUND: { status: 404, code: 'PRODUCT_NOT_FOUND', message: 'Ürün bulunamadı' },
  PRODUCT_OUT_OF_STOCK: { status: 400, code: 'PRODUCT_OUT_OF_STOCK', message: 'Ürün stokta yok' },
  PRODUCT_INSUFFICIENT_STOCK: {
    status: 400,
    code: 'PRODUCT_INSUFFICIENT_STOCK',
    message: 'Yeterli stok yok',
  },

  // ─── Cart ──────────────────────────────────────────────────────────────
  CART_EMPTY: { status: 400, code: 'CART_EMPTY', message: 'Sepetiniz boş' },
  CART_ITEM_NOT_FOUND: {
    status: 404,
    code: 'CART_ITEM_NOT_FOUND',
    message: 'Sepet ürünü bulunamadı',
  },

  // ─── Order ─────────────────────────────────────────────────────────────
  ORDER_NOT_FOUND: { status: 404, code: 'ORDER_NOT_FOUND', message: 'Sipariş bulunamadı' },
  ORDER_PAYMENT_FAILED: {
    status: 400,
    code: 'ORDER_PAYMENT_FAILED',
    message: 'Ödeme başarısız oldu',
  },
  ORDER_ADDRESS_NOT_FOUND: {
    status: 404,
    code: 'ORDER_ADDRESS_NOT_FOUND',
    message: 'Teslimat adresi bulunamadı',
  },

  // ─── Task ──────────────────────────────────────────────────────────────
  TASK_NOT_FOUND: { status: 404, code: 'TASK_NOT_FOUND', message: 'Görev bulunamadı' },
  TASK_ALREADY_COMPLETED: {
    status: 400,
    code: 'TASK_ALREADY_COMPLETED',
    message: 'Bu görevi zaten tamamladınız',
  },
  TASK_VERIFICATION_FAILED: {
    status: 400,
    code: 'TASK_VERIFICATION_FAILED',
    message: 'Görev doğrulaması başarısız',
  },
  TASK_RATE_LIMITED: {
    status: 429,
    code: 'TASK_RATE_LIMITED',
    message: 'Çok fazla istek, lütfen bekleyin',
  },

  // ─── Exchange (Takas) ──────────────────────────────────────────────────
  EXCHANGE_INSUFFICIENT_CP: {
    status: 400,
    code: 'EXCHANGE_INSUFFICIENT_CP',
    message: 'Yeterli kategori puanınız yok',
  },
  EXCHANGE_SLIPPAGE_EXCEEDED: {
    status: 400,
    code: 'EXCHANGE_SLIPPAGE_EXCEEDED',
    message: 'Fiyat değişti, slippage aşıldı',
  },
  EXCHANGE_RATE_UNAVAILABLE: {
    status: 503,
    code: 'EXCHANGE_RATE_UNAVAILABLE',
    message: 'Anlık oran alınamıyor, lütfen tekrar deneyin',
  },
  EXCHANGE_PAUSED: {
    status: 503,
    code: 'EXCHANGE_PAUSED',
    message: 'Takas sistemi geçici olarak durduruldu',
  },
  EXCHANGE_TX_FAILED: {
    status: 400,
    code: 'EXCHANGE_TX_FAILED',
    message: 'Blockchain işlemi başarısız oldu',
  },
  EXCHANGE_TX_PENDING: { status: 202, code: 'EXCHANGE_TX_PENDING', message: 'İşlem onay bekliyor' },

  // ─── XP / Discount ────────────────────────────────────────────────────
  XP_INSUFFICIENT_BALANCE: {
    status: 400,
    code: 'XP_INSUFFICIENT_BALANCE',
    message: 'Yeterli XP bakiyeniz yok',
  },
  XP_DISCOUNT_INVALID: {
    status: 400,
    code: 'XP_DISCOUNT_INVALID',
    message: 'XP indirim doğrulaması başarısız',
  },
  XP_DISCOUNT_EXCEEDS_TOTAL: {
    status: 400,
    code: 'XP_DISCOUNT_EXCEEDS_TOTAL',
    message: 'XP indirimi sepet toplamını aşamaz',
  },

  // ─── Blockchain / Web3 ─────────────────────────────────────────────────
  WEB3_WALLET_NOT_CONNECTED: {
    status: 400,
    code: 'WEB3_WALLET_NOT_CONNECTED',
    message: 'Cüzdan bağlı değil',
  },
  WEB3_WRONG_NETWORK: {
    status: 400,
    code: 'WEB3_WRONG_NETWORK',
    message: 'Yanlış ağ, lütfen doğru ağa geçin',
  },
  WEB3_TX_REJECTED: {
    status: 400,
    code: 'WEB3_TX_REJECTED',
    message: 'İşlem kullanıcı tarafından reddedildi',
  },
  WEB3_TX_REVERTED: {
    status: 400,
    code: 'WEB3_TX_REVERTED',
    message: 'Blockchain işlemi geri alındı',
  },

  // ─── General ───────────────────────────────────────────────────────────
  INTERNAL_ERROR: {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Bir hata oluştu, lütfen tekrar deneyin',
  },
  RATE_LIMITED: { status: 429, code: 'RATE_LIMITED', message: 'Çok fazla istek, lütfen bekleyin' },
  VALIDATION_ERROR: { status: 400, code: 'VALIDATION_ERROR', message: 'Girdi doğrulama hatası' },
  SERVICE_UNAVAILABLE: {
    status: 503,
    code: 'SERVICE_UNAVAILABLE',
    message: 'Servis geçici olarak kullanılamıyor',
  },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/** Helper: error code'dan kullanıcı dostu mesaj döner */
export function getErrorMessage(code: string): string {
  const entry = Object.values(ERROR_CODES).find((e) => e.code === code);
  return entry?.message || ERROR_CODES.INTERNAL_ERROR.message;
}
