//+------------------------------------------------------------------+
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
input string InpApiKey       = "YOUR_API_KEY_HERE"; // TradeTrack Pro API Key (Get from Settings page)
input string InpServerUrl    = "http://localhost:5000"; // TradeTrack Pro API Server URL
input int    InpSyncInterval  = 60;                   // Sync Retry Interval (Seconds)
input int    InpHeartbeatSec  = 180;                  // Heartbeat Ping Interval (Seconds)

// --- Global Variables ---
datetime g_lastSyncTime = 0;
datetime g_lastHeartbeat = 0;
string   g_queueFilename = "tradetrack_queue.txt";

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

   // Enable Timer for continuous sync retries and heartbeats
   EventSetTimer(5);

   // Trigger initial heartbeat & sync check
   SendHeartbeat();
   ScanAndSyncClosedTrades();

   Print("[TradeTrackPro EA] EA initialized successfully. Monitoring MT5 account #", AccountInfoInteger(ACCOUNT_LOGIN));
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("[TradeTrackPro EA] EA Deinitialized. Reason code: ", reason);
}

//+------------------------------------------------------------------+
//| Timer event function                                             |
//+------------------------------------------------------------------+
void OnTimer()
{
   datetime now = TimeCurrent();

   // Heartbeat check every N seconds
   if(now - g_lastHeartbeat >= InpHeartbeatSec)
   {
      SendHeartbeat();
      g_lastHeartbeat = now;
   }

   // Process offline retry queue & check for new closed trades
   ProcessOfflineQueue();
   ScanAndSyncClosedTrades();
}

//+------------------------------------------------------------------+
//| Trade Transaction event (triggers immediately on position close) |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      // Trigger instant scan when a deal is added to account history
      ScanAndSyncClosedTrades();
   }
}

//+------------------------------------------------------------------+
//| Format Time string to ISO 8601 (YYYY-MM-DDTHH:MM:SSZ)            |
//+------------------------------------------------------------------+
string TimeToISO(datetime timeVal)
{
   MqlDateTime dt;
   TimeToStruct(timeVal, dt);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02d.000Z",
                       dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec);
}

//+------------------------------------------------------------------+
//| Escape String for JSON                                           |
//+------------------------------------------------------------------+
string EscapeJsonString(string str)
{
   StringReplace(str, "\\", "\\\\");
   StringReplace(str, "\"", "\\\"");
   StringReplace(str, "\r", "");
   StringReplace(str, "\n", " ");
   return str;
}

//+------------------------------------------------------------------+
//| Send HTTP POST Request via WebRequest()                          |
//+------------------------------------------------------------------+
bool SendHttpPost(string url, string jsonBody, string &responseStr)
{
   string headers = StringFormat("Content-Type: application/json\r\nx-api-key: %s\r\n", InpApiKey);
   char data[];
   char resultData[];
   string resultHeaders;

   StringToCharArray(jsonBody, data, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(data, ArraySize(data) - 1); // remove trailing null char

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
      Print("[TradeTrackPro EA] ❌ WebRequest Error Code: ", err, ". Ensure '", InpServerUrl, "' is added to MT5 WebRequest allowed URLs list (Tools -> Options -> Expert Advisors).");
   }
   else
   {
      Print("[TradeTrackPro EA] ❌ HTTP Error Code: ", res, " Response: ", CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8));
   }
   return false;
}

//+------------------------------------------------------------------+
//| Send Heartbeat Ping to Backend                                   |
//+------------------------------------------------------------------+
void SendHeartbeat()
{
   string url = InpServerUrl + "/api/sync/heartbeat";
   string json = StringFormat("{"
                              "\"accountNumber\":\"%d\","
                              "\"broker\":\"%s\","
                              "\"server\":\"%s\","
                              "\"currency\":\"%s\","
                              "\"terminalId\":\"MT5_%d\","
                              "\"eaVersion\":\"1.0.0\""
                              "}",
                              AccountInfoInteger(ACCOUNT_LOGIN),
                              EscapeJsonString(AccountInfoString(ACCOUNT_COMPANY)),
                              EscapeJsonString(AccountInfoString(ACCOUNT_SERVER)),
                              AccountInfoString(ACCOUNT_CURRENCY),
                              AccountInfoInteger(ACCOUNT_LOGIN));

   string response;
   if(SendHttpPost(url, json, response))
   {
      Print("[TradeTrackPro EA] ✅ Heartbeat acknowledged by server.");
   }
}

