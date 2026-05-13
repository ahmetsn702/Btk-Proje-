import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { CheckoutDto, UpdateOrderStatusDto } from './dto/orders.dto';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
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

    // Calculate XP discount
    // DEV2_API_READY: false — mock kullanılıyor
    const xpDiscount = dto.xpAmount ? dto.xpAmount * 100 : 0; // mock: 1 XP = 1 TL (100 kuruş)

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

      const finalTotal = Math.max(0, totalFiat - xpDiscount);

      // Create order
      const order = await tx.order.create({
        data: {
          userId,
          addressId: dto.addressId,
          totalFiat: finalTotal,
          xpDiscount,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        status: dto.status as any,
        paymentStatus: dto.status === 'PAID' ? 'PAID' : undefined,
      },
    });
  }
}
