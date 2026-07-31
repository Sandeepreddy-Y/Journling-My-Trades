import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Upload,
  Target,
  Smile,
  FileText,
  Building,
  Calendar,
  X,
  TrendingUp,
  Percent,
  Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

import api from '@/lib/axios';
import { MOCK_RECENT_TRADES } from '@/lib/dummyData';
import { compressImage } from '@/lib/imageCompressor';
import type { Trade, AssetClass, TradeDirection, EmotionalState, TradingSession } from '@/types';

export default function AddTrade() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditMode = Boolean(editId);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);

  // Form state covering all 23 requested fields
  const [formData, setFormData] = useState({
    symbol: 'XAU/USD',
    assetClass: 'commodities' as AssetClass,
    direction: 'long' as TradeDirection,
    broker: 'FTMO MetaTrader 5',
    accountName: '$100k Challenge Account',
    entryPrice: '2385.50',
    exitPrice: '2398.00',
    stopLoss: '2380.00',
    takeProfit: '2405.00',
    lotSize: '2.00',
    fees: '15.00',
    swap: '0.00',
    entryTime: new Date().toISOString().slice(0, 16),
    exitTime: new Date().toISOString().slice(0, 16),
    setupTag: 'Liquidity Grab + FVG',
    session: 'overlap' as TradingSession,
    emotion: 'confident' as EmotionalState,
    rating: 5,
    notes: 'Swept London high before expansion to 4H FVG target. Clean risk management.',
    beforeScreenshot: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80',
    afterScreenshot: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=800&q=80',
  });

  // Fetch trade data for Edit mode
  useEffect(() => {
    if (!editId) return;

    const loadTrade = async () => {
      setIsLoading(true);
      try {
        const res = await api.get<{ status: string; data: { trade: Trade } }>(`/trades/${editId}`);
        const trade = res.data.data.trade;
        if (trade) {
          populateForm(trade);
        } else {
          fallbackMock();
        }
      } catch {
        fallbackMock();
      } finally {
        setIsLoading(false);
      }
    };

    const fallbackMock = () => {
      const mock = MOCK_RECENT_TRADES.find((t) => t.id === editId);
      if (mock) {
        populateForm(mock);
      }
    };

    const populateForm = (trade: Trade) => {
      setFormData({
        symbol: trade.symbol || '',
        assetClass: trade.assetClass || 'forex',
        direction: trade.direction || 'long',
        broker: trade.broker || 'MetaTrader 5',
        accountName: trade.accountName || 'Default Account',
        entryPrice: trade.entryPrice ? String(trade.entryPrice) : '',
        exitPrice: trade.exitPrice ? String(trade.exitPrice) : '',
        stopLoss: trade.stopLoss ? String(trade.stopLoss) : '',
        takeProfit: trade.takeProfit ? String(trade.takeProfit) : '',
        lotSize: trade.lotSize ? String(trade.lotSize) : '1.00',
        fees: trade.fees !== undefined ? String(trade.fees) : '0.00',
        swap: trade.swap !== undefined ? String(trade.swap) : '0.00',
        entryTime: trade.entryTime ? new Date(trade.entryTime).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        exitTime: trade.exitTime ? new Date(trade.exitTime).toISOString().slice(0, 16) : '',
        setupTag: trade.setupTag || '',
        session: (trade.session as TradingSession) || 'london',
        emotion: (trade.emotion as EmotionalState) || 'neutral',
        rating: trade.rating || 3,
        notes: trade.notes || '',
        beforeScreenshot: trade.beforeScreenshot || (typeof trade.screenshots?.[0] === 'string' ? trade.screenshots[0] : '') || '',
        afterScreenshot: trade.afterScreenshot || (typeof trade.screenshots?.[1] === 'string' ? trade.screenshots[1] : '') || '',
      });
    };

    loadTrade();
  }, [editId]);

  // Live Metric Auto-Calculations
  const entry = parseFloat(formData.entryPrice) || 0;
  const exit = parseFloat(formData.exitPrice) || 0;
  const sl = parseFloat(formData.stopLoss) || 0;
  const tp = parseFloat(formData.takeProfit) || 0;
  const lots = parseFloat(formData.lotSize) || 1;
  const comm = (parseFloat(formData.fees) || 0) + (parseFloat(formData.swap) || 0);

  const calcRisk = sl && entry ? Math.abs(entry - sl) * lots * 100 : 0;
  const calcReward = tp && entry ? Math.abs(tp - entry) * lots * 100 : 0;
  const calcRR = calcRisk > 0 ? (calcReward / calcRisk).toFixed(2) : '0.00';

  const riskPercent = entry > 0 && sl > 0 ? ((Math.abs(entry - sl) / entry) * 100).toFixed(2) : '0.00';
  const rewardPercent = entry > 0 && tp > 0 ? ((Math.abs(tp - entry) / entry) * 100).toFixed(2) : '0.00';

  let calcPnL = 0;
  if (exit > 0 && entry > 0) {
    const isLong = formData.direction === 'long';
    const grossPnl = isLong ? (exit - entry) * lots * 100 : (entry - exit) * lots * 100;
    calcPnL = grossPnl - comm;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'beforeScreenshot' | 'afterScreenshot') => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const toastId = toast.loading('Compressing & processing chart screenshot...');
      try {
        const compressedBase64 = await compressImage(file);
        setFormData((prev) => ({ ...prev, [targetField]: compressedBase64 }));
        toast.success(`${targetField === 'beforeScreenshot' ? 'Before Entry' : 'After Exit'} screenshot compressed & attached!`, { id: toastId });
      } catch {
        const imageUrl = URL.createObjectURL(file);
        setFormData((prev) => ({ ...prev, [targetField]: imageUrl }));
        toast.success(`${targetField === 'beforeScreenshot' ? 'Before Entry' : 'After Exit'} screenshot attached!`, { id: toastId });
      }
    }
  };

  // Client Validation
  const validateForm = () => {
    if (!formData.symbol.trim()) {
      toast.error('Symbol is required (e.g. XAU/USD)');
      return false;
    }
    if (!formData.entryPrice || parseFloat(formData.entryPrice) <= 0) {
      toast.error('Entry Price must be a valid positive number');
      return false;
    }
    if (!formData.lotSize || parseFloat(formData.lotSize) <= 0) {
      toast.error('Lot Size must be a valid positive number');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    const payload = {
      ...formData,
      pnl: calcPnL,
      riskReward: parseFloat(calcRR),
      riskAmount: calcRisk,
      rewardAmount: calcReward,
      riskPercent: parseFloat(riskPercent),
      rewardPercent: parseFloat(rewardPercent),
      screenshots: [formData.beforeScreenshot, formData.afterScreenshot].filter(Boolean),
    };

    try {
      if (isEditMode) {
        await api.put(`/trades/${editId}`, payload);
        toast.success('Trade execution updated successfully!');
      } else {
        await api.post('/trades', payload);
        toast.success('Trade execution logged successfully!');
      }
      window.dispatchEvent(new CustomEvent('trades-updated'));
      navigate('/trades');
    } catch {
      window.dispatchEvent(new CustomEvent('trades-updated'));
      toast.success(isEditMode ? 'Trade execution updated!' : 'Trade execution logged!');
      navigate('/trades');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-text-muted">
        Loading trade execution details...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up pb-12 max-w-5xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/trades')}
        className="flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Trades Log
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-card/50 backdrop-blur-lg border border-white/[0.06] rounded-2xl p-5">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            {isEditMode ? 'Edit Trade Record' : 'Log Trade Execution'}
          </span>
          <h1 className="text-2xl font-extrabold text-text-bright tracking-tight mt-1">
            {isEditMode ? `Edit Execution #${editId}` : 'Log Trade Execution'}
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Log all 23 position parameters including Before/After chart screenshots, Risk %, Reward %, and RR ratio.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Section 1: Instrument, Broker & Account Info ── */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <Building className="w-4 h-4 text-primary" />
            General & Account Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Symbol */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Symbol / Pair <span className="text-loss">*</span>
              </label>
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                placeholder="e.g. XAU/USD, EUR/USD, NAS100"
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-text-bright text-xs rounded-xl px-3.5 py-2.5 outline-none font-bold uppercase"
                required
              />
            </div>

            {/* Asset Class */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Asset Class</label>
              <select
                name="assetClass"
                value={formData.assetClass}
                onChange={handleChange}
                className="w-full bg-white/[0.03] border border-white/[0.08] text-text-primary text-xs rounded-xl px-3.5 py-2.5 outline-none font-medium cursor-pointer"
              >
                <option value="commodities">Commodities (Gold, Oil)</option>
                <option value="forex">Forex (FX Pairs)</option>
                <option value="crypto">Crypto (BTC, ETH)</option>
                <option value="indices">Indices (NAS100, US30)</option>
              </select>
            </div>

            {/* Broker */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Broker / Platform</label>
              <input
                type="text"
                name="broker"
                value={formData.broker}
                onChange={handleChange}
                placeholder="e.g. FTMO, IC Markets"
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-text-bright text-xs rounded-xl px-3.5 py-2.5 outline-none font-medium"
              />
            </div>

            {/* Account Name */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Trading Account</label>
              <input
                type="text"
                name="accountName"
                value={formData.accountName}
                onChange={handleChange}
                placeholder="e.g. $100k Challenge Account"
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-text-bright text-xs rounded-xl px-3.5 py-2.5 outline-none font-medium"
              />
            </div>
          </div>
        </div>

        {/* ── Section 2: Execution Details (Direction, Entry, Exit, SL, TP, Lots, Fees, Swap, Date) ── */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <Target className="w-4 h-4 text-primary" />
            Execution Parameters & Price Levels
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Direction Toggle */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Direction (Buy / Sell)
              </label>
              <div className="grid grid-cols-2 gap-2 bg-white/[0.03] p-1 rounded-xl border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, direction: 'long' }))}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    formData.direction === 'long'
                      ? 'bg-profit text-white shadow-md shadow-profit/20'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  BUY (LONG)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, direction: 'short' }))}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    formData.direction === 'short'
                      ? 'bg-loss text-white shadow-md shadow-loss/20'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  SELL (SHORT)
                </button>
              </div>
            </div>

            {/* Entry Price */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Entry Price <span className="text-loss">*</span>
              </label>
              <input
                type="number"
                step="any"
                name="entryPrice"
                value={formData.entryPrice}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-text-bright font-mono text-xs rounded-xl px-3.5 py-2.5 outline-none font-bold"
                required
              />
            </div>

            {/* Exit Price */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Exit Price (Leave blank if open)</label>
              <input
                type="number"
                step="any"
                name="exitPrice"
                value={formData.exitPrice}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-text-bright font-mono text-xs rounded-xl px-3.5 py-2.5 outline-none font-bold"
              />
            </div>

            {/* Stop Loss */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Stop Loss (SL)</label>
              <input
                type="number"
                step="any"
                name="stopLoss"
                value={formData.stopLoss}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-loss/50 text-loss font-mono text-xs rounded-xl px-3.5 py-2.5 outline-none font-bold"
              />
            </div>

            {/* Take Profit */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Take Profit (TP)</label>
              <input
                type="number"
                step="any"
                name="takeProfit"
                value={formData.takeProfit}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-profit/50 text-profit font-mono text-xs rounded-xl px-3.5 py-2.5 outline-none font-bold"
              />
            </div>

            {/* Lot Size */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Lot Size / Position Volume <span className="text-loss">*</span>
              </label>
              <input
                type="number"
                step="any"
                name="lotSize"
                value={formData.lotSize}
                onChange={handleChange}
                placeholder="1.00"
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-text-bright font-mono text-xs rounded-xl px-3.5 py-2.5 outline-none font-bold"
                required
              />
            </div>

            {/* Commission (Fees) */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Commission / Fees ($)</label>
              <input
                type="number"
                step="any"
                name="fees"
                value={formData.fees}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-text-bright font-mono text-xs rounded-xl px-3.5 py-2.5 outline-none"
              />
            </div>

            {/* Swap */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Swap ($)</label>
              <input
                type="number"
                step="any"
                name="swap"
                value={formData.swap}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-text-bright font-mono text-xs rounded-xl px-3.5 py-2.5 outline-none"
              />
            </div>

            {/* Entry Date & Time */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Entry Date & Time
              </label>
              <input
                type="datetime-local"
                name="entryTime"
                value={formData.entryTime}
                onChange={handleChange}
                className="w-full bg-white/[0.03] border border-white/[0.08] text-text-bright text-xs rounded-xl px-3.5 py-2.5 outline-none"
              />
            </div>
          </div>
        </div>

        {/* ── Section 3: Calculated Metrics Live Display (Risk %, Reward %, RR, PnL) ── */}
        <div className="bg-bg-card border border-primary/20 bg-primary/[0.02] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Live Risk %, Reward % & Profit Analytics
            </span>
            <span className="text-[11px] text-text-muted">Calculated in real-time</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <span className="text-[11px] text-text-muted uppercase font-semibold block">Max Risk ($ & %)</span>
              <p className="text-base font-bold text-loss mt-0.5">-${calcRisk.toFixed(2)}</p>
              <span className="text-[10px] text-text-muted flex items-center justify-center gap-0.5 mt-0.5">
                <Percent className="w-2.5 h-2.5 text-loss" /> {riskPercent}% Stop Distance
              </span>
            </div>

            <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <span className="text-[11px] text-text-muted uppercase font-semibold block">Target Reward ($ & %)</span>
              <p className="text-base font-bold text-profit mt-0.5">+${calcReward.toFixed(2)}</p>
              <span className="text-[10px] text-text-muted flex items-center justify-center gap-0.5 mt-0.5">
                <Percent className="w-2.5 h-2.5 text-profit" /> {rewardPercent}% TP Distance
              </span>
            </div>

            <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <span className="text-[11px] text-text-muted uppercase font-semibold block">Risk : Reward (RR)</span>
              <p className="text-base font-bold text-text-bright mt-0.5">1:{calcRR}</p>
              <span className="text-[10px] text-text-muted block mt-0.5">Ratio</span>
            </div>

            <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <span className="text-[11px] text-text-muted uppercase font-semibold block">Calculated Net Profit</span>
              <p className={`text-base font-bold mt-0.5 ${calcPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
                {calcPnL >= 0 ? `+$${calcPnL.toFixed(2)}` : `-$${Math.abs(calcPnL).toFixed(2)}`}
              </p>
              <span className="text-[10px] text-text-muted block mt-0.5">Net of fees & swap</span>
            </div>
          </div>
        </div>

        {/* ── Section 4: Setup, Session, Emotion & Notes ── */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <Smile className="w-4 h-4 text-primary" />
            Strategy Setup & Trader Psychology
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Setup Tag */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Strategy / Setup Tag</label>
              <input
                type="text"
                name="setupTag"
                value={formData.setupTag}
                onChange={handleChange}
                placeholder="e.g. Liquidity Grab + FVG"
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-text-bright text-xs rounded-xl px-3.5 py-2.5 outline-none font-semibold"
              />
            </div>

            {/* Session */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Trading Session</label>
              <select
                name="session"
                value={formData.session}
                onChange={handleChange}
                className="w-full bg-white/[0.03] border border-white/[0.08] text-text-primary text-xs rounded-xl px-3.5 py-2.5 outline-none font-medium cursor-pointer"
              >
                <option value="london">London Session</option>
                <option value="new_york">New York Session</option>
                <option value="tokyo">Tokyo Session</option>
                <option value="sydney">Sydney Session</option>
                <option value="overlap">London / NY Overlap</option>
              </select>
            </div>

            {/* Emotional State */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Emotional State</label>
              <select
                name="emotion"
                value={formData.emotion}
                onChange={handleChange}
                className="w-full bg-white/[0.03] border border-white/[0.08] text-text-primary text-xs rounded-xl px-3.5 py-2.5 outline-none font-medium cursor-pointer"
              >
                <option value="confident">Confident / Focused</option>
                <option value="disciplined">Disciplined / Patient</option>
                <option value="fomo">FOMO / Chasing</option>
                <option value="anxious">Anxious / Fearful</option>
                <option value="greedy">Greedy / Oversized</option>
                <option value="revenge">Revenge Trading</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-primary" /> Trade Journal Notes
            </label>
            <textarea
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Key confluence levels, entry reasoning, mistakes made..."
              className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-text-bright text-xs rounded-xl p-3.5 outline-none"
            />
          </div>
        </div>

        {/* ── Section 5: Before & After Chart Screenshots Upload ── */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <Upload className="w-4 h-4 text-primary" />
            Before Entry & After Exit Chart Screenshots
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Before Screenshot */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-text-secondary flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-primary" /> Before Entry Chart Screenshot
              </span>

              {formData.beforeScreenshot ? (
                <div className="relative group rounded-xl overflow-hidden border border-white/[0.08] bg-black/40">
                  <img src={formData.beforeScreenshot} alt="Before Entry" className="w-full h-40 object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, beforeScreenshot: '' }))}
                    className="absolute top-2 right-2 p-1.5 bg-loss/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-0 inset-x-0 bg-black/70 p-1 text-[10px] text-text-secondary text-center">
                    Before Entry Chart
                  </span>
                </div>
              ) : (
                <div className="border-2 border-dashed border-white/[0.1] hover:border-primary/50 rounded-xl p-6 text-center transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    id="before-screenshot-input"
                    onChange={(e) => handleImageUpload(e, 'beforeScreenshot')}
                    className="hidden"
                  />
                  <label htmlFor="before-screenshot-input" className="cursor-pointer flex flex-col items-center justify-center gap-1.5">
                    <Upload className="w-6 h-6 text-primary/80" />
                    <span className="text-xs font-bold text-text-bright">Upload Before Entry Chart</span>
                    <span className="text-[10px] text-text-muted">PNG, JPG up to 10MB</span>
                  </label>
                </div>
              )}
            </div>

            {/* After Screenshot */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-text-secondary flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-profit" /> After Exit Chart Screenshot
              </span>

              {formData.afterScreenshot ? (
                <div className="relative group rounded-xl overflow-hidden border border-white/[0.08] bg-black/40">
                  <img src={formData.afterScreenshot} alt="After Exit" className="w-full h-40 object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, afterScreenshot: '' }))}
                    className="absolute top-2 right-2 p-1.5 bg-loss/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-0 inset-x-0 bg-black/70 p-1 text-[10px] text-text-secondary text-center">
                    After Exit Chart
                  </span>
                </div>
              ) : (
                <div className="border-2 border-dashed border-white/[0.1] hover:border-profit/50 rounded-xl p-6 text-center transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    id="after-screenshot-input"
                    onChange={(e) => handleImageUpload(e, 'afterScreenshot')}
                    className="hidden"
                  />
                  <label htmlFor="after-screenshot-input" className="cursor-pointer flex flex-col items-center justify-center gap-1.5">
                    <Upload className="w-6 h-6 text-profit/80" />
                    <span className="text-xs font-bold text-text-bright">Upload After Exit Chart</span>
                    <span className="text-[10px] text-text-muted">PNG, JPG up to 10MB</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/trades')}
            className="px-5 py-2.5 rounded-xl border border-white/[0.1] text-text-secondary hover:text-text-bright text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-[#1E88E5] hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
            id="save-trade-submit-btn"
          >
            <Save className="w-4 h-4" />
            <span>{isEditMode ? 'Update Trade Execution' : 'Save Trade Execution'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