//+------------------------------------------------------------------+
//| Scan History and Sync Closed Trade Executions                   |
//+------------------------------------------------------------------+
void ScanAndSyncClosedTrades()
{
   if(!HistorySelect(0, TimeCurrent())) return;

   int totalDeals = HistoryDealsTotal();

   for(int i = 0; i < totalDeals; i++)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket <= 0) continue;

      long entryType = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      // We only care about OUT deals (position close)
      if(entryType != DEAL_ENTRY_OUT && entryType != DEAL_ENTRY_INOUT) continue;

      long dealType = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
      if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL) continue;

      ulong positionId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
      string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
      double volume = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
      double exitPrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
      double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
      double commission = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
      double swap = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
      datetime exitTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
      string comment = HistoryDealGetString(dealTicket, DEAL_COMMENT);
      long magic = HistoryDealGetInteger(dealTicket, DEAL_MAGIC);

      // Find corresponding IN deal for entry price & entry time
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

      string jsonPayload = StringFormat("{"
                                       "\"ticket\":\"%d\","
                                       "\"positionId\":\"%d\","
                                       "\"symbol\":\"%s\","
                                       "\"direction\":\"%s\","
                                       "\"volume\":%.2f,"
                                       "\"entryPrice\":%.5f,"
                                       "\"exitPrice\":%.5f,"
                                       "\"stopLoss\":%.5f,"
                                       "\"takeProfit\":%.5f,"
                                       "\"commission\":%.2f,"
                                       "\"swap\":%.2f,"
                                       "\"profit\":%.2f,"
                                       "\"entryTime\":\"%s\","
                                       "\"exitTime\":\"%s\","
                                       "\"magicNumber\":%d,"
                                       "\"comment\":\"%s\","
                                       "\"accountNumber\":\"%d\","
                                       "\"broker\":\"%s\","
                                       "\"server\":\"%s\","
                                       "\"currency\":\"%s\""
                                       "}",
                                       positionId > 0 ? positionId : dealTicket,
                                       positionId,
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
                                       AccountInfoInteger(ACCOUNT_LOGIN),
                                       EscapeJsonString(AccountInfoString(ACCOUNT_COMPANY)),
                                       EscapeJsonString(AccountInfoString(ACCOUNT_SERVER)),
                                       AccountInfoString(ACCOUNT_CURRENCY));

      string response;
      string url = InpServerUrl + "/api/sync/trade";

      if(!SendHttpPost(url, jsonPayload, response))
      {
         // Network error or server unavailable: Queue trade locally
         QueueTradeLocally(jsonPayload);
      }
      else
      {
         Print("[TradeTrackPro EA] ✅ Successfully synced closed position #", positionId, " (", symbol, ")");
      }
   }
}

//+------------------------------------------------------------------+
//| Queue Unsent Trade Payload to File                               |
//+------------------------------------------------------------------+
void QueueTradeLocally(string jsonPayload)
{
   int fileHandle = FileOpen(g_queueFilename, FILE_READ|FILE_WRITE|FILE_TXT|FILE_ANSI);
   if(fileHandle != INVALID_HANDLE)
   {
      FileSeek(fileHandle, 0, SEEK_END);
      FileWriteString(fileHandle, jsonPayload + "\n");
      FileClose(fileHandle);
      Print("[TradeTrackPro EA] 💾 Unsent trade saved to offline queue file.");
   }
}

//+------------------------------------------------------------------+
//| Process Offline Queue & Retry Sending Unsent Trades              |
//+------------------------------------------------------------------+
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
            FileWriteString(newFile, remainingLines[k] + "\n");
         }
         FileClose(newFile);
      }
   }
}
//+------------------------------------------------------------------+
