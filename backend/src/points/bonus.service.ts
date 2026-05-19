import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BonusService {
  private readonly logger = new Logger(BonusService.name);

  constructor(private prisma: PrismaService) {}

  @Cron('0 0 * * *')
  async handleDailyBonusCheck() {
    this.logger.log('Starting daily category bonus check...');
    await this.checkAndUpdateBonuses();
    this.logger.log('Daily category bonus check completed.');
  }

  async checkAndUpdateBonuses() {
    const categories = await this.prisma.category.findMany();
    const updatedCategories = [];

    for (const category of categories) {
      const earnedResult = await this.prisma.pointTransaction.aggregate({
        _sum: { amount: true },
        where: {
          categoryId: category.id,
          type: 'CP_EARN',
        },
      });

      const spentResult = await this.prisma.pointTransaction.aggregate({
        _sum: { amount: true },
        where: {
          categoryId: category.id,
          type: 'CP_SPEND',
        },
      });

      const earned = earnedResult._sum.amount ?? 0;
      const spent = spentResult._sum.amount ?? 0;
      const totalCp = earned - spent;

      const bonusActive = totalCp < category.bonusThreshold;
      const bonusMultiplier = bonusActive ? 1.5 : 1.0;

      const updated = await this.prisma.category.update({
        where: { id: category.id },
        data: {
          bonusActive,
          bonusMultiplier,
        },
      });

      updatedCategories.push(updated);

      this.logger.log(
        `Category: ${category.name} | Total CP: ${totalCp} | Threshold: ${category.bonusThreshold} | Bonus Active: ${bonusActive} | Multiplier: ${bonusMultiplier}`,
      );
    }

    return updatedCategories;
  }
}
