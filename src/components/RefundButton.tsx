'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RefundButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <button
      className="btn-danger px-3 py-1 text-xs"
      disabled={loading}
      onClick={async () => {
        if (!confirm('Reembolsar este pedido? O desbloqueio de dados será revogado.')) return;
        setLoading(true);
        await fetch('/api/admin/reembolsar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId }),
        });
        setLoading(false);
        router.refresh();
      }}
    >
      {loading ? '…' : 'Reembolsar'}
    </button>
  );
}
