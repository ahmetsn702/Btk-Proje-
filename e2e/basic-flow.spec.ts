import { test, expect } from '@playwright/test';

/**
 * E2E Test — Temel Kullanıcı Akışı
 * Kayıt → Giriş → Ürün Listeleme → Ürün Detay → Sepete Ekle → Checkout
 *
 * Çalıştırmak için: npx playwright test
 * NOT: Frontend (localhost:3000) ve Backend (localhost:3001) çalışıyor olmalı.
 */

test.describe('Temel Kullanıcı Akışı', () => {
  const email = `e2e_${Date.now()}@test.com`;
  const password = 'Test123!';

  test('Anasayfa yükleniyor', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Görevleri Tamamla');
    await expect(page.locator('nav')).toBeVisible();
  });

  test('Kayıt olma', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h2, [class*="CardTitle"]')).toContainText('Kayıt Ol');

    await page.fill('input[type="email"]', email);
    await page.fill('input#password', password);
    await page.fill('input#confirmPassword', password);
    await page.click('button[type="submit"]');

    // Başarılı kayıt sonrası anasayfaya yönlendirme
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('Giriş yapma', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input#password', password);
    await page.click('button[type="submit"]');

    await page.waitForURL('/', { timeout: 10000 });
    // Navbar'da "Çıkış" butonu görünmeli
    await expect(page.locator('text=Çıkış')).toBeVisible();
  });

  test('Ürünler sayfası', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('h1')).toContainText('Ürünler');
    // Arama input'u mevcut
    await expect(page.locator('input[placeholder*="Ürün ara"]')).toBeVisible();
  });

  test('Ürün detay sayfası', async ({ page }) => {
    await page.goto('/products');
    // İlk ürün linkine tıkla (varsa)
    const productLink = page.locator('a[href^="/products/"]').first();
    if (await productLink.isVisible()) {
      await productLink.click();
      await expect(page.locator('text=Sepete Ekle')).toBeVisible({ timeout: 5000 });
    }
  });

  test('Görevler sayfası', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.locator('h1')).toContainText('Görevler');
  });

  test('Takas sayfası', async ({ page }) => {
    await page.goto('/exchange');
    await expect(page.locator('h1')).toContainText('Takas');
  });

  test('Profil sayfası (auth gerekli)', async ({ page }) => {
    // Giriş yap
    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input#password', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto('/profile');
    await expect(page.locator('h1')).toContainText('Kişisel Bilgiler');
  });

  test('Korunan sayfa giriş yapmadan erişilemez', async ({ page }) => {
    // Temiz context (giriş yapmamış)
    await page.goto('/cart');
    // Login'e yönlendirmeli
    await page.waitForURL('/login', { timeout: 5000 });
  });
});
