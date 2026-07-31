import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Download,
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Eye,
  FileSpreadsheet,
  Building,
  CheckSquare,
  Square,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

import api from '@/lib/axios';
import { formatPnl, getPnlColorClass, cn } from '@/lib/helpers';
import { ImportTradesModal } from '@/components/trades/ImportTradesModal';
import { exportTradesToCSV, exportTradesToPDF } from '@/lib/exportUtils';
import type { Trade } from '@/types';

export default function Trades() {
  const navigate = useNavigate();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

    const handleUpdate = () => fetchTrades();
    window.addEventListener('trades-updated', handleUpdate);
    return () => window.removeEventListener('trades-updated', handleUpdate);
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
    } else if (sortField === 'pnl' || sortField === 'riskReward') {
      aVal = parseFloat(aVal || 0);
      bVal = parseFloat(bVal || 0);
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginate Trades
  const totalPages = Math.ceil(sortedTrades.length / itemsPerPage) || 1;
  const paginatedTrades = sortedTrades.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSort = (field: 'entryTime' | 'pnl' | 'riskReward' | 'symbol') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedTrades.length && paginatedTrades.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedTrades.map((t) => t.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDeleteTrade = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/trades/${id}`);
      setTrades((prev) => prev.filter((t) => t.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      window.dispatchEvent(new CustomEvent('trades-updated'));
      toast.success('Trade deleted successfully');
    } catch {
      toast.error('Failed to delete trade');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      await Promise.all(selectedIds.map((id) => api.delete(`/trades/${id}`).catch(() => {})));
      setTrades((prev) => prev.filter((t) => !selectedIds.includes(t.id)));
      toast.success(`Successfully deleted ${selectedIds.length} trade records`);
      setSelectedIds([]);
      window.dispatchEvent(new CustomEvent('trades-updated'));
    } catch {
      toast.error('Failed to delete selected trades');
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedTradeObjects = trades.filter((t) => selectedIds.includes(t.id));

  return (
    <div className="space-y-6 animate-slide-up pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-card/50 backdrop-blur-lg border border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Execution Journal
            </span>
            <span className="text-xs text-text-muted">{trades.length} total positions</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-bright tracking-tight mt-1">
            Trade History & Log
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Filter, search, audit, and analyze your position executions and statement reports.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Import Statement Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-text-bright text-xs font-bold rounded-xl transition-all"
            id="trades-import-btn"
          >
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            <span>Import Statement</span>
          </button>

          {/* Log Trade Button */}
          <button
            onClick={() => navigate('/trades/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-[#1E88E5] text-white text-xs font-bold rounded-xl shadow-lg transition-all"
            id="trades-new-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Log Trade</span>
          </button>
        </div>
      </div>

      {/* ── Bulk Actions Floating Bar ── */}
      {selectedIds.length > 0 && (
        <div className="bg-primary/15 border border-primary/30 rounded-2xl p-4 flex items-center justify-between shadow-xl animate-fade-in text-xs">
          <span className="font-bold text-text-bright flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-primary" />
            {selectedIds.length} position(s) selected
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportTradesToCSV(selectedTradeObjects)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/[0.06] border border-white/[0.1] text-text-bright rounded-xl hover:bg-white/[0.1]"
            >
              <Download className="w-3.5 h-3.5 text-profit" /> Export CSV
            </button>
            <button
              onClick={() => exportTradesToPDF()}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/[0.06] border border-white/[0.1] text-text-bright rounded-xl hover:bg-white/[0.1]"
            >
              <FileText className="w-3.5 h-3.5 text-primary" /> Export PDF
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="flex items-center gap-1 px-3 py-1.5 bg-loss/20 border border-loss/30 text-loss rounded-xl hover:bg-loss/30 font-bold"
            >
              <Trash2 className="w-3.5 h-3.5" /> {isDeleting ? 'Deleting...' : 'Bulk Delete'}
            </button>
          </div>
        </div>
      )}

      {/* ── Search & Filter Controls ── */}
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

            <select
              value={selectedDirection}
              onChange={(e) => {
                setSelectedDirection(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white/[0.03] border border-white/[0.08] text-text-primary text-xs rounded-xl px-3 py-2.5 outline-none font-medium cursor-pointer"
            >
              <option value="all">All Directions</option>
              <option value="long">Long (Buy)</option>
              <option value="short">Short (Sell)</option>
            </select>

            <select
              value={selectedOutcome}
              onChange={(e) => {
                setSelectedOutcome(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white/[0.03] border border-white/[0.08] text-text-primary text-xs rounded-xl px-3 py-2.5 outline-none font-medium cursor-pointer"
            >
              <option value="all">All Outcomes</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="breakeven">Breakeven</option>
            </select>

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

      {/* ── Trades Table ── */}
      <div className="bg-bg-card border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-primary">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-text-muted uppercase text-[10px] font-semibold tracking-wider">
                <th className="py-3.5 px-4 w-8 text-center">
                  <button type="button" onClick={toggleSelectAll}>
                    {selectedIds.length === paginatedTrades.length && paginatedTrades.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-text-muted" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-text-bright" onClick={() => toggleSort('symbol')}>
                  <div className="flex items-center gap-1">Symbol / Date <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3.5 px-4">Broker / Account</th>
                <th className="py-3.5 px-4">Direction</th>
                <th className="py-3.5 px-4">Entry / Exit</th>
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
                paginatedTrades.map((trade) => {
                  const isSelected = selectedIds.includes(trade.id);
                  return (
                    <tr
                      key={trade.id}
                      onClick={() => navigate(`/trades/${trade.id}`)}
                      className={`hover:bg-white/[0.02] transition-colors cursor-pointer group ${
                        isSelected ? 'bg-primary/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => toggleSelect(trade.id)}>
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 text-text-muted" />
                          )}
                        </button>
                      </td>

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

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-text-bright flex items-center gap-1">
                          <Building className="w-3 h-3 text-primary/70 shrink-0" />
                          {trade.broker || 'MetaTrader 5'}
                        </div>
                        <div className="text-[10px] text-text-muted">{trade.accountName || 'Main Account'}</div>
                      </td>

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
                          {trade.direction}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold">
                        <div className="text-text-bright">{trade.entryPrice}</div>
                        <div className="text-[10px] text-text-muted">{trade.exitPrice || 'Open'}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-text-bright font-semibold">
                        {trade.lotSize}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-primary font-bold">
                        1:{trade.riskReward || '0.00'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-text-bright block">{trade.setupTag || 'General Setup'}</span>
                        <span className="text-[10px] text-text-muted capitalize">{trade.session || 'London'}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        {trade.outcome ? (
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase',
                              trade.outcome === 'win' && 'bg-profit/20 text-profit',
                              trade.outcome === 'loss' && 'bg-loss/20 text-loss',
                              trade.outcome === 'breakeven' && 'bg-white/[0.08] text-text-muted',
                            )}
                          >
                            {trade.outcome}
                          </span>
                        ) : (
                          <span className="text-text-muted font-mono">Open</span>
                        )}
                      </td>

                      <td className={cn('py-3.5 px-4 text-right font-mono font-bold text-sm', getPnlColorClass(trade.pnl || 0))}>
                        {formatPnl(trade.pnl || 0)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => navigate(`/trades/${trade.id}`)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-text-bright hover:bg-white/[0.06] transition-colors"
                            title="View Trade Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteTrade(trade.id, e)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-loss hover:bg-loss/10 transition-colors"
                            title="Delete Trade"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06] text-xs">
            <span className="text-text-muted">
              Showing page <strong className="text-text-bright">{currentPage}</strong> of <strong className="text-text-bright">{totalPages}</strong> ({sortedTrades.length} positions)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-text-bright disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-text-bright disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MT4/MT5 Statement Import Modal */}
      {isImportModalOpen && (
        <ImportTradesModal
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            fetchTrades();
            setIsImportModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
