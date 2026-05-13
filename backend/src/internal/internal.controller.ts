import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { PrismaService } from '../prisma/prisma.service';

// Internal API key guard — Geliştirici 2'nin erişimi için
// DEV2_API_READY: false — geliştirme aşamasında guard devre dışı
class InternalApiKeyGuard {
  canActivate(context: {
    switchToHttp: () => { getRequest: () => { headers: Record<string, string> } };
  }): boolean {
    const req = context.switchToHttp().getRequest();
    const key = req.headers['x-internal-key'];
    const expected = process.env.INTERNAL_API_KEY;
    if (!expected) return true; // dev mode
    return key === expected;
  }
}

@Controller('internal')
@UseGuards(InternalApiKeyGuard)
export class InternalController {
  constructor(
    private products: ProductsService,
    private prisma: PrismaService,
  ) {}

  /** GET /internal/stock/:categoryId — Dev2's algorithm fetches stock data */
  @Get('stock/:categoryId')
  getStock(@Param('categoryId') categoryId: string) {
    return this.products.getStockByCategory(categoryId);
  }

  /** GET /internal/market-volume/:categoryId — Dev2's algorithm fetches market volume */
  @Get('market-volume/:categoryId')
  async getMarketVolume(@Param('categoryId') categoryId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.orderItem.aggregate({
      where: {
        product: { categoryId },
        order: { createdAt: { gte: thirtyDaysAgo }, paymentStatus: 'PAID' },
      },
      _sum: { quantity: true, priceFiat: true },
      _count: true,
    });

    return {
      categoryId,
      totalSales: result._count,
      totalQuantity: result._sum.quantity ?? 0,
      totalRevenue: result._sum.priceFiat ?? 0,
      periodDays: 30,
    };
  }
}
