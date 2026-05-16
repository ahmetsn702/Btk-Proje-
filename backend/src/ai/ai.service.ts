import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (key) this.ai = new GoogleGenAI({ apiKey: key });
  }

  async generateDescription(prompt: string): Promise<string> {
    if (!this.ai) throw new ServiceUnavailableException('GEMINI_API_KEY not configured');

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'Sen bir e-ticaret platformu için Türkçe içerik üreten bir asistansın. Kısa, çekici ve bilgilendirici açıklamalar yaz. Maksimum 2 cümle.',
      },
    });

    return response.text?.trim() || '';
  }
}
