import { describe, it, expect } from 'vitest';
import { getErrorMessage, ERROR_CODES } from '@/lib/error-codes';

describe('getErrorMessage', () => {
  it('returns correct message for known code', () => {
    expect(getErrorMessage('CART_EMPTY')).toBe('Sepetiniz boş');
  });

  it('returns default message for unknown code', () => {
    expect(getErrorMessage('UNKNOWN_CODE')).toBe(ERROR_CODES.INTERNAL_ERROR.message);
  });

  it('all error codes have required fields', () => {
    Object.values(ERROR_CODES).forEach((entry) => {
      expect(entry).toHaveProperty('status');
      expect(entry).toHaveProperty('code');
      expect(entry).toHaveProperty('message');
      expect(typeof entry.status).toBe('number');
      expect(typeof entry.code).toBe('string');
      expect(typeof entry.message).toBe('string');
    });
  });
});
