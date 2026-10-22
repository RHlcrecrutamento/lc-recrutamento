'use client';
import { useRouter } from 'next/navigation';

export function TaskButtons({ taskId }: { taskId: string }) {
  const router = useRouter();
  return (
    <button
      className="btn-outline text-xs"
      onClick={async () => {
        await fetch('/api/admin/tarefas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'concluir', id: taskId }),
        });
        router.refresh();
      }}
    >
      ✔ Concluir
    </button>
  );
}
