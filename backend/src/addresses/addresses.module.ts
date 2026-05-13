import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AddressesController } from './addresses.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AddressesController],
})
export class AddressesModule {}
