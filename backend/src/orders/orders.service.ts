import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { Dev2ApiService } from '../shared/dev2-api.service';
import { CheckoutDto, UpdateOrderStatusDto } from './dto/orders.dto';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    private dev2Api: Dev2ApiService,
  ) {}

  async checkout(userId: string, dto: CheckoutDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
    if (!cart || cart.items.length === 0) throw new BadRequestException('Cart is empty');

    // Verify address belongs to user
    const address = await this.prisma.address.findFirst({ where: { id: dto.addressId, userId } });
    if (!address) throw new NotFoundException('Address not found');

    // Validate XP discount via Geliştirici 2's service
    let xpDiscount = 0;
    if (dto.xpAmount && dto.xpAmount > 0) {
      const result = await this.dev2Api.applyDiscount(userId, dto.xpAmount);
      if (!result.valid) throw new BadRequestException('XP discount validation failed');
      xpDiscount = result.discountKurus;
    }

    // Process category-specific CP discount if requested
    let cpDiscountKurus = 0;
    let cpToUse = 0;

    if (dto.useCpAmount && dto.useCpAmount > 0) {
      if (!dto.categoryId) {
        throw new BadRequestException('categoryId is required when useCpAmount is provided');
      }

      // 1. Fetch category properties
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) throw new NotFoundException('Category not found');

      // 2. Find product in cart belonging to category and cap by maxCpDiscount
      const categoryProduct = cart.items.find((item) => item.product.categoryId === dto.categoryId);
      if (!categoryProduct) {
        throw new BadRequestException('No products in cart matching the specified category');
      }

      const maxDiscountLimit = categoryProduct.product.maxCpDiscount;
      cpToUse = dto.useCpAmount;
      if (cpToUse > maxDiscountLimit) {
        cpToUse = maxDiscountLimit;
      }

      if (cpToUse > 0) {
        // 3. Verify user has enough CP in that category
        const earnedResult = await this.prisma.pointTransaction.aggregate({
          _sum: { amount: true },
          where: {
            userId,
            categoryId: dto.categoryId,
            type: 'CP_EARN',
          },
        });
        const spentResult = await this.prisma.pointTransaction.aggregate({
          _sum: { amount: true },
          where: {
            userId,
            categoryId: dto.categoryId,
            type: 'CP_SPEND',
          },
        });

        const userCpBalance = (earnedResult._sum.amount ?? 0) - (spentResult._sum.amount ?? 0);
        if (userCpBalance < cpToUse) {
          throw new BadRequestException(
            `Insufficient CP balance in category. Required: ${cpToUse}, Available: ${userCpBalance}`,
          );
        }

        // 4. Calculate discount: useCpAmount * cp_to_tl_rate * bonus_multiplier (convert TL to Kurus)
        const discountTL = cpToUse * category.cpToTlRate * category.bonusMultiplier;
        cpDiscountKurus = Math.round(discountTL * 100);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Verify stock and calculate total
      let totalFiat = 0;
      for (const item of cart.items) {
        const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
        if (product.stock < item.quantity) {
          throw new BadRequestException(`Insufficient stock for ${product.name}`);
        }
        totalFiat += product.priceFiat * item.quantity;
        // Decrement stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      const totalDiscount = xpDiscount + cpDiscountKurus;
      const finalTotal = Math.max(0, totalFiat - totalDiscount);

      // Create order
      const order = await tx.order.create({
        data: {
          userId,
          addressId: dto.addressId,
          totalFiat: finalTotal,
          xpDiscount: totalDiscount,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceFiat: item.product.priceFiat,
            })),
          },
        },
        include: { items: true },
      });

      // Write CP_SPEND transaction record if CP discount was applied
      if (cpToUse > 0) {
        await tx.pointTransaction.create({
          data: {
            userId,
            categoryId: dto.categoryId,
            type: 'CP_SPEND',
            amount: cpToUse,
          },
        });
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return order;
    });
  }

  async findAll(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { product: { select: { id: true, name: true, images: true } } } },
      },
    });
  }

  async findOne(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: { include: { product: { select: { id: true, name: true, images: true } } } },
        address: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: dto.status as any,
        paymentStatus: dto.status === 'PAID' ? 'PAID' : undefined,
      },
    });
  }
}
