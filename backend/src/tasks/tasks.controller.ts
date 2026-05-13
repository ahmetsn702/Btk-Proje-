import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private tasks: TasksService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@GetUser('id') userId: string) {
    return this.tasks.findAll(userId);
  }

  @Get('completions')
  @UseGuards(JwtAuthGuard)
  getCompletions(@GetUser('id') userId: string) {
    return this.tasks.getUserCompletions(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasks.findOne(id);
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  complete(@GetUser('id') userId: string, @Param('id') id: string) {
    return this.tasks.complete(userId, id);
  }
}
