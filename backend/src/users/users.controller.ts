import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LinkWalletDto, UpdateUserDto } from './dto/users.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  getMe(@GetUser('id') userId: string) {
    return this.users.getMe(userId);
  }

  @Patch('me')
  updateMe(@GetUser('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.users.updateMe(userId, dto);
  }

  @Post('me/wallet')
  linkWallet(@GetUser('id') userId: string, @Body() dto: LinkWalletDto) {
    return this.users.linkWallet(userId, dto);
  }
}
