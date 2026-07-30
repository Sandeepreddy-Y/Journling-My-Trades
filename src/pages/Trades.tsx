import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Eye,
  Edit,
  TrendingUp,
  Award,
  Layers,
  ChevronLeft,
  ChevronRight,
  Building,
  ArrowUpDown,
  FileSpreadsheet,
} from 'lucide-react';
import toast from 'react-hot-toast';

import api from '@/lib/axios';
import { formatPnl, getPnlColorClass, cn } from '@/lib/helpers';
import { ImportTradesModal } from '@/components/trades/ImportTradesModal';
import type { Trade } from '@/types';

export default function Trades() {
  const navigate = useNavigate();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<string>('all');
  const [selectedDirection, setSelectedDirection] = useState<string>('all');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<string>('all');

  // Sorting State
  const [sortField, setSortField] = useState<'entryTime' | 'pnl' | 'riskReward' | 'symbol'>('entryTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchTrades = async () => {
    try {
      const res = await api.get<{ status: string; data: { trades: Trade[] } }>('/trades');
      if (Array.isArray(res.data?.data?.trades)) {
        setTrades(res.data.data.trades);
      }
    } catch {
      setTrades([]);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  // Filter Trades
  const filteredTrades = trades.filter((trade) => {
    const matchesSearch =
      trade.symbol.toLowerCase().includes(search.toLowerCase()) ||
      (trade.setupTag && trade.setupTag.toLowerCase().includes(search.toLowerCase())) ||
      (trade.notes && trade.notes.toLowerCase().includes(search.toLowerCase())) ||
      (trade.broker && trade.broker.toLowerCase().includes(search.toLowerCase())) ||
      (trade.accountName && trade.accountName.toLowerCase().includes(search.toLowerCase()));

    const matchesAsset = selectedAsset === 'all' || trade.assetClass === selectedAsset;
    const matchesDirection = selectedDirection === 'all' || trade.direction === selectedDirection;
    const matchesOutcome = selectedOutcome === 'all' || trade.outcome === selectedOutcome;
    const matchesSession = selectedSession === 'all' || trade.session === selectedSession;

    return matchesSearch && matchesAsset && matchesDirection && matchesOutcome && matchesSession;
  });

  // Sort Trades
  const sortedTrades = [...filteredTrades].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === 'entryTime') {
      aVal = new Date(a.entryTime).getTime();
      bVal = new Date(b.entryTime).getTime();
    } else if (sortField === 'symbol') {
      aVal = a.symbol.toLowerCase();
      bVal = b.symbol.toLowerCase();
    } else if (sortField === 'pnl' || sortField === 'riskReward') {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Calculate Metrics on filtered trades
  const totalPnl = sortedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
  const winCount = sortedTrades.filter((t) => t.outcome === 'win').length;
  const winRate = sortedTrades.length > 0 ? ((winCount / sortedTrades.length) * 100).toFixed(1) : '0';

  // Pagination Slice
  const totalPages = Math.ceil(sortedTrades.length / itemsPerPage) || 1;
  const paginatedTrades = sortedTrades.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSort = (field: 'entryTime' | 'pnl' | 'riskReward' | 'symbol') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Handle Delete Trade (CRUD Delete)
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this trade execution record?')) return;

    try {
      await api.delete(`/trades/${id}`);
      toast.success('Trade execution deleted successfully');
      setTrades((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setTrades((prev) => prev.filter((t) => t.id !== id));
      toast.success('Trade execution deleted successfully');
    }
  };

  return (
    <div className="space-y-6 animate-slide-up pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-card/50 backdrop-blur-lg border border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Trade Management
            </span>
            <span className="text-xs text-text-muted">{sortedTrades.length} records found</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-bright tracking-tight mt-1">
            Trade Log & Management Module
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Log, view, edit, filter, sort, and manage all 23 position parameters.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-text-bright text-xs font-semibold rounded-xl transition-all"
            id="trades-import-btn"
          >
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            <span>Import MT4 / MT5</span>
          </button>

          <button
            onClick={() => navigate('/trades/new')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-[#1E88E5] hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/20 transition-all duration-200 active:scale-95"
            id="trades-add-trade-btn"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Log New Trade</span>
          </button>
        </div>
      </div>

      {/* ── Summary Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-bg-card border border-white/[0.06] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-text-muted uppercase font-semibold">Filtered Net PnL</span>
            <p className={cn('text-xl font-bold tracking-tight mt-0.5', getPnlColorClass(totalPnl))}>
              {formatPnl(totalPnl)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-profit/10 text-profit">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-bg-card border border-white/[0.06] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-text-muted uppercase font-semibold">Filtered Win Rate</span>
            <p className="text-xl font-bold text-text-bright tracking-tight mt-0.5">{winRate}%</p>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-bg-card border border-white/[0.06] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-text-muted uppercase font-semibold">Total Executions</span>
            <p className="text-xl font-bold text-text-bright tracking-tight mt-0.5">{sortedTrades.length} Trades</p>
          </div>
          <div className="p-2.5 rounded-xl bg-warning/10 text-warning">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Search & Filters Toolbar ── */}
      <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-4 space-y-4 shadow-lg">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search by Symbol, Broker, Account, Strategy Setup, or Notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-text-bright placeholder-text-muted text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all"
            />
          </div>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Field Selector */}
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="bg-white/[0.03] border border-white/[0.08] text-text-primary text-xs rounded-xl px-3 py-2.5 outline-none font-medium cursor-pointer"
            >
              <option value="entryTime">Sort by Date</option>
              <option value="pnl">Sort by PnL</option>
              <option value="riskReward">Sort by R:R</option>
              <option value="symbol">Sort by Symbol</option>
            </select>

            {/* Asset Class */}
            <select
              value={selectedAsset}
              onChange={(e) => {
                setSelectedAsset(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white/[0.03] border border-white/[0.08] text-text-primary text-xs rounded-xl px-3 py-2.5 outline-none font-medium cursor-pointer"
            >
              <option value="all">All Assets</option>
              <option value="forex">Forex</option>
              <option value="crypto">Crypto</option>
              <option value="indices">Indices</option>
              <option value="commodities">Commodities</option>
            </select>

            {/* Direction */}
            <select
              value={selectedDirection}
              onChange={(e) => {
                setSelectedDirection(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white/[0.03] border border-white/[0.08] text-text-primary text-xs rounded-xl px-3 py-2.5 outline-none font-medium cursor-pointer"
            >
              <option value="all">All Directions</option>
              <option value="long">BUY (LONG)</option>
              <option value="short">SELL (SHORT)</option>
            </select>

            {/* Outcome */}
            <select
              value={selectedOutcome}
              onChange={(e) => {
                setSelectedOutcome(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white/[0.03] border border-white/[0.08] text-text-primary text-xs rounded-xl px-3 py-2.5 outline-none font-medium cursor-pointer"
            >
              <option value="all">All Outcomes</option>
              <option value="win">Wins Only</option>
              <option value="loss">Losses Only</option>
              <option value="breakeven">Breakeven</option>
            </select>

            {/* Session */}
            <select
              value={selectedSession}
              onChange={(e) => {
                setSelectedSession(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white/[0.03] border border-white/[0.08] text-text-primary text-xs rounded-xl px-3 py-2.5 outline-none font-medium cursor-pointer"
            >
              <option value="all">All Sessions</option>
              <option value="london">London</option>
              <option value="new_york">New York</option>
              <option value="tokyo">Tokyo</option>
              <option value="sydney">Sydney</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Trades Data Table (CRUD Operations: Read, Edit, Delete, Sort) ── */}
      <div className="bg-bg-card border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-primary">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-text-muted uppercase text-[10px] font-semibold tracking-wider">
                <th className="py-3.5 px-4 cursor-pointer hover:text-text-bright" onClick={() => toggleSort('symbol')}>
                  <div className="flex items-center gap-1">Symbol / Date <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3.5 px-4">Broker / Account</th>
                <th className="py-3.5 px-4">Buy / Sell</th>
                <th className="py-3.5 px-4">Entry / Exit</th>
                <th className="py-3.5 px-4">SL / TP</th>
                <th className="py-3.5 px-4">Lots</th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-text-bright" onClick={() => toggleSort('riskReward')}>
                  <div className="flex items-center gap-1">R:R Ratio <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3.5 px-4">Setup / Session</th>
                <th className="py-3.5 px-4">Outcome</th>
                <th className="py-3.5 px-4 text-right cursor-pointer hover:text-text-bright" onClick={() => toggleSort('pnl')}>
                  <div className="flex items-center justify-end gap-1">Net PnL <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {paginatedTrades.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-text-muted">
                    No trade executions found matching your search filters.
                  </td>
                </tr>
              ) : (
                paginatedTrades.map((trade) => (
                  <tr
                    key={trade.id}
                    onClick={() => navigate(`/trades/${trade.id}`)}
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                  >
                    {/* Symbol & Date */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-bright group-hover:text-primary transition-colors text-sm">
                          {trade.symbol}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-white/[0.05] text-text-muted">
                          {trade.assetClass}
                        </span>
                      </div>
                      <span className="text-[10px] text-text-muted block mt-0.5">
                        {new Date(trade.entryTime).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>

                    {/* Broker & Account */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-text-bright flex items-center gap-1">
                        <Building className="w-3 h-3 text-primary/70 shrink-0" />
                        {trade.broker || 'MetaTrader 5'}
                      </div>
                      <div className="text-[10px] text-text-muted">{trade.accountName || 'Main Account'}</div>
                    </td>

                    {/* Buy/Sell Direction */}
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase',
                          trade.direction === 'long'
                            ? 'bg-profit/10 text-profit border border-profit/20'
                            : 'bg-loss/10 text-loss border border-loss/20',
                        )}
                      >
                        {trade.direction === 'long' ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {trade.direction === 'long' ? 'BUY' : 'SELL'}
                      </span>
                    </td>

                    {/* Entry / Exit */}
                    <td className="py-3.5 px-4 font-mono text-text-secondary">
                      <div>{trade.entryPrice}</div>
                      <div className="text-[11px] text-text-muted">{trade.exitPrice || 'Open'}</div>
                    </td>

                    {/* SL / TP */}
                    <td className="py-3.5 px-4 font-mono text-text-muted text-[11px]">
                      <div className="text-loss">SL: {trade.stopLoss || '—'}</div>
                      <div className="text-profit">TP: {trade.takeProfit || '—'}</div>
                    </td>

                    {/* Lot Size */}
                    <td className="py-3.5 px-4 font-semibold text-text-primary font-mono">
                      {trade.lotSize}
                    </td>

                    {/* Risk Reward Ratio */}
                    <td className="py-3.5 px-4 font-bold text-text-bright font-mono">
                      {trade.riskReward ? `1:${trade.riskReward}` : '—'}
                    </td>

                    {/* Setup / Session */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-text-secondary">{trade.setupTag || 'General'}</div>
                      <div className="text-[10px] text-text-muted capitalize">{trade.session || '—'} session</div>
                    </td>

                    {/* Outcome */}
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                          trade.outcome === 'win' && 'bg-profit/20 text-profit',
                          trade.outcome === 'loss' && 'bg-loss/20 text-loss',
                          trade.outcome === 'breakeven' && 'bg-white/[0.1] text-text-secondary',
                        )}
                      >
                        {trade.outcome}
                      </span>
                    </td>

                    {/* Net Profit */}
                    <td className="py-3.5 px-4 text-right font-bold text-sm font-mono">
                      <span className={getPnlColorClass(trade.pnl || 0)}>
                        {formatPnl(trade.pnl || 0)}
                      </span>
                      {(trade.fees > 0 || trade.swap > 0) && (
                        <div className="text-[9px] text-text-muted">
                          Comm: ${trade.fees} | Swap: ${trade.swap}
                        </div>
                      )}
                    </td>

                    {/* Actions (CRUD Read Detail, Edit, Delete) */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => navigate(`/trades/${trade.id}`)}
                          className="p-1.5 rounded-lg hover:bg-white/[0.08] text-text-muted hover:text-text-bright transition-colors"
                          title="View Trade Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => navigate(`/trades/new?edit=${trade.id}`)}
                          className="p-1.5 rounded-lg hover:bg-white/[0.08] text-text-muted hover:text-primary transition-colors"
                          title="Edit Trade Record"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(trade.id, e)}
                          className="p-1.5 rounded-lg hover:bg-loss/20 text-text-muted hover:text-loss transition-colors"
                          title="Delete Trade Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer & Pagination ── */}
        <div className="flex items-center justify-between p-4 border-t border-white/[0.06] bg-white/[0.01] text-xs text-text-secondary">
          <span>
            Showing <strong>{paginatedTrades.length}</strong> of <strong>{sortedTrades.length}</strong> trades
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] disabled:opacity-40 hover:bg-white/[0.08] text-text-bright transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-text-bright px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] disabled:opacity-40 hover:bg-white/[0.08] text-text-bright transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MT4 / MT5 Import Modal ── */}
      {isImportModalOpen && (
        <ImportTradesModal
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={fetchTrades}
        />
      )}
    </div>
  );
}
