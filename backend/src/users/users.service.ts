import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LinkWalletDto, UpdateUserDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
      },
    });
  }

  async linkWallet(userId: string, dto: LinkWalletDto) {
    // TODO: Verify signature with ethers.js (personal_sign verification)
    // For now, just store the wallet address
    const existing = await this.prisma.user.findFirst({
      where: { walletAddress: dto.walletAddress, NOT: { id: userId } },
    });
    if (existing) throw new BadRequestException('Wallet already linked to another account');

    return this.prisma.user.update({
      where: { id: userId },
      data: { walletAddress: dto.walletAddress },
      select: { id: true, walletAddress: true },
    });
  }
}
