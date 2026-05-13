import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

class CreateAddressDto {
  @IsString()
  title: string;

  @IsString()
  fullName: string;

  @IsString()
  phone: string;

  @IsString()
  city: string;

  @IsString()
  district: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll(@GetUser('id') userId: string) {
    return this.prisma.address.findMany({ where: { userId }, orderBy: { isDefault: 'desc' } });
  }

  @Post()
  async create(@GetUser('id') userId: string, @Body() dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.address.create({ data: { ...dto, userId } });
  }

  @Delete(':id')
  async remove(@GetUser('id') userId: string, @Param('id') id: string) {
    await this.prisma.address.deleteMany({ where: { id, userId } });
    return { success: true };
  }
}
