import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import {
  MOCK_EQUITY_CURVE,
  MOCK_MONTHLY_PERFORMANCE,
  MOCK_SESSION_PERFORMANCE,
  MOCK_TOP_SETUPS,
} from '@/lib/dummyData';

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

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
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

    // Fallback Mock
    setData({
      overview: {
        totalPnl: 14850.25,
        totalTrades: 128,
        winCount: 83,
        lossCount: 38,
        breakevenCount: 7,
        winRate: 64.8,
        profitFactor: 2.15,
        averageRrr: 2.35,
        averageWin: 420.50,
        averageLoss: 210.30,
        expectancy: 202.82,
        maxDrawdown: 1250.00,
        maxDrawdownPercent: 2.4,
        consecutiveWins: 9,
        consecutiveLosses: 3,
        bestSetup: 'Liquidity Grab + FVG',
        worstSetup: 'Impulse Breakout',
        bestSession: 'London Session',
        worstSession: 'Sydney Session',
      },
      equityCurve: MOCK_EQUITY_CURVE,
      monthlyReturns: MOCK_MONTHLY_PERFORMANCE.map((m) => ({ ...m, tradesCount: 15 })),
      sessionPerformance: MOCK_SESSION_PERFORMANCE,
      topSetups: MOCK_TOP_SETUPS,
      dailyReturns: [],
    });
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
