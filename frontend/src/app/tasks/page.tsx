'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Coins, Star, CheckCircle, Loader2, Flame } from 'lucide-react';
import { useMarketRates } from '@/hooks/use-market-rates';

interface Task {
  id: string;
  title: string;
  description?: string;
  type: string;
  difficulty: string;
  rewardCp: number;
  durationMin?: number;
  category: { id: string; name: string; slug: string };
  userStatus?: string | null;
}

interface Completion {
  id: string;
  status: string;
  completedAt?: string;
  createdAt: string;
  task: { id: string; title: string; rewardCp: number; category: { id: string; name: string } };
}

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  EASY: { label: 'Kolay', color: 'text-green-600 bg-green-50' },
  MEDIUM: { label: 'Orta', color: 'text-yellow-600 bg-yellow-50' },
  HARD: { label: 'Zor', color: 'text-red-600 bg-red-50' },
};

const TYPE_LABELS: Record<string, string> = {
  REVIEW_READ: 'İnceleme Okuma',
  PRODUCT_SHARE: 'Ürün Paylaşma',
  SURVEY: 'Anket',
  QUIZ: 'Quiz',
  REFERRAL: 'Davet',
};

export default function TasksPage() {
  const { isAuthenticated } = useAuthStore();
  const { rates } = useMarketRates();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [tab, setTab] = useState<'available' | 'history'>('available');

  const surgeCategories = new Map(
    rates.filter((r) => r.surgeActive).map((r) => [r.categoryName, r.surgeMultiplier]),
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([api.get('/tasks'), api.get('/tasks/completions')])
      .then(([tasksRes, compRes]) => {
        setTasks(tasksRes.data);
        setCompletions(compRes.data);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleComplete = async (taskId: string) => {
    setCompleting(taskId);
    try {
      const { data } = await api.post(`/tasks/${taskId}/complete`);
      toast.success(`🎉 +${data.rewardCp} CP (${data.categoryName}) kazandınız!`, {
        duration: 5000,
      });
      // Refresh
      const [tasksRes, compRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/tasks/completions'),
      ]);
      setTasks(tasksRes.data);
      setCompletions(compRes.data);
      setSelectedTask(null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Görev tamamlanamadı';
      toast.error(message);
    } finally {
      setCompleting(null);
    }
  };

  const availableTasks = tasks
    .filter((t) => !t.userStatus)
    .sort((a, b) => {
      const aS = surgeCategories.has(a.category.name) ? 1 : 0;
      const bS = surgeCategories.has(b.category.name) ? 1 : 0;
      return bS - aS;
    });

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Görevler</h1>
          <div className="flex rounded-md border">
            <button
              onClick={() => setTab('available')}
              className={`px-4 py-2 text-sm font-medium ${tab === 'available' ? 'bg-primary text-primary-foreground' : ''}`}
            >
              Mevcut ({availableTasks.length})
            </button>
            <button
              onClick={() => setTab('history')}
              className={`px-4 py-2 text-sm font-medium ${tab === 'history' ? 'bg-primary text-primary-foreground' : ''}`}
            >
              Geçmiş ({completions.length})
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Yükleniyor...</p>
        ) : tab === 'available' ? (
          /* Mevcut Görevler */
          availableTasks.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              Tüm görevleri tamamladınız! 🎉
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableTasks.map((task) => {
                const diff = DIFFICULTY_LABELS[task.difficulty] || DIFFICULTY_LABELS.EASY;
                const surgeMult = surgeCategories.get(task.category.name);
                return (
                  <Card
                    key={task.id}
                    className={`cursor-pointer transition-shadow hover:shadow-md ${surgeMult ? 'border-orange-400 ring-1 ring-orange-300' : ''}`}
                    onClick={() => setSelectedTask(task)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {TYPE_LABELS[task.type] || task.type}
                        </span>
                        <div className="flex items-center gap-1">
                          {surgeMult && (
                            <span className="flex items-center gap-0.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-2 py-0.5 text-xs font-bold text-white">
                              <Flame className="h-3 w-3" />
                              {surgeMult}X
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${diff.color}`}
                          >
                            {diff.label}
                          </span>
                        </div>
                      </div>
                      <CardTitle className="text-base">{task.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{task.category.name}</span>
                        <div className="flex items-center gap-3">
                          {task.durationMin && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {task.durationMin}dk
                            </span>
                          )}
                          <span className="flex items-center gap-1 font-semibold text-primary">
                            <Coins className="h-3 w-3" />
                            {task.rewardCp} CP
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        ) : /* Tamamlanan Görevler Geçmişi */
        completions.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">Henüz tamamlanan görev yok.</p>
        ) : (
          <div className="space-y-3">
            {completions.map((c) => {
              const isPending = c.status === 'PENDING';
              return (
                <div key={c.id} className="flex items-center gap-4 rounded-md border p-4">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isPending ? 'bg-yellow-50' : 'bg-green-50'}`}
                  >
                    {isPending ? (
                      <Clock className="h-5 w-5 text-yellow-600" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{c.task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.task.category.name} •{' '}
                      {new Date(c.completedAt || c.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    {isPending ? (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700 border border-yellow-200">
                        Doğrulama bekleniyor
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 border border-green-200">
                        Tamamlandı +{c.task.rewardCp} CP
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Görev Detay Modal */}
        {selectedTask && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setSelectedTask(null)}
          >
            <div
              className="mx-4 w-full max-w-md rounded-lg bg-background p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {TYPE_LABELS[selectedTask.type] || selectedTask.type}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_LABELS[selectedTask.difficulty]?.color}`}
                  >
                    {DIFFICULTY_LABELS[selectedTask.difficulty]?.label}
                  </span>
                </div>

                <h2 className="text-xl font-bold">{selectedTask.title}</h2>

                {selectedTask.description && (
                  <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    {selectedTask.category.name}
                  </span>
                  {selectedTask.durationMin && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />~{selectedTask.durationMin}{' '}
                      dakika
                    </span>
                  )}
                </div>

                <div className="rounded-md bg-primary/5 p-3 text-center">
                  <p className="text-sm text-muted-foreground">Ödül</p>
                  <p className="text-2xl font-bold text-primary">{selectedTask.rewardCp} CP</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedTask.category.name} kategorisi
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedTask(null)}
                  >
                    Kapat
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleComplete(selectedTask.id)}
                    disabled={completing === selectedTask.id}
                  >
                    {completing === selectedTask.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Doğrulanıyor...
                      </>
                    ) : (
                      'Tamamladım ✓'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
