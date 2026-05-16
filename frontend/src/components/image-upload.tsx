'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ImagePlus, Loader2, X } from 'lucide-react';

interface ImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function ImageUpload({ value, onChange, max = 5 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).slice(0, max - value.length);
      if (fileArray.length === 0) return;

      const formData = new FormData();
      if (fileArray.length === 1) {
        formData.append('file', fileArray[0]);
      } else {
        fileArray.forEach((f) => formData.append('files', f));
      }

      setUploading(true);
      try {
        const endpoint = fileArray.length === 1 ? '/upload/image' : '/upload/images';
        const { data } = await api.post<{ urls: string[] }>(endpoint, formData);
        onChange([...value, ...data.urls]);
      } catch {
        toast.error('Görsel yüklenemedi');
      } finally {
        setUploading(false);
      }
    },
    [value, onChange, max],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
    },
    [upload],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) upload(e.target.files);
    e.target.value = '';
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {/* Thumbnail grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {value.map((url, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-md border">
              <img
                src={url.startsWith('/') ? `${API_URL}${url}` : url}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 rounded-full bg-destructive p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {value.length < max && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImagePlus className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Sürükle & bırak veya tıkla ({value.length}/{max})
              </p>
              <p className="text-xs text-muted-foreground/70">JPG, PNG, WebP • Max 5MB</p>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}
