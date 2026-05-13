import { Controller, Get, Param } from '@nestjs/common';
import { ProductsService } from '../products/products.service';

@Controller('internal')
export class InternalController {
  constructor(private products: ProductsService) {}

  /** GET /internal/stock/:categoryId — Dev2's algorithm fetches stock data from here */
  @Get('stock/:categoryId')
  getStock(@Param('categoryId') categoryId: string) {
    return this.products.getStockByCategory(categoryId);
  }
}
