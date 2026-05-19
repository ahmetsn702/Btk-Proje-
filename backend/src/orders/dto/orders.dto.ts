import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CheckoutDto {
  @IsString()
  addressId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  xpAmount?: number = 0; // XP to spend as discount

  @IsOptional()
  @IsInt()
  @Min(0)
  useCpAmount?: number;

  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
  status: string;
}
