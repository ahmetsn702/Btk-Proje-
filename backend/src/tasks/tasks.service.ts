import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId?: string) {
    const tasks = await this.prisma.task.findMany({
      where: { isActive: true },
      include: { category: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (!userId) return tasks;

    const completions = await this.prisma.userTaskCompletion.findMany({
      where: { userId },
      select: { taskId: true, status: true },
    });
    const completionMap = new Map(completions.map((c) => [c.taskId, c.status]));

    return tasks.map((t) => ({ ...t, userStatus: completionMap.get(t.id) || null }));
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async getUserCompletions(userId: string) {
    return this.prisma.userTaskCompletion.findMany({
      where: { userId },
      include: { task: { include: { category: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async complete(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task || !task.isActive) throw new NotFoundException('Task not found');

    const existing = await this.prisma.userTaskCompletion.findUnique({
      where: { userId_taskId: { userId, taskId } },
    });
    if (existing) throw new BadRequestException('Task already completed');

    // Create completion record as VERIFIED and award CP immediately
    const completion = await this.prisma.userTaskCompletion.create({
      data: {
        userId,
        taskId,
        status: 'VERIFIED',
        completedAt: new Date(),
      },
      include: { task: { include: { category: { select: { id: true, name: true } } } } },
    });

    return { completion, rewardCp: task.rewardCp, categoryName: completion.task.category.name };
  }
}
