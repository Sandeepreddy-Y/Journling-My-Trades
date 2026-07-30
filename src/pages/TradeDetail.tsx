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
        if (res.data && res.data.data && res.data.data.trade) {
          setTrade(res.data.data.trade);
          setLoading(false);
          return;
        }
      } catch {
        setTrade(null);
      }
      setLoading(false);
    };

    fetchDetail();
  }, [id]);

  const handleDelete = async () => {
    if (!trade) return;
    try {
      await api.delete(`/trades/${trade.id}`);
      toast.success('Trade execution deleted successfully');
      navigate('/trades');
    } catch {
      toast.error('Failed to delete trade');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-xs text-text-muted font-medium tracking-wide">Loading trade execution details...</span>
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto shadow-xl my-12">
        <h2 className="text-lg font-bold text-text-bright">Trade Record Not Found</h2>
        <p className="text-xs text-text-muted">This trade record does not exist or does not belong to your account.</p>
        <button
          onClick={() => navigate('/trades')}
          className="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl shadow-lg hover:bg-primary/90 transition-all"
        >
          Back to Trades Log
        </button>
      </div>
    );
  }

  const entry = trade.entryPrice || 0;
  const exit = trade.exitPrice || 0;
  const sl = trade.stopLoss || 0;
  const tp = trade.takeProfit || 0;
  const lots = trade.lotSize || 0;

  const calcRisk = trade.riskAmount ?? (entry && sl ? Math.abs(entry - sl) * lots * 100 : 0);
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
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white/[0.06] text-text-bright border border-white/[0.08]">
                {trade.symbol}
              </span>
              <span
                className={cn(
                  'text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full',
                  trade.direction === 'long' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss',
                )}
              >
                {trade.direction}
              </span>
              {trade.outcome && (
                <span
                  className={cn(
                    'text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full',
                    trade.outcome === 'win' && 'bg-profit/20 text-profit',
                    trade.outcome === 'loss' && 'bg-loss/20 text-loss',
                    trade.outcome === 'breakeven' && 'bg-white/[0.08] text-text-muted',
                  )}
                >
                  {trade.outcome}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black text-text-bright tracking-tight mt-1">
              Position Details: {trade.symbol} ({trade.direction.toUpperCase()})
            </h1>

            <div className="flex items-center gap-4 text-xs text-text-secondary mt-1">
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

      {/* Grid Details (2 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Card: Price & Position Levels */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <Target className="w-4 h-4 text-primary" /> Execution Price Levels
          </h2>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
              <span className="text-text-muted text-[11px] block">Entry Price</span>
              <span className="font-bold text-text-bright font-mono text-sm">{entry}</span>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
              <span className="text-text-muted text-[11px] block">Exit Price</span>
              <span className="font-bold text-text-bright font-mono text-sm">{exit || 'N/A'}</span>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
              <span className="text-text-muted text-[11px] block">Stop Loss</span>
              <span className="font-bold text-loss font-mono text-sm">{sl || 'N/A'}</span>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
              <span className="text-text-muted text-[11px] block">Take Profit</span>
              <span className="font-bold text-profit font-mono text-sm">{tp || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Right Card: Risk & Reward Parameters */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <TrendingUp className="w-4 h-4 text-profit" /> Risk & Reward Metrics
          </h2>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
              <span className="text-text-muted text-[11px] block">Lot Size</span>
              <span className="font-bold text-text-bright font-mono text-sm">{lots} Lots</span>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
              <span className="text-text-muted text-[11px] block">R:R Ratio</span>
              <span className="font-bold text-primary font-mono text-sm">1:{trade.riskReward || '0.00'}</span>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
              <span className="text-text-muted text-[11px] block flex items-center gap-1">
                <Percent className="w-3 h-3 text-loss" /> Risk %
              </span>
              <span className="font-bold text-loss font-mono text-sm">{riskPercent}% (${calcRisk.toFixed(2)})</span>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
              <span className="text-text-muted text-[11px] block flex items-center gap-1">
                <Percent className="w-3 h-3 text-profit" /> Reward %
              </span>
              <span className="font-bold text-profit font-mono text-sm">{rewardPercent}% (${calcReward.toFixed(2)})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Card */}
      <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-3 shadow-xl">
        <h2 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
          <FileText className="w-4 h-4 text-primary" /> Trade Execution Notes & Psychology
        </h2>
        <p className="text-xs text-text-secondary leading-relaxed bg-white/[0.02] p-4 rounded-xl border border-white/[0.04]">
          {trade.notes || 'No execution notes recorded for this position.'}
        </p>
      </div>

      {/* Before / After Chart Screenshots */}
      {(beforeImg || afterImg) && (
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <ImageIcon className="w-4 h-4 text-primary" /> Before & After Chart Screenshots
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {beforeImg && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-text-muted block">Before Entry Chart</span>
                <div
                  onClick={() => setSelectedImage(beforeImg)}
                  className="relative group rounded-xl overflow-hidden border border-white/[0.08] cursor-pointer"
                >
                  <img src={beforeImg} alt="Before Entry Chart" className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Maximize2 className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            )}

            {afterImg && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-text-muted block">After Exit Chart</span>
                <div
                  onClick={() => setSelectedImage(afterImg)}
                  className="relative group rounded-xl overflow-hidden border border-white/[0.08] cursor-pointer"
                >
                  <img src={afterImg} alt="After Exit Chart" className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Maximize2 className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
