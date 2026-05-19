import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { PointsService } from './points.service';

@Controller('points')
export class PointsController {
  constructor(private pointsService: PointsService) {}

  @Get('balance')
  async getBalance(@Query('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId query parameter is required');
    }
    return this.pointsService.getBalance(userId);
  }
}
