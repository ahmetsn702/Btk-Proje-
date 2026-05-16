import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';

class GenerateDescriptionDto {
  @IsIn(['product', 'task'])
  type: 'product' | 'task';

  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  extra?: string;
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private ai: AiService) {}

  @Post('generate-description')
  async generateDescription(@Body() dto: GenerateDescriptionDto) {
    const prompt =
      dto.type === 'product'
        ? `${dto.category} kategorisinde '${dto.name}' ürünü için açıklama yaz. ${dto.extra || ''}`
        : `${dto.category} kategorisinde '${dto.name}' görevi için kısa açıklama yaz. ${dto.extra || ''}`;

    const description = await this.ai.generateDescription(prompt);
    return { description };
  }
}
