'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';

interface AiDescriptionButtonProps {
  type: 'product' | 'task';
  name: string;
  category: string;
  onGenerated: (desc: string) => void;
}

export function AiDescriptionButton({
  type,
  name,
  category,
  onGenerated,
}: AiDescriptionButtonProps) {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!name || !category) {
      toast.error('Önce ürün adı ve kategori seçin');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post<{ description: string }>('/ai/generate-description', {
        type,
        name,
        category,
      });
      onGenerated(data.description);
    } catch {
      toast.error('AI açıklama üretilemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={generate} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
      ) : (
        <Sparkles className="mr-1 h-3 w-3" />
      )}
      AI ile Üret
    </Button>
  );
}
