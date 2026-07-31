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
    const apiKeyVal = status?.apiKey || 'YOUR_API_KEY_HERE';
    const eaCode = `//+------------------------------------------------------------------+
//|                                     TradeTrackPro_AutoSync.mq5    |
//|                        Copyright 2026, TradeTrack Pro Systems    |
//|                                    https://tradetrackpro.io      |
//+------------------------------------------------------------------+
#property copyright "TradeTrack Pro"
#property link      "https://tradetrackpro.io"
#property version   "1.00"
#property description "Real-Time Auto Sync Expert Advisor for MetaTrader 5."
#property description "Automatically streams closed trade executions to PostgreSQL journal."

// --- Input Parameters ---
input string InpApiKey       = "${apiKeyVal}"; // TradeTrack Pro API Key
input string InpServerUrl    = "http://localhost:5000"; // TradeTrack Pro API Server URL
input int    InpSyncInterval  = 60;                   // Sync Retry Interval (Seconds)
input int    InpHeartbeatSec  = 180;                  // Heartbeat Ping Interval (Seconds)

// --- Global Variables ---
datetime g_lastSyncTime   = 0;
datetime g_lastHeartbeat  = 0;
string   g_queueFilename  = "tradetrack_queue.txt";
ulong    g_syncedTickets[];

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("[TradeTrackPro EA] Initializing Real-Time Auto Sync EA v1.0.0...");

   if(InpApiKey == "" || InpApiKey == "YOUR_API_KEY_HERE")
   {
      Alert("[TradeTrackPro EA] ERROR: Please enter your valid API Key in EA inputs!");
      return(INIT_PARAMETERS_INCORRECT);
   }

   EventSetTimer(5);
   SendHeartbeat();
   ScanAndSyncClosedTrades();

   Print("[TradeTrackPro EA] EA initialized successfully. Monitoring MT5 account #", IntegerToString((long)AccountInfoInteger(ACCOUNT_LOGIN)));
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   ArrayFree(g_syncedTickets);
   Print("[TradeTrackPro EA] EA Deinitialized. Reason code: ", reason);
}

//+------------------------------------------------------------------+
//| Expert tick function (Required by MQL5 compiler for EAs)         |
//+------------------------------------------------------------------+
void OnTick()
{
   ScanAndSyncClosedTrades();
}

//+------------------------------------------------------------------+
//| Timer event function                                             |
//+------------------------------------------------------------------+
void OnTimer()
{
   datetime now = TimeCurrent();
   if(now - g_lastHeartbeat >= InpHeartbeatSec)
   {
      SendHeartbeat();
      g_lastHeartbeat = now;
   }

   ProcessOfflineQueue();
   ScanAndSyncClosedTrades();
}

//+------------------------------------------------------------------+
//| Trade Transaction event                                          |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      ScanAndSyncClosedTrades();
   }
}

//+------------------------------------------------------------------+
//| Helper functions                                                 |
//+------------------------------------------------------------------+
bool IsTicketAlreadySynced(ulong ticket)
{
   int total = ArraySize(g_syncedTickets);
   for(int i = 0; i < total; i++)
   {
      if(g_syncedTickets[i] == ticket) return true;
   }
   return false;
}

void MarkTicketAsSynced(ulong ticket)
{
   if(IsTicketAlreadySynced(ticket)) return;
   int size = ArraySize(g_syncedTickets);
   ArrayResize(g_syncedTickets, size + 1);
   g_syncedTickets[size] = ticket;
}

string TimeToISO(datetime timeVal)
{
   MqlDateTime dt;
   TimeToStruct(timeVal, dt);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02d.000Z",
                       dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec);
}

string EscapeJsonString(string str)
{
   StringReplace(str, "\\\\", "\\\\\\\\");
   StringReplace(str, "\\"", "\\\\\\"");
   StringReplace(str, "\\r", "");
   StringReplace(str, "\\n", " ");
   return str;
}

bool SendHttpPost(string url, string jsonBody, string &responseStr)
{
   string headers = StringFormat("Content-Type: application/json\\r\\nx-api-key: %s\\r\\n", InpApiKey);
   char data[];
   char resultData[];
   string resultHeaders;

   StringToCharArray(jsonBody, data, 0, WHOLE_ARRAY, CP_UTF8);
   int dataLen = ArraySize(data);
   if(dataLen > 0)
   {
      ArrayResize(data, dataLen - 1);
   }

   ResetLastError();
   int res = WebRequest("POST", url, headers, 10000, data, resultData, resultHeaders);

   if(res == 200 || res == 201)
   {
      responseStr = CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8);
      return true;
   }

   int err = GetLastError();
   if(res == -1)
   {
      Print("[TradeTrackPro EA] ❌ WebRequest Error Code: ", err, ". Ensure '", InpServerUrl, "' is added to MT5 WebRequest allowed URLs list.");
   }
   else
   {
      Print("[TradeTrackPro EA] ❌ HTTP Error Code: ", res, " Response: ", CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8));
   }
   return false;
}

void SendHeartbeat()
{
   string url = InpServerUrl + "/api/sync/heartbeat";
   long loginNum = (long)AccountInfoInteger(ACCOUNT_LOGIN);

   string json = StringFormat("{"
                              "\\"accountNumber\\":\\"%s\\","
                              "\\"broker\\":\\"%s\\","
                              "\\"server\\":\\"%s\\","
                              "\\"currency\\":\\"%s\\","
                              "\\"terminalId\\":\\"MT5_%s\\","
                              "\\"eaVersion\\":\\"1.0.0\\""
                              "}",
                              IntegerToString(loginNum),
                              EscapeJsonString(AccountInfoString(ACCOUNT_COMPANY)),
                              EscapeJsonString(AccountInfoString(ACCOUNT_SERVER)),
                              AccountInfoString(ACCOUNT_CURRENCY),
                              IntegerToString(loginNum));

   string response;
   if(SendHttpPost(url, json, response))
   {
      Print("[TradeTrackPro EA] ✅ Heartbeat acknowledged by server.");
   }
}

void ScanAndSyncClosedTrades()
{
   if(!HistorySelect(0, TimeCurrent())) return;

   int totalDeals = HistoryDealsTotal();

   for(int i = 0; i < totalDeals; i++)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket <= 0) continue;

      long entryType = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      if(entryType != DEAL_ENTRY_OUT && entryType != DEAL_ENTRY_INOUT) continue;

      long dealType = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
      if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL) continue;

      ulong positionId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
      ulong targetTicket = (positionId > 0) ? positionId : dealTicket;

      if(IsTicketAlreadySynced(targetTicket)) continue;

      string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
      double volume = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
      double exitPrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
      double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
      double commission = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
      double swap = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
      datetime exitTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
      string comment = HistoryDealGetString(dealTicket, DEAL_COMMENT);
      long magic = HistoryDealGetInteger(dealTicket, DEAL_MAGIC);

      double entryPrice = exitPrice;
      datetime entryTime = exitTime;
      double sl = 0.0;
      double tp = 0.0;
      string directionStr = (dealType == DEAL_TYPE_BUY) ? "buy" : "sell";

      for(int j = 0; j < totalDeals; j++)
      {
         ulong inTicket = HistoryDealGetTicket(j);
         if(HistoryDealGetInteger(inTicket, DEAL_POSITION_ID) == positionId &&
            (HistoryDealGetInteger(inTicket, DEAL_ENTRY) == DEAL_ENTRY_IN))
         {
            entryPrice = HistoryDealGetDouble(inTicket, DEAL_PRICE);
            entryTime = (datetime)HistoryDealGetInteger(inTicket, DEAL_TIME);
            long inType = HistoryDealGetInteger(inTicket, DEAL_TYPE);
            directionStr = (inType == DEAL_TYPE_BUY) ? "buy" : "sell";
            break;
         }
      }

      long loginNum = (long)AccountInfoInteger(ACCOUNT_LOGIN);

      string jsonPayload = StringFormat("{"
                                       "\\"ticket\\":\\"%s\\","
                                       "\\"positionId\\":\\"%s\\","
                                       "\\"symbol\\":\\"%s\\","
                                       "\\"direction\\":\\"%s\\","
                                       "\\"volume\\":%.2f,"
                                       "\\"entryPrice\\":%.5f,"
                                       "\\"exitPrice\\":%.5f,"
                                       "\\"stopLoss\\":%.5f,"
                                       "\\"takeProfit\\":%.5f,"
                                       "\\"commission\\":%.2f,"
                                       "\\"swap\\":%.2f,"
                                       "\\"profit\\":%.2f,"
                                       "\\"entryTime\\":\\"%s\\","
                                       "\\"exitTime\\":\\"%s\\","
                                       "\\"magicNumber\\":%d,"
                                       "\\"comment\\":\\"%s\\","
                                       "\\"accountNumber\\":\\"%s\\","
                                       "\\"broker\\":\\"%s\\","
                                       "\\"server\\":\\"%s\\","
                                       "\\"currency\\":\\"%s\\""
                                       "}",
                                       IntegerToString((long)targetTicket),
                                       IntegerToString((long)positionId),
                                       symbol,
                                       directionStr,
                                       volume,
                                       entryPrice,
                                       exitPrice,
                                       sl,
                                       tp,
                                       commission,
                                       swap,
                                       profit,
                                       TimeToISO(entryTime),
                                       TimeToISO(exitTime),
                                       magic,
                                       EscapeJsonString(comment),
                                       IntegerToString(loginNum),
                                       EscapeJsonString(AccountInfoString(ACCOUNT_COMPANY)),
                                       EscapeJsonString(AccountInfoString(ACCOUNT_SERVER)),
                                       AccountInfoString(ACCOUNT_CURRENCY));

      string response;
      string url = InpServerUrl + "/api/sync/trade";

      if(!SendHttpPost(url, jsonPayload, response))
      {
         QueueTradeLocally(jsonPayload);
      }
      else
      {
         MarkTicketAsSynced(targetTicket);
         Print("[TradeTrackPro EA] ✅ Successfully synced closed position #", IntegerToString((long)targetTicket), " (", symbol, ")");
      }
   }
}

void QueueTradeLocally(string jsonPayload)
{
   int fileHandle = FileOpen(g_queueFilename, FILE_READ|FILE_WRITE|FILE_TXT|FILE_ANSI);
   if(fileHandle != INVALID_HANDLE)
   {
      FileSeek(fileHandle, 0, SEEK_END);
      FileWriteString(fileHandle, jsonPayload + "\\r\\n");
      FileClose(fileHandle);
      Print("[TradeTrackPro EA] 💾 Unsent trade saved to offline queue file.");
   }
}

void ProcessOfflineQueue()
{
   if(!FileIsExist(g_queueFilename)) return;

   int fileHandle = FileOpen(g_queueFilename, FILE_READ|FILE_TXT|FILE_ANSI);
   if(fileHandle == INVALID_HANDLE) return;

   string lines[];
   int count = 0;

   while(!FileIsEnding(fileHandle))
   {
      string line = FileReadString(fileHandle);
      if(StringLen(line) > 10)
      {
         ArrayResize(lines, count + 1);
         lines[count] = line;
         count++;
      }
   }
   FileClose(fileHandle);

   if(count == 0)
   {
      FileDelete(g_queueFilename);
      return;
   }

   Print("[TradeTrackPro EA] 🔄 Retrying offline queue (", count, " pending trades)...");

   string remainingLines[];
   int remainingCount = 0;
   string url = InpServerUrl + "/api/sync/trade";

   for(int i = 0; i < count; i++)
   {
      string response;
      if(!SendHttpPost(url, lines[i], response))
      {
         ArrayResize(remainingLines, remainingCount + 1);
         remainingLines[remainingCount] = lines[i];
         remainingCount++;
      }
      else
      {
         Print("[TradeTrackPro EA] ✅ Resent queued trade successfully!");
      }
   }

   if(remainingCount == 0)
   {
      FileDelete(g_queueFilename);
      Print("[TradeTrackPro EA] 🎉 All queued trades successfully processed!");
   }
   else
   {
      int newFile = FileOpen(g_queueFilename, FILE_WRITE|FILE_TXT|FILE_ANSI);
      if(newFile != INVALID_HANDLE)
      {
         for(int k = 0; k < remainingCount; k++)
         {
            FileWriteString(newFile, remainingLines[k] + "\\r\\n");
         }
         FileClose(newFile);
      }
   }
}
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
