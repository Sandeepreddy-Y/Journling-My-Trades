import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';

export interface AnalyticsData {
  overview: {
    totalPnl: number;
    totalTrades: number;
    winCount: number;
    lossCount: number;
    breakevenCount: number;
    winRate: number;
    profitFactor: number;
    averageRrr: number;
    averageWin: number;
    averageLoss: number;
    expectancy: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    consecutiveWins: number;
    consecutiveLosses: number;
    bestSetup: string;
    worstSetup: string;
    bestSession: string;
    worstSession: string;
  };
  equityCurve: Array<{ date: string; cumulativePnl: number; tradeCount: number }>;
  monthlyReturns: Array<{ month: string; pnl: number; tradesCount: number }>;
  sessionPerformance: Array<{ group: string; totalPnl: number; tradeCount: number; winRate: number; avgPnl: number }>;
  topSetups: Array<{ name: string; winRate: number; pnl: number; trades: number }>;
  dailyReturns: Array<{ date: string; pnl: number; tradeCount: number }>;
}

const DEFAULT_ZERO_ANALYTICS: AnalyticsData = {
  overview: {
    totalPnl: 0,
    totalTrades: 0,
    winCount: 0,
    lossCount: 0,
    breakevenCount: 0,
    winRate: 0,
    profitFactor: 0,
    averageRrr: 0,
    averageWin: 0,
    averageLoss: 0,
    expectancy: 0,
    maxDrawdown: 0,
    maxDrawdownPercent: 0,
    consecutiveWins: 0,
    consecutiveLosses: 0,
    bestSetup: 'N/A',
    worstSetup: 'N/A',
    bestSession: 'N/A',
    worstSession: 'N/A',
  },
  equityCurve: [],
  monthlyReturns: [],
  sessionPerformance: [],
  topSetups: [],
  dailyReturns: [],
};

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsData>(DEFAULT_ZERO_ANALYTICS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ status: string; data: AnalyticsData }>('/analytics');
      if (res.data && res.data.data) {
        setData(res.data.data);
        setIsLoading(false);
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics');
    }

    // Default zero state for fresh personal accounts
    setData(DEFAULT_ZERO_ANALYTICS);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchAnalytics,
  };
}
