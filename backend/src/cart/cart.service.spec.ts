import { Test } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CartService', () => {
  let service: CartService;
  let prisma: Record<string, Record<string, jest.Mock>>;

  beforeEach(async () => {
    prisma = {
      cart: { findUnique: jest.fn(), upsert: jest.fn() },
      cartItem: {
        upsert: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      product: { findUnique: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [CartService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(CartService);
  });

  describe('getCart', () => {
    it('should return empty cart if no cart exists', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);
      const result = await service.getCart('user1');
      expect(result).toEqual({ items: [], total: 0 });
    });

    it('should calculate total correctly', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        items: [
          { product: { priceFiat: 1000 }, quantity: 2 },
          { product: { priceFiat: 500 }, quantity: 1 },
        ],
      });
      const result = await service.getCart('user1');
      expect(result.total).toBe(2500);
    });
  });

  describe('addItem', () => {
    it('should throw if product not found', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.addItem('user1', { productId: 'x', quantity: 1 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if insufficient stock', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: '1', isActive: true, stock: 2 });
      await expect(service.addItem('user1', { productId: '1', quantity: 5 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('removeItem', () => {
    it('should throw if item not found', async () => {
      prisma.cartItem.findFirst.mockResolvedValue(null);
      await expect(service.removeItem('user1', 'item1')).rejects.toThrow(NotFoundException);
    });
  });
});
