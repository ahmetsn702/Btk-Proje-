import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'elektronik' },
      update: {},
      create: {
        name: 'Elektronik',
        slug: 'elektronik',
        description: 'Telefon, bilgisayar, aksesuar',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'giyim' },
      update: {},
      create: { name: 'Giyim', slug: 'giyim', description: 'Kadın, erkek, çocuk giyim' },
    }),
    prisma.category.upsert({
      where: { slug: 'ev-yasam' },
      update: {},
      create: { name: 'Ev & Yaşam', slug: 'ev-yasam', description: 'Mobilya, dekorasyon, mutfak' },
    }),
    prisma.category.upsert({
      where: { slug: 'spor' },
      update: {},
      create: { name: 'Spor', slug: 'spor', description: 'Spor ekipmanları ve giyim' },
    }),
    prisma.category.upsert({
      where: { slug: 'kitap' },
      update: {},
      create: { name: 'Kitap', slug: 'kitap', description: 'Roman, akademik, hobi' },
    }),
  ]);

  console.log(`✓ ${categories.length} kategori oluşturuldu`);

  // Products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Kablosuz Kulaklık',
        description: 'Bluetooth 5.3, ANC',
        priceFiat: 149900,
        stock: 50,
        categoryId: categories[0].id,
        images: ['/images/kulaklik.jpg'],
      },
    }),
    prisma.product.create({
      data: {
        name: 'Mekanik Klavye',
        description: 'RGB, Cherry MX Blue',
        priceFiat: 249900,
        stock: 30,
        categoryId: categories[0].id,
        images: ['/images/klavye.jpg'],
      },
    }),
    prisma.product.create({
      data: {
        name: 'Oversize T-Shirt',
        description: '100% pamuk, unisex',
        priceFiat: 29900,
        stock: 100,
        categoryId: categories[1].id,
        images: ['/images/tshirt.jpg'],
      },
    }),
    prisma.product.create({
      data: {
        name: 'Koşu Ayakkabısı',
        description: 'Hafif, nefes alan taban',
        priceFiat: 89900,
        stock: 40,
        categoryId: categories[3].id,
        images: ['/images/ayakkabi.jpg'],
      },
    }),
    prisma.product.create({
      data: {
        name: 'Masa Lambası',
        description: 'LED, ayarlanabilir ışık',
        priceFiat: 44900,
        stock: 60,
        categoryId: categories[2].id,
        images: ['/images/lamba.jpg'],
      },
    }),
    prisma.product.create({
      data: {
        name: 'Yazılım Mühendisliği',
        description: 'Ian Sommerville, 10. baskı',
        priceFiat: 19900,
        stock: 25,
        categoryId: categories[4].id,
        images: ['/images/kitap1.jpg'],
      },
    }),
  ]);

  console.log(`✓ ${products.length} ürün oluşturuldu`);

  // Tasks
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Kulaklık İncelemesini Oku',
        type: 'REVIEW_READ',
        difficulty: 'EASY',
        rewardCp: 10,
        durationMin: 3,
        categoryId: categories[0].id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Ürün Paylaş (Sosyal Medya)',
        type: 'PRODUCT_SHARE',
        difficulty: 'EASY',
        rewardCp: 15,
        durationMin: 2,
        categoryId: categories[1].id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Alışveriş Anketi',
        type: 'SURVEY',
        difficulty: 'MEDIUM',
        rewardCp: 25,
        durationMin: 5,
        categoryId: categories[2].id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Spor Bilgi Quizi',
        type: 'QUIZ',
        difficulty: 'HARD',
        rewardCp: 50,
        durationMin: 10,
        categoryId: categories[3].id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Arkadaşını Davet Et',
        type: 'REFERRAL',
        difficulty: 'MEDIUM',
        rewardCp: 30,
        durationMin: 1,
        categoryId: categories[4].id,
      },
    }),
  ]);

  console.log(`✓ ${tasks.length} görev oluşturuldu`);
  console.log('\n🌱 Seed tamamlandı!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
