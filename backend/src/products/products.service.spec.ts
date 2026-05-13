import { Test } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: Record<string, Record<string, jest.Mock> | jest.Mock>;

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    const module = await Test.createTestingModule({
      providers: [ProductsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ProductsService);
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: '1', name: 'Test' }]);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by categoryId', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll({ categoryId: 'cat1', page: 1, limit: 20 });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ categoryId: 'cat1' }) }),
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if product not found', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return product', async () => {
      const product = { id: '1', name: 'Test', category: {} };
      prisma.product.findUnique.mockResolvedValue(product);
      const result = await service.findOne('1');
      expect(result).toEqual(product);
    });
  });

  describe('adjustStock', () => {
    it('should throw if insufficient stock', async () => {
      prisma.product.findUniqueOrThrow = jest.fn().mockResolvedValue({ id: '1', stock: 5 });
      prisma.product.update.mockResolvedValue({});
      prisma.$transaction.mockImplementation(async (fn) => fn(prisma));

      await expect(service.adjustStock('1', -10)).rejects.toThrow('Insufficient stock');
    });
  });
});
