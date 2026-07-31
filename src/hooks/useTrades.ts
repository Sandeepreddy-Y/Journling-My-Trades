import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import type { Trade } from '@/types';

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ status: string; data: { trades: Trade[] } }>('/trades');
      if (Array.isArray(res.data?.data?.trades)) {
        setTrades(res.data.data.trades);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trades');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrades();

    const handleUpdate = () => {
      fetchTrades();
    };

    window.addEventListener('trades-updated', handleUpdate);
    return () => {
      window.removeEventListener('trades-updated', handleUpdate);
    };
  }, [fetchTrades]);

  const deleteTrade = async (id: string) => {
    try {
      await api.delete(`/trades/${id}`);
      setTrades((prev) => prev.filter((t) => t.id !== id));
      window.dispatchEvent(new CustomEvent('trades-updated'));
      toast.success('Trade deleted successfully');
    } catch {
      setTrades((prev) => prev.filter((t) => t.id !== id));
      window.dispatchEvent(new CustomEvent('trades-updated'));
      toast.success('Trade deleted successfully');
    }
  };

  return {
    trades,
    isLoading,
    error,
    refetch: fetchTrades,
    deleteTrade,
  };
}
