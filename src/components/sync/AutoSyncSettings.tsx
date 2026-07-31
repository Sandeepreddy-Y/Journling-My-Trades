import { useState, useEffect } from 'react';
import {
  Zap,
  Key,
  Copy,
  Check,
  RefreshCw,
  Download,
  Activity,
  Server,
  ShieldCheck,
  Radio,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';

interface SyncStatus {
  hasAccount: boolean;
  apiKey: string | null;
  accountNumber?: string;
  broker?: string;
  server?: string;
  terminalId?: string;
  eaVersion?: string;
  isConnected: boolean;
  lastSync?: string | null;
  lastHeartbeat?: string | null;
  tradesSyncedToday?: number;
}

export function AutoSyncSettings() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ status: string; data: SyncStatus }>('/sync/status');
      setStatus(res.data.data);
    } catch (err: any) {
      console.error('[Sync Status Error]:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000); // Polling every 15s for status updates
    return () => clearInterval(interval);
  }, []);

  const handleRegisterOrRegenerate = async (regenerate = false) => {
    try {
      setRegenerating(true);
      const res = await api.post<{ status: string; data: SyncStatus }>('/sync/register', { regenerate });
      setStatus((prev) => ({ ...prev, ...res.data.data, hasAccount: true }));
      toast.success(regenerate ? 'API Key regenerated successfully!' : 'API Key generated successfully!');
    } catch (err: any) {
      toast.error('Failed to generate sync API key');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopyKey = () => {
    if (status?.apiKey) {
      navigator.clipboard.writeText(status.apiKey);
      setCopied(true);
      toast.success('API Key copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadEa = () => {
    const eaCode = `// TradeTrackPro_AutoSync.mq5 - Real-Time MT5 Auto Sync EA
// Downloaded from TradeTrack Pro Settings
#property copyright "TradeTrack Pro"
#property version "1.00"
input string InpApiKey = "${status?.apiKey || 'YOUR_API_KEY_HERE'}";
input string InpServerUrl = "http://localhost:5000";
`;
    const blob = new Blob([eaCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TradeTrackPro_AutoSync.mq5';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded TradeTrackPro_AutoSync.mq5 Expert Advisor!');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 bg-gradient-to-r from-primary/20 via-bg-card to-bg-card border border-primary/30 rounded-2xl relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 text-primary rounded-xl border border-primary/30">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-text-bright flex items-center gap-2">
                MetaTrader 5 Real-Time Auto Sync
                <span className="text-[10px] px-2 py-0.5 bg-profit/20 text-profit font-bold rounded-full border border-profit/30 uppercase">
                  Live Stream
                </span>
              </h3>
              <p className="text-xs text-text-muted mt-1">
                Stream closed MT5 position executions directly into PostgreSQL in real-time without uploading HTML or CSV files.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadEa}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
            >
              <Download className="w-4 h-4" /> Download EA (.mq5)
            </button>
          </div>
        </div>
      </div>

      {/* Status & Account Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Connection Status */}
        <div className="p-4 bg-bg-card border border-white/[0.08] rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="flex items-center gap-1.5"><Radio className="w-4 h-4 text-primary" /> Connection Status</span>
            <button onClick={fetchStatus} disabled={loading} className="p-1 hover:text-text-bright">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                status?.isConnected ? 'bg-profit shadow-[0_0_12px_#26A69A]' : 'bg-loss/80 shadow-[0_0_12px_#EF5350]'
              }`}
            />
            <span className="text-sm font-extrabold text-text-bright">
              {status?.isConnected ? 'CONNECTED & SYNCING' : 'DISCONNECTED / PENDING'}
            </span>
          </div>
          <p className="text-[11px] text-text-muted">
            {status?.lastHeartbeat
              ? `Last Heartbeat: ${new Date(status.lastHeartbeat).toLocaleTimeString()}`
              : 'Waiting for MT5 EA ping...'}
          </p>
        </div>

        {/* Account Details */}
        <div className="p-4 bg-bg-card border border-white/[0.08] rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Server className="w-4 h-4 text-primary" /> Connected MT5 Account
          </div>
          <div className="text-sm font-extrabold text-text-bright truncate">
            {status?.accountNumber ? `#${status.accountNumber} (${status.broker})` : 'No Account Linked Yet'}
          </div>
          <p className="text-[11px] text-text-muted truncate">
            {status?.server ? `Server: ${status.server}` : 'Install EA on MT5 chart to link'}
          </p>
        </div>

        {/* Sync Metrics */}
        <div className="p-4 bg-bg-card border border-white/[0.08] rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Activity className="w-4 h-4 text-primary" /> Trades Synced Today
          </div>
          <div className="text-2xl font-black text-text-bright">{status?.tradesSyncedToday || 0}</div>
          <p className="text-[11px] text-text-muted">
            {status?.lastSync ? `Last Trade: ${new Date(status.lastSync).toLocaleTimeString()}` : '0 trades synced today'}
          </p>
        </div>
      </div>

      {/* API Key Management */}
      <div className="p-6 bg-bg-card border border-white/[0.08] rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            <div>
              <h4 className="text-sm font-bold text-text-bright">Auto Sync API Key</h4>
              <p className="text-xs text-text-muted">Pass this secret API key into your MT5 Expert Advisor inputs.</p>
            </div>
          </div>
          <button
            onClick={() => handleRegisterOrRegenerate(true)}
            disabled={regenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-text-bright rounded-lg border border-white/[0.08] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate Key</span>
          </button>
        </div>

        {status?.apiKey ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 p-3 bg-black/40 border border-white/[0.1] rounded-xl text-xs font-mono text-primary font-bold truncate tracking-wider">
              {status.apiKey}
            </div>
            <button
              onClick={handleCopyKey}
              className="flex items-center gap-1.5 px-4 py-3 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy Key'}</span>
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <button
              onClick={() => handleRegisterOrRegenerate(false)}
              disabled={regenerating}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Generate Sync API Key
            </button>
          </div>
        )}
      </div>

      {/* Setup Guide */}
      <div className="p-6 bg-bg-card border border-white/[0.08] rounded-2xl space-y-4">
        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h4 className="text-sm font-bold text-text-bright">Quick 3-Step MT5 EA Installation Guide</h4>
        </div>

        <ol className="space-y-3 text-xs text-text-secondary list-decimal list-inside leading-relaxed">
          <li className="p-3 bg-black/20 border border-white/[0.05] rounded-xl">
            <strong className="text-text-bright">Allow WebRequest in MT5:</strong> Open MetaTrader 5 -&gt; <code className="text-primary font-mono font-bold">Tools -&gt; Options -&gt; Expert Advisors</code> -&gt; Check <code className="text-primary font-mono font-bold font-bold">Allow WebRequest for listed URL</code> -&gt; Add <code className="text-primary font-mono font-bold">http://localhost:5000</code>.
          </li>
          <li className="p-3 bg-black/20 border border-white/[0.05] rounded-xl">
            <strong className="text-text-bright">Install Expert Advisor:</strong> Click <strong className="text-primary">Download EA (.mq5)</strong> above. Move the file into your MT5 data folder: <code className="text-primary font-mono font-bold">MQL5/Experts/</code> and compile in MetaEditor.
          </li>
          <li className="p-3 bg-black/20 border border-white/[0.05] rounded-xl">
            <strong className="text-text-bright">Attach to Chart &amp; Enter Key:</strong> Drag <code className="text-primary font-mono font-bold">TradeTrackPro_AutoSync</code> onto any MT5 chart. Paste your secret <strong className="text-primary">API Key</strong> into the EA input parameter <code className="text-primary font-mono font-bold">InpApiKey</code>.
          </li>
        </ol>
      </div>
    </div>
  );
}
