import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PointsService {
  constructor(private prisma: PrismaService) {}

  async getBalance(userId: string) {
    const categories = await this.prisma.category.findMany();
    const categoryBalancesMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        cpToTlRate: number;
        bonusMultiplier: number;
        bonusActive: boolean;
        cpBalance: number;
      }
    >();

    for (const cat of categories) {
      categoryBalancesMap.set(cat.id, {
        categoryId: cat.id,
        categoryName: cat.name,
        cpToTlRate: cat.cpToTlRate,
        bonusMultiplier: cat.bonusMultiplier,
        bonusActive: cat.bonusActive,
        cpBalance: 0,
      });
    }

    const transactions = await this.prisma.pointTransaction.findMany({
      where: { userId },
    });

    let cp = 0;
    let xp = 0;

    for (const tx of transactions) {
      if (tx.type === 'CP_EARN') {
        cp += tx.amount;
      } else if (tx.type === 'CP_SPEND') {
        cp -= tx.amount;
      } else if (tx.type === 'XP_EARN') {
        xp += tx.amount;
      } else if (tx.type === 'XP_SPEND') {
        xp -= tx.amount;
      }

      if (tx.categoryId && (tx.type === 'CP_EARN' || tx.type === 'CP_SPEND')) {
        const catData = categoryBalancesMap.get(tx.categoryId);
        if (catData) {
          if (tx.type === 'CP_EARN') catData.cpBalance += tx.amount;
          if (tx.type === 'CP_SPEND') catData.cpBalance -= tx.amount;
        }
      }
    }

    const categoryBalances = Array.from(categoryBalancesMap.values());

    return { cp, xp, categoryBalances };
  }
}
