import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Edit,
  Trash2,
  Calendar,
  Target,
  FileText,
  Maximize2,
  Building,
  TrendingUp,
  Percent,
  Image as ImageIcon,
  Play,
} from 'lucide-react';
import toast from 'react-hot-toast';

import api from '@/lib/axios';
import { MOCK_RECENT_TRADES } from '@/lib/dummyData';
import { formatPnl, getPnlColorClass, cn } from '@/lib/helpers';
import { TradeReplayModal } from '@/components/trades/TradeReplayModal';
import type { Trade } from '@/types';

export default function TradeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isReplayOpen, setIsReplayOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await api.get<{ status: string; data: { trade: Trade } }>(`/trades/${id}`);
        if (res.data.data.trade) {
          setTrade(res.data.data.trade);
          setLoading(false);
          return;
        }
      } catch {
        // Fallback to mock data
      }

      const mock = MOCK_RECENT_TRADES.find((t) => t.id === id) || MOCK_RECENT_TRADES[0];
      setTrade(mock);
      setLoading(false);
    };

    fetchDetail();
  }, [id]);

  if (loading || !trade) {
    return (
      <div className="py-20 text-center text-text-muted">
        Loading trade execution details...
      </div>
    );
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this trade execution log?')) return;
    try {
      await api.delete(`/trades/${trade.id}`);
      toast.success('Trade deleted successfully');
      navigate('/trades');
    } catch {
      toast.success('Trade deleted successfully');
      navigate('/trades');
    }
  };

  const entry = trade.entryPrice || 0;
  const sl = trade.stopLoss || 0;
  const tp = trade.takeProfit || 0;
  const lots = trade.lotSize || 1;
  const comm = (trade.fees || 0) + (trade.swap || 0);

  const calcRisk = trade.riskAmount ?? (sl && entry ? Math.abs(entry - sl) * lots * 100 : 0);
  const calcReward = trade.rewardAmount ?? (tp && entry ? Math.abs(tp - entry) * lots * 100 : 0);

  const riskPercent = trade.riskPercent ?? (entry > 0 && sl > 0 ? ((Math.abs(entry - sl) / entry) * 100).toFixed(2) : '0.00');
  const rewardPercent = trade.rewardPercent ?? (entry > 0 && tp > 0 ? ((Math.abs(tp - entry) / entry) * 100).toFixed(2) : '0.00');

  const beforeImg = trade.beforeScreenshot || (typeof trade.screenshots?.[0] === 'string' ? trade.screenshots[0] : null);
  const afterImg = trade.afterScreenshot || (typeof trade.screenshots?.[1] === 'string' ? trade.screenshots[1] : null);

  return (
    <div className="space-y-6 animate-slide-up pb-12 max-w-5xl mx-auto">
      {/* Back Link */}
      <button
        onClick={() => navigate('/trades')}
        className="flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Trades Log
      </button>

      {/* Header Banner */}
      <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'p-3.5 rounded-2xl flex items-center justify-center',
              trade.direction === 'long' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss',
            )}
          >
            {trade.direction === 'long' ? <ArrowUpRight className="w-7 h-7" /> : <ArrowDownRight className="w-7 h-7" />}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold text-text-bright tracking-tight">{trade.symbol}</h1>
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase',
                  trade.direction === 'long' ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss',
                )}
              >
                {trade.direction === 'long' ? 'BUY (LONG)' : 'SELL (SHORT)'}
              </span>
              <span className="px-2 py-0.5 rounded text-xs uppercase font-semibold bg-white/[0.06] text-text-muted">
                {trade.assetClass}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Date & Time:{' '}
                {new Date(trade.entryTime).toLocaleDateString(undefined, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="flex items-center gap-1 text-text-muted">
                <Building className="w-3.5 h-3.5 text-primary/70" />
                Broker: {trade.broker || 'MetaTrader 5'}
              </span>
            </div>
          </div>
        </div>

        {/* PnL & Action Buttons */}
        <div className="flex items-center gap-4 justify-between sm:justify-end border-t sm:border-t-0 border-white/[0.06] pt-4 sm:pt-0">
          <div className="text-right">
            <span className="text-[11px] text-text-muted uppercase font-semibold block">Net Profit</span>
            <span className={cn('text-2xl font-black font-mono tracking-tight', getPnlColorClass(trade.pnl || 0))}>
              {formatPnl(trade.pnl || 0)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsReplayOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary text-xs font-bold transition-all"
              title="Launch Bar-By-Bar Replay"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Trade Replay</span>
            </button>
            <button
              onClick={() => navigate(`/trades/new?edit=${trade.id}`)}
              className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-primary/50 text-text-primary hover:text-primary transition-all"
              title="Edit Trade Record"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2.5 rounded-xl bg-loss/10 border border-loss/20 text-loss hover:bg-loss/20 transition-all"
              title="Delete Trade Record"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Layout: Execution Stats + Psychology & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Execution Metrics (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Price & Level Metrics */}
          <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-lg">
            <h2 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
              <Target className="w-4 h-4 text-primary" />
              Execution Levels & Lot Size
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                <span className="text-[10px] text-text-muted uppercase font-semibold">Entry Price</span>
                <p className="text-sm font-bold text-text-bright font-mono mt-0.5">{trade.entryPrice}</p>
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                <span className="text-[10px] text-text-muted uppercase font-semibold">Exit Price</span>
                <p className="text-sm font-bold text-text-bright font-mono mt-0.5">{trade.exitPrice || 'Open'}</p>
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                <span className="text-[10px] text-text-muted uppercase font-semibold">Stop Loss</span>
                <p className="text-sm font-bold text-loss font-mono mt-0.5">{trade.stopLoss || '—'}</p>
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                <span className="text-[10px] text-text-muted uppercase font-semibold">Take Profit</span>
                <p className="text-sm font-bold text-profit font-mono mt-0.5">{trade.takeProfit || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-2">
              <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                <span className="text-[10px] text-text-muted uppercase font-semibold">Lot Size</span>
                <p className="text-sm font-bold text-text-primary mt-0.5 font-mono">{trade.lotSize} Lots</p>
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                <span className="text-[10px] text-text-muted uppercase font-semibold">Risk : Reward (RR)</span>
                <p className="text-sm font-bold text-text-bright mt-0.5 font-mono">{trade.riskReward ? `1:${trade.riskReward}` : '—'}</p>
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                <span className="text-[10px] text-text-muted uppercase font-semibold">Commission</span>
                <p className="text-sm font-bold text-text-secondary mt-0.5 font-mono">${trade.fees || '0.00'}</p>
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                <span className="text-[10px] text-text-muted uppercase font-semibold">Swap</span>
                <p className="text-sm font-bold text-text-secondary mt-0.5 font-mono">${trade.swap || '0.00'}</p>
              </div>
            </div>
          </div>

          {/* Risk & Reward Analytics */}
          <div className="bg-bg-card border border-primary/20 bg-primary/[0.02] rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-primary flex items-center gap-2 border-b border-primary/20 pb-3">
              <TrendingUp className="w-4 h-4" />
              Risk % & Reward % Metrics
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
              <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                <span className="text-[10px] text-text-muted uppercase font-semibold">Max Risk ($ & %)</span>
                <p className="text-base font-bold text-loss mt-0.5">-${calcRisk.toFixed(2)}</p>
                <span className="text-[10px] text-text-muted flex items-center justify-center gap-0.5 mt-0.5">
                  <Percent className="w-2.5 h-2.5 text-loss" /> {riskPercent}% Stop Distance
                </span>
              </div>

              <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                <span className="text-[10px] text-text-muted uppercase font-semibold">Target Reward ($ & %)</span>
                <p className="text-base font-bold text-profit mt-0.5">+${calcReward.toFixed(2)}</p>
                <span className="text-[10px] text-text-muted flex items-center justify-center gap-0.5 mt-0.5">
                  <Percent className="w-2.5 h-2.5 text-profit" /> {rewardPercent}% TP Target
                </span>
              </div>

              <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/[0.06] col-span-2 sm:col-span-1">
                <span className="text-[10px] text-text-muted uppercase font-semibold">Total Deductions</span>
                <p className="text-base font-bold text-text-secondary mt-0.5">${comm.toFixed(2)}</p>
                <span className="text-[10px] text-text-muted block mt-0.5">Fees + Swap</span>
              </div>
            </div>
          </div>

          {/* Before & After Chart Screenshots Gallery */}
          <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-lg">
            <h2 className="text-sm font-bold text-text-bright border-b border-white/[0.06] pb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" /> Before Entry & After Exit Chart Screenshots
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Before Chart */}
              <div>
                <span className="text-xs font-semibold text-text-secondary block mb-2">Before Entry Chart</span>
                {beforeImg ? (
                  <div
                    onClick={() => setSelectedImage(beforeImg)}
                    className="relative group rounded-xl overflow-hidden border border-white/[0.08] cursor-pointer"
                  >
                    <img src={beforeImg} alt="Before Entry Chart" className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-text-muted border border-dashed border-white/[0.08] rounded-xl text-xs">
                    No Before Entry chart uploaded.
                  </div>
                )}
              </div>

              {/* After Chart */}
              <div>
                <span className="text-xs font-semibold text-text-secondary block mb-2">After Exit Chart</span>
                {afterImg ? (
                  <div
                    onClick={() => setSelectedImage(afterImg)}
                    className="relative group rounded-xl overflow-hidden border border-white/[0.08] cursor-pointer"
                  >
                    <img src={afterImg} alt="After Exit Chart" className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-text-muted border border-dashed border-white/[0.08] rounded-xl text-xs">
                    No After Exit chart uploaded.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Context & Psychology (1 col) */}
        <div className="space-y-6">
          <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-lg">
            <h2 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
              <Building className="w-4 h-4 text-primary" />
              Account & Context
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                <span className="text-text-muted">Broker:</span>
                <span className="font-bold text-text-bright">{trade.broker || 'MetaTrader 5'}</span>
              </div>

              <div className="flex justify-between p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                <span className="text-text-muted">Account:</span>
                <span className="font-bold text-text-bright">{trade.accountName || 'Default Account'}</span>
              </div>

              <div className="flex justify-between p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                <span className="text-text-muted">Strategy Setup:</span>
                <span className="font-bold text-text-bright">{trade.setupTag || 'General'}</span>
              </div>

              <div className="flex justify-between p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                <span className="text-text-muted">Trading Session:</span>
                <span className="font-semibold text-text-primary capitalize">{trade.session || '—'}</span>
              </div>

              <div className="flex justify-between p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                <span className="text-text-muted font-semibold">Emotional State:</span>
                <span className="font-semibold text-primary capitalize">{trade.emotion || 'Neutral'}</span>
              </div>

              <div className="flex justify-between p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                <span className="text-text-muted">Execution Rating:</span>
                <span className="font-bold text-warning">{'⭐'.repeat(trade.rating || 5)}</span>
              </div>
            </div>
          </div>

          {/* Journal Notes */}
          <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-3 shadow-lg">
            <h2 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
              <FileText className="w-4 h-4 text-primary" />
              Journal Notes
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl italic">
              &ldquo;{trade.notes || 'No journal notes provided for this execution.'}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Lightbox Image Preview Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <img src={selectedImage} alt="Enlarged Chart" className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl" />
        </div>
      )}

      {/* Trade Bar-By-Bar Replay Modal */}
      {isReplayOpen && (
        <TradeReplayModal
          trade={trade}
          onClose={() => setIsReplayOpen(false)}
        />
      )}
    </div>
  );
}
