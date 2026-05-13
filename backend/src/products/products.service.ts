import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../database/generated/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, QueryProductsDto, UpdateProductDto } from './dto/products.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryProductsDto) {
    const { search, categoryId, minPrice, maxPrice, sortBy, page = 1, limit = 20 } = query;

    const where: Prisma.ProductWhereInput = { isActive: true };
    if (categoryId) where.categoryId = categoryId;
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.priceFiat = {};
      if (minPrice !== undefined) where.priceFiat.gte = minPrice;
      if (maxPrice !== undefined) where.priceFiat.lte = maxPrice;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sortBy === 'price_asc'
        ? { priceFiat: 'asc' }
        : sortBy === 'price_desc'
          ? { priceFiat: 'desc' }
          : sortBy === 'name'
            ? { name: 'asc' }
            : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { category: { select: { id: true, name: true, slug: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        priceFiat: dto.priceFiat,
        stock: dto.stock,
        categoryId: dto.categoryId,
        images: dto.images ?? [],
      },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.delete({ where: { id } });
  }

  /** Transaction-safe stock adjustment (race condition prevention) */
  async adjustStock(productId: string, delta: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: productId },
        select: { id: true, stock: true },
      });
      const newStock = product.stock + delta;
      if (newStock < 0) throw new Error('Insufficient stock');
      return tx.product.update({
        where: { id: productId },
        data: { stock: newStock },
      });
    });
  }

  /** Internal: get stock by category for Dev2's algorithm */
  async getStockByCategory(categoryId: string) {
    const result = await this.prisma.product.aggregate({
      where: { categoryId, isActive: true },
      _sum: { stock: true },
      _count: true,
    });
    return {
      categoryId,
      totalStock: result._sum.stock ?? 0,
      productCount: result._count,
    };
  }
}
