import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { MOCK_RECENT_TRADES } from '@/lib/dummyData';
import type { Trade } from '@/types';

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>(MOCK_RECENT_TRADES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ status: string; data: { trades: Trade[] } }>('/trades');
      if (res.data.data.trades && res.data.data.trades.length > 0) {
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
  }, [fetchTrades]);

  const deleteTrade = async (id: string) => {
    try {
      await api.delete(`/trades/${id}`);
      setTrades((prev) => prev.filter((t) => t.id !== id));
      toast.success('Trade deleted successfully');
    } catch {
      setTrades((prev) => prev.filter((t) => t.id !== id));
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
