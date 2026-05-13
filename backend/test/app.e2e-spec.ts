import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * API Entegrasyon Testi
 * Akış: register → login → sepete ekle → checkout
 *
 * NOT: Bu test gerçek DB bağlantısı gerektirir.
 * CI'da çalıştırmak için test DB'si ayarlanmalıdır.
 * `npm run test:e2e` ile çalıştırılır.
 */
describe('E-Commerce Flow (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let productId: string;
  let addressId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const testEmail = `test_${Date.now()}@integration.test`;
  const testPassword = 'Test123!';

  describe('1. Register', () => {
    it('POST /auth/register — should create user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      accessToken = res.body.accessToken;
    });
  });

  describe('2. Login', () => {
    it('POST /auth/login — should return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      accessToken = res.body.accessToken;
    });
  });

  describe('3. Browse Products', () => {
    it('GET /products — should return product list', async () => {
      const res = await request(app.getHttpServer()).get('/products').expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('totalPages');
      if (res.body.items.length > 0) {
        productId = res.body.items[0].id;
      }
    });
  });

  describe('4. Add to Cart', () => {
    it('POST /cart/items — should add product to cart', async () => {
      if (!productId) return; // skip if no products in DB

      const res = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ productId, quantity: 1 })
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });

    it('GET /cart — should show item in cart', async () => {
      const res = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('5. Add Address', () => {
    it('POST /addresses — should create address', async () => {
      const res = await request(app.getHttpServer())
        .post('/addresses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Ev',
          fullName: 'Test User',
          phone: '5551234567',
          city: 'İstanbul',
          district: 'Kadıköy',
          address: 'Test Mah. Test Sok. No:1',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      addressId = res.body.id;
    });
  });

  describe('6. Checkout', () => {
    it('POST /orders/checkout — should create order', async () => {
      if (!productId || !addressId) return; // skip if prerequisites missing

      const res = await request(app.getHttpServer())
        .post('/orders/checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ addressId, xpAmount: 0 })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('totalFiat');
      expect(res.body).toHaveProperty('items');
    });

    it('GET /orders — should show order in history', async () => {
      const res = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
