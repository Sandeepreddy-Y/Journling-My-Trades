import { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, X, Loader2, PlayCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';

interface ImportTradesModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportTradesModal({ onClose, onSuccess }: ImportTradesModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<{ imported: number; duplicates: number } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = async (targetFile: File) => {
    setIsUploading(true);
    setProgress(20);

    const formData = new FormData();
    formData.append('file', targetFile);

    try {
      setProgress(60);
      const res = await api.post<{
        status: string;
        message?: string;
        data: { importedCount: number; duplicateCount: number; totalPnl: number };
      }>('/trades/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setProgress(100);
      const count = res.data.data?.importedCount || 0;
      const duplicates = res.data.data?.duplicateCount || 0;

      setStats({
        imported: count,
        duplicates,
      });

      // Broadcast global event so Dashboard, Trades, Analytics, and Calendar update instantly
      window.dispatchEvent(new CustomEvent('trades-updated'));

      if (count === 0 && duplicates > 0) {
        toast.success(`Statement processed: All ${duplicates} trades were already imported (duplicates skipped).`);
      } else {
        toast.success(res.data.message || `Successfully imported ${count} trade executions!`);
      }
      onSuccess();
    } catch (err: any) {
      setProgress(0);
      const errMsg = err.response?.data?.message || err.message || 'Failed to import statement file.';
      console.error('[Import Error]:', errMsg);
      toast.error(errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please click "Select Statement File" to choose your MT4/MT5 statement file first!');
      return;
    }
    await uploadFile(file);
  };

  const handleSampleImport = async () => {
    const sampleCsvContent = `Ticket,Open Time,Type,Size,Symbol,Open Price,S/L,T/P,Close Time,Close Price,Commission,Swap,Profit
100101,2026-07-25 10:00:00,buy,1.50,XAUUSD,2380.00,2370.00,2400.00,2026-07-25 14:30:00,2395.00,-10.00,0.00,2250.00
100102,2026-07-26 09:00:00,sell,2.00,EURUSD,1.0890,1.0920,1.0820,2026-07-26 12:15:00,1.0840,-15.00,0.00,1000.00
100103,2026-07-27 15:00:00,buy,1.00,US30,39800.00,39650.00,40100.00,2026-07-27 16:30:00,39650.00,-5.00,0.00,-1500.00
100104,2026-07-28 08:00:00,buy,3.00,GBPUSD,1.2850,1.2800,1.2920,2026-07-28 11:30:00,1.2910,0.00,0.00,1800.00
100105,2026-07-29 14:00:00,sell,1.00,BTCUSD,65000.00,66000.00,63000.00,2026-07-29 18:00:00,64000.00,0.00,0.00,1000.00`;

    const blob = new Blob([sampleCsvContent], { type: 'text/csv' });
    const sampleFile = new File([blob], 'Sample_MetaTrader_Statement.csv', { type: 'text/csv' });
    setFile(sampleFile);
    await uploadFile(sampleFile);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-bg-card border border-white/[0.08] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-extrabold text-text-bright">Import MT4 / MT5 / cTrader Statement</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-bright rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-xs text-text-secondary leading-relaxed">
          Upload your MetaTrader 4, MetaTrader 5, cTrader, DXTrade, or Prop Firm account statement file (.csv or .html report) to import trade executions directly into your PostgreSQL database.
        </p>

        {/* Upload Zone */}
        <div className="border-2 border-dashed border-white/[0.1] hover:border-primary/50 rounded-xl p-6 text-center transition-colors">
          <input
            type="file"
            accept=".csv,.html,.htm,.txt"
            id="mt-file-input"
            onChange={handleFileChange}
            className="hidden"
          />
          <label htmlFor="mt-file-input" className="cursor-pointer flex flex-col items-center justify-center gap-2">
            <Upload className="w-8 h-8 text-primary" />
            <span className="text-xs font-bold text-text-bright">
              {file ? file.name : 'Select Statement File (.csv, .html)'}
            </span>
            <span className="text-[10px] text-text-muted">Supports MT4, MT5, cTrader, DXTrade, FTMO, Funding Pips exports</span>
          </label>
        </div>

        {/* Sample Statement Import Shortcut */}
        <div className="flex items-center justify-center">
          <button
            onClick={handleSampleImport}
            disabled={isUploading}
            type="button"
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-semibold hover:underline"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Or click here to test with a Sample MT4 Statement (5 Trades)</span>
          </button>
        </div>

        {/* Progress Bar */}
        {isUploading && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-text-muted">
              <span>Parsing executions & inserting into PostgreSQL...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-white/[0.08] h-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Stats Result */}
        {stats && (
          <div className="p-3.5 bg-profit/10 border border-profit/20 rounded-xl flex items-center justify-between text-xs text-profit font-bold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Successfully imported {stats.imported} trades
            </span>
            <span className="text-text-muted font-normal">({stats.duplicates} duplicates skipped)</span>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text-bright">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isUploading}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50"
          >
            {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isUploading ? 'Importing...' : 'Start Import'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
