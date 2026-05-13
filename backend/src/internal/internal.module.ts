import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { InternalController } from './internal.controller';

@Module({
  imports: [ProductsModule],
  controllers: [InternalController],
})
export class InternalModule {}
