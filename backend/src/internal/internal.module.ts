import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';
import { InternalController } from './internal.controller';

@Module({
  imports: [ProductsModule, PrismaModule],
  controllers: [InternalController],
})
export class InternalModule {}
