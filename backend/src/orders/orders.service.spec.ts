import { Test } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { Dev2ApiService } from '../shared/dev2-api.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: Record<string, Record<string, jest.Mock> | jest.Mock>;
  let dev2Api: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = {
      cart: { findUnique: jest.fn() },
      cartItem: { deleteMany: jest.fn() },
      address: { findFirst: jest.fn() },
      order: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      product: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
      $transaction: jest.fn((fn) => fn(prisma)),
    };
    dev2Api = { applyDiscount: jest.fn().mockResolvedValue({ valid: true, discountKurus: 500 }) };

    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: CartService, useValue: {} },
        { provide: Dev2ApiService, useValue: dev2Api },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  describe('checkout', () => {
    it('should throw if cart is empty', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);
      await expect(service.checkout('user1', { addressId: 'a1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if address not found', async () => {
      prisma.cart.findUnique.mockResolvedValue({ items: [{ product: {} }] });
      prisma.address.findFirst.mockResolvedValue(null);
      await expect(service.checkout('user1', { addressId: 'bad' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should validate XP discount via Dev2 API', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart1',
        items: [{ productId: 'p1', quantity: 1, product: { priceFiat: 1000 } }],
      });
      prisma.address.findFirst.mockResolvedValue({ id: 'a1' });
      prisma.product.findUniqueOrThrow.mockResolvedValue({ id: 'p1', stock: 10, priceFiat: 1000 });
      prisma.order.create.mockResolvedValue({ id: 'o1', items: [] });

      await service.checkout('user1', { addressId: 'a1', xpAmount: 5 });
      expect(dev2Api.applyDiscount).toHaveBeenCalledWith('user1', 5);
    });
  });

  describe('findOne', () => {
    it('should throw if order not found', async () => {
      prisma.order.findFirst.mockResolvedValue(null);
      await expect(service.findOne('user1', 'bad')).rejects.toThrow(NotFoundException);
    });
  });
});
