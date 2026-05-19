import 'dotenv/config';
import { PrismaClient } from '../generated/client/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const userId = 'cmpce6e1k0000s0h5i4ab396k';
  const testUserId = 'test_user_001';

  // 1. Categories
  const catElektronik = await prisma.category.upsert({
    where: { slug: 'elektronik' },
    update: {
      cpToTlRate: 15.0,
      bonusThreshold: 1000,
    },
    create: {
      id: 'cat_elektronik_001',
      name: 'Elektronik',
      slug: 'elektronik',
      description: 'Telefon, bilgisayar, aksesuar',
      cpToTlRate: 15.0,
      bonusThreshold: 1000,
    },
  });

  const catGiyim = await prisma.category.upsert({
    where: { slug: 'giyim' },
    update: {
      cpToTlRate: 2.9,
      bonusThreshold: 1000,
    },
    create: {
      id: 'cat_giyim_001',
      name: 'Giyim',
      slug: 'giyim',
      description: 'Kadın, erkek, çocuk giyim',
      cpToTlRate: 2.9,
      bonusThreshold: 1000,
    },
  });

  await prisma.category.upsert({
    where: { slug: 'spor' },
    update: {
      cpToTlRate: 5.0,
      bonusThreshold: 1000,
    },
    create: {
      id: 'cat_spor_001',
      name: 'Spor',
      slug: 'spor',
      description: 'Spor ekipmanları ve giyim',
      cpToTlRate: 5.0,
      bonusThreshold: 1000,
    },
  });

  await prisma.category.upsert({
    where: { slug: 'kitap' },
    update: {
      cpToTlRate: 1.5,
      bonusThreshold: 1000,
    },
    create: {
      id: 'cat_kitap_001',
      name: 'Kitap',
      slug: 'kitap',
      description: 'Roman, akademik, hobi',
      cpToTlRate: 1.5,
      bonusThreshold: 1000,
    },
  });

  await prisma.category.upsert({
    where: { slug: 'ev-yasam' },
    update: {
      cpToTlRate: 3.5,
      bonusThreshold: 1000,
    },
    create: {
      id: 'cat_ev_yasam_001',
      name: 'Ev & Yaşam',
      slug: 'ev-yasam',
      description: 'Mobilya, dekorasyon, mutfak',
      cpToTlRate: 3.5,
      bonusThreshold: 1000,
    },
  });
  console.log('✓ Categories created/updated');

  // 2. Users
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: 'user@example.com',
      passwordHash: '$2b$10$EPf9kP5w.MhY16U5A869K.F79qNfM.qgS76tHsp7g9z6t7qHlR7rS',
      firstName: 'Gerçek',
      lastName: 'Kullanıcı',
      role: 'USER',
    },
  });

  await prisma.user.upsert({
    where: { id: testUserId },
    update: {},
    create: {
      id: testUserId,
      email: 'test_user_001@example.com',
      passwordHash: '$2b$10$EPf9kP5w.MhY16U5A869K.F79qNfM.qgS76tHsp7g9z6t7qHlR7rS',
      firstName: 'Test',
      lastName: 'User 001',
      role: 'USER',
    },
  });
  console.log('✓ Users created/updated');

  // 3. Products
  const kulaklikId = 'cmpcdmadg0005p8h5gosghko6';
  const tshirtId = 'cmpcdmadi0007p8h50yyss7ru';

  await prisma.product.upsert({
    where: { id: kulaklikId },
    update: {},
    create: {
      id: kulaklikId,
      name: 'Kablosuz Kulaklık',
      description: 'Bluetooth 5.3, ANC',
      priceFiat: 149900,
      stock: 50,
      categoryId: catElektronik.id,
      images: ['https://picsum.photos/seed/headphones/400/400'],
    },
  });

  await prisma.product.upsert({
    where: { id: tshirtId },
    update: {},
    create: {
      id: tshirtId,
      name: 'Oversize T-Shirt',
      description: '100% pamuk, unisex',
      priceFiat: 29900,
      stock: 100,
      categoryId: catGiyim.id,
      images: ['https://picsum.photos/seed/shirt/400/400'],
    },
  });
  console.log('✓ Products created/updated');

  // 4. Tasks
  const task1Id = 'cmpcdmaeu000bp8h5nqqq2q9j';
  const task2Id = 'cmpcdmaew000cp8h5k9ahlrjw';

  await prisma.task.upsert({
    where: { id: task1Id },
    update: {},
    create: {
      id: task1Id,
      title: 'Kulaklık İncelemesini Oku',
      type: 'REVIEW_READ',
      difficulty: 'EASY',
      rewardCp: 10,
      durationMin: 3,
      categoryId: catElektronik.id,
    },
  });

  await prisma.task.upsert({
    where: { id: task2Id },
    update: {},
    create: {
      id: task2Id,
      title: 'Ürün Paylaş (Sosyal Medya)',
      type: 'PRODUCT_SHARE',
      difficulty: 'EASY',
      rewardCp: 15,
      durationMin: 2,
      categoryId: catGiyim.id,
    },
  });
  console.log('✓ Tasks created/updated');

  // 5. Address for cmpce6e1k0000s0h5i4ab396k
  const address = await prisma.address.upsert({
    where: { id: 'addr_kandikoy_001' },
    update: {},
    create: {
      id: 'addr_kandikoy_001',
      title: 'Ev',
      fullName: 'Ahmet Yılmaz',
      phone: '05551234567',
      city: 'İstanbul',
      district: 'Kadıköy',
      address: 'Caferağa Mah. Moda Cad. No:12 D:4',
      zipCode: '34710',
      isDefault: true,
      userId: userId,
    },
  });
  console.log('✓ Address created/updated');

  // 6. Order + OrderItems for cmpce6e1k0000s0h5i4ab396k
  await prisma.order.upsert({
    where: { id: 'order_test_001' },
    update: {},
    create: {
      id: 'order_test_001',
      userId: userId,
      addressId: address.id,
      status: 'PAID',
      paymentStatus: 'PAID',
      totalFiat: 179800, // 149900 + 29900
      items: {
        create: [
          {
            productId: kulaklikId,
            quantity: 1,
            priceFiat: 149900,
          },
          {
            productId: tshirtId,
            quantity: 1,
            priceFiat: 29900,
          },
        ],
      },
    },
  });
  console.log('✓ Order and OrderItems created/updated');

  // 7. User task completions for test_user_001
  await prisma.userTaskCompletion.upsert({
    where: { userId_taskId: { userId: testUserId, taskId: task1Id } },
    update: {},
    create: {
      userId: testUserId,
      taskId: task1Id,
      status: 'VERIFIED',
      completedAt: new Date(),
    },
  });

  await prisma.userTaskCompletion.upsert({
    where: { userId_taskId: { userId: testUserId, taskId: task2Id } },
    update: {},
    create: {
      userId: testUserId,
      taskId: task2Id,
      status: 'VERIFIED',
      completedAt: new Date(),
    },
  });
  console.log('✓ User task completions created/updated');

  // 8. PointTransactions for cmpce6e1k0000s0h5i4ab396k
  await prisma.pointTransaction.upsert({
    where: { id: 'tx_cp_earn_50' },
    update: {},
    create: {
      id: 'tx_cp_earn_50',
      userId: userId,
      type: 'CP_EARN',
      amount: 50,
    },
  });
  await prisma.pointTransaction.upsert({
    where: { id: 'tx_cp_spend_20' },
    update: {},
    create: {
      id: 'tx_cp_spend_20',
      userId: userId,
      type: 'CP_SPEND',
      amount: 20,
    },
  });
  await prisma.pointTransaction.upsert({
    where: { id: 'tx_xp_earn_20' },
    update: {},
    create: {
      id: 'tx_xp_earn_20',
      userId: userId,
      type: 'XP_EARN',
      amount: 20,
    },
  });
  console.log('✓ Point transactions created/updated');

  console.log('\n🌱 Custom Seed tamamlandı!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
