import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private cart: CartService) {}

  @Get()
  getCart(@GetUser('id') userId: string) {
    return this.cart.getCart(userId);
  }

  @Post('items')
  addItem(@GetUser('id') userId: string, @Body() dto: AddCartItemDto) {
    return this.cart.addItem(userId, dto);
  }

  @Patch('items/:id')
  updateItem(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cart.updateItem(userId, id, dto);
  }

  @Delete('items/:id')
  removeItem(@GetUser('id') userId: string, @Param('id') id: string) {
    return this.cart.removeItem(userId, id);
  }
}
