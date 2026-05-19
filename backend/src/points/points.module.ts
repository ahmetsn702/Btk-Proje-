import { Module } from '@nestjs/common';
import { PointsController } from './points.controller';
import { PointsService } from './points.service';
import { BonusService } from './bonus.service';

@Module({
  controllers: [PointsController],
  providers: [PointsService, BonusService],
  exports: [PointsService, BonusService],
})
export class PointsModule {}
