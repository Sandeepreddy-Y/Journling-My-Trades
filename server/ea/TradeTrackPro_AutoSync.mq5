//+------------------------------------------------------------------+
//|                                     TradeTrackPro_AutoSync.mq5    |
//|                        Copyright 2026, TradeTrack Pro Systems    |
//|                                    https://tradetrackpro.io      |
//+------------------------------------------------------------------+
#property copyright "TradeTrack Pro"
#property link      "https://tradetrackpro.io"
#property version   "1.00"
#property description "Real-Time Auto Sync Expert Advisor for MetaTrader 5."
#property description "Automatically streams historical & live trade executions to PostgreSQL journal."

// --- Input Parameters ---
input string InpApiKey       = "YOUR_API_KEY_HERE"; // TradeTrack Pro API Key (From Settings page)
input string InpServerUrl    = "http://localhost:5000"; // TradeTrack Pro API Server URL
input int    InpSyncInterval  = 60;                   // Sync Retry Interval (Seconds)
input int    InpHeartbeatSec  = 60;                   // Heartbeat Ping Interval (Seconds)

// --- Global Variables ---
datetime g_lastSyncTime       = 0;
datetime g_lastHeartbeat      = 0;
ulong    g_lastSyncedTicket   = 0;
string   g_queueFilename      = "tradetrack_queue.txt";
string   g_stateFilename      = "tradetrack_state.txt";
ulong    g_syncedTickets[];   // Session ticket cache to prevent duplicate network calls

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

   // 1. Load Last Synced Ticket State from Terminal Storage / File
   LoadSyncState();

   // 2. Enable Timer for continuous sync retries and heartbeats (every 5s)
   EventSetTimer(5);

   // 3. Send Initial Heartbeat
   SendHeartbeat();

   // 4. Perform Initial Account History Sync (One-time on startup)
   SyncAccountHistory();

   Print("[TradeTrackPro EA] EA initialized successfully. Monitoring MT5 account #", IntegerToString((long)AccountInfoInteger(ACCOUNT_LOGIN)));
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   SaveSyncState();
   ArrayFree(g_syncedTickets);
   Print("[TradeTrackPro EA] EA Deinitialized. Reason code: ", reason);
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   // Continuous live monitoring on price ticks
   ScanAndSyncClosedTrades();
}

//+------------------------------------------------------------------+
//| Timer event function                                             |
//+------------------------------------------------------------------+
void OnTimer()
{
   datetime now = TimeCurrent();

   // Heartbeat check every N seconds (Default 60s)
   if(now - g_lastHeartbeat >= InpHeartbeatSec)
   {
      SendHeartbeat();
      g_lastHeartbeat = now;
   }

   // Process offline retry queue
   ProcessOfflineQueue();
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
      Print("[TradeTrackPro EA] ⚡ Live Trade Detected: Deal #", IntegerToString((long)trans.deal));
      ScanAndSyncClosedTrades();
   }
   else if(trans.type == TRADE_TRANSACTION_POSITION)
   {
      Print("[TradeTrackPro EA] ⚡ Live Trade Detected: Position Modified #", IntegerToString((long)trans.position));
      ScanAndSyncClosedTrades();
   }
   else if(trans.type == TRADE_TRANSACTION_ORDER_ADD)
   {
      Print("[TradeTrackPro EA] ⚡ Live Trade Detected: Order Added #", IntegerToString((long)trans.order));
   }
}

//+------------------------------------------------------------------+
//| Load Last Synced Ticket State from Global Variable / File       |
//+------------------------------------------------------------------+
void LoadSyncState()
{
   string gvName = "TTP_LAST_SYNCED_TICKET_" + IntegerToString((long)AccountInfoInteger(ACCOUNT_LOGIN));
   if(GlobalVariableCheck(gvName))
   {
      g_lastSyncedTicket = (ulong)GlobalVariableGet(gvName);
   }

   if(FileIsExist(g_stateFilename))
   {
      int handle = FileOpen(g_stateFilename, FILE_READ|FILE_TXT|FILE_ANSI);
      if(handle != INVALID_HANDLE)
      {
         string line = FileReadString(handle);
         ulong fileTicket = (ulong)StringToInteger(line);
         if(fileTicket > g_lastSyncedTicket)
         {
            g_lastSyncedTicket = fileTicket;
         }
         FileClose(handle);
      }
   }
   Print("[TradeTrackPro EA] Loaded last synced ticket state: #", IntegerToString((long)g_lastSyncedTicket));
}

//+------------------------------------------------------------------+
//| Save Last Synced Ticket State to Global Variable & File          |
//+------------------------------------------------------------------+
void SaveSyncState()
{
   string gvName = "TTP_LAST_SYNCED_TICKET_" + IntegerToString((long)AccountInfoInteger(ACCOUNT_LOGIN));
   GlobalVariableSet(gvName, (double)g_lastSyncedTicket);

   int handle = FileOpen(g_stateFilename, FILE_WRITE|FILE_TXT|FILE_ANSI);
   if(handle != INVALID_HANDLE)
   {
      FileWriteString(handle, IntegerToString((long)g_lastSyncedTicket));
      FileClose(handle);
   }
}

//+------------------------------------------------------------------+
//| Session Ticket Cache Check                                       |
//+------------------------------------------------------------------+
bool IsTicketAlreadySynced(ulong ticket)
{
   if(ticket <= g_lastSyncedTicket) return true;

   int total = ArraySize(g_syncedTickets);
   for(int i = 0; i < total; i++)
   {
      if(g_syncedTickets[i] == ticket) return true;
   }
   return false;
}

//+------------------------------------------------------------------+
//| Mark Ticket as Synced                                            |
//+------------------------------------------------------------------+
void MarkTicketAsSynced(ulong ticket)
{
   if(ticket > g_lastSyncedTicket)
   {
      g_lastSyncedTicket = ticket;
      SaveSyncState();
   }

   if(IsTicketAlreadySynced(ticket)) return;
   int size = ArraySize(g_syncedTickets);
   ArrayResize(g_syncedTickets, size + 1);
   g_syncedTickets[size] = ticket;
}

//+------------------------------------------------------------------+
//| Format Time string to ISO 8601                                   |
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
   long loginNum = (long)AccountInfoInteger(ACCOUNT_LOGIN);
   int openCount = PositionsTotal();
   int buildNum = (int)TerminalInfoInteger(TERMINAL_BUILD);

   string json = StringFormat("{"
                              "\"accountNumber\":\"%s\","
                              "\"broker\":\"%s\","
                              "\"server\":\"%s\","
                              "\"currency\":\"%s\","
                              "\"terminalId\":\"MT5_%s\","
                              "\"terminalBuild\":%d,"
                              "\"eaVersion\":\"1.0.0\","
                              "\"lastSyncedTicket\":\"%s\","
                              "\"openPositionsCount\":%d"
                              "}",
                              IntegerToString(loginNum),
                              EscapeJsonString(AccountInfoString(ACCOUNT_COMPANY)),
                              EscapeJsonString(AccountInfoString(ACCOUNT_SERVER)),
                              AccountInfoString(ACCOUNT_CURRENCY),
                              IntegerToString(loginNum),
                              buildNum,
                              IntegerToString((long)g_lastSyncedTicket),
                              openCount);

   string response;
   if(SendHttpPost(url, json, response))
   {
      Print("[TradeTrackPro EA] 💓 Heartbeat Sent");
   }
}

//+------------------------------------------------------------------+
//| One-Time Initial Account History Synchronization                 |
//+------------------------------------------------------------------+
void SyncAccountHistory()
{
   Print("[TradeTrackPro EA] 📜 History Sync Started");

   if(!HistorySelect(0, TimeCurrent()))
   {
      Print("[TradeTrackPro EA] ⚠️ HistorySelect failed");
      return;
   }

   int totalDeals = HistoryDealsTotal();
   Print("[TradeTrackPro EA] 📜 History Trades Found: ", IntegerToString(totalDeals));

   int uploadedCount = 0;

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

      if(targetTicket <= g_lastSyncedTicket)
      {
         Print("[TradeTrackPro EA] Duplicate Ignored for historical ticket #", IntegerToString((long)targetTicket));
         continue;
      }

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
                                       "\"ticket\":\"%s\","
                                       "\"positionId\":\"%s\","
                                       "\"symbol\":\"%s\","
                                       "\"direction\":\"%s\","
                                       "\"volume\":%.2f,"
                                       "\"entryPrice\":%.5f,"
                                       "\"exitPrice\":%.5f,"
                                       "\"stopLoss\":0.0,"
                                       "\"takeProfit\":0.0,"
                                       "\"commission\":%.2f,"
                                       "\"swap\":%.2f,"
                                       "\"profit\":%.2f,"
                                       "\"entryTime\":\"%s\","
                                       "\"exitTime\":\"%s\","
                                       "\"magicNumber\":%d,"
                                       "\"comment\":\"%s\","
                                       "\"accountNumber\":\"%s\","
                                       "\"broker\":\"%s\","
                                       "\"server\":\"%s\","
                                       "\"currency\":\"%s\","
                                       "\"status\":\"closed\""
                                       "}",
                                       IntegerToString((long)targetTicket),
                                       IntegerToString((long)positionId),
                                       symbol,
                                       directionStr,
                                       volume,
                                       entryPrice,
                                       exitPrice,
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
         uploadedCount++;
         Print("[TradeTrackPro EA] 📜 Trade Uploaded: Ticket #", IntegerToString((long)targetTicket), " (", symbol, ")");
      }
   }

   Print("[TradeTrackPro EA] 📜 History Trades Uploaded: ", IntegerToString(uploadedCount));
   Print("[TradeTrackPro EA] 📜 Sync Complete");
}

//+------------------------------------------------------------------+
//| Scan and Sync Live Closed & Open Trades                           |
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
      if(entryType != DEAL_ENTRY_OUT && entryType != DEAL_ENTRY_INOUT) continue;

      long dealType = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
      if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL) continue;

      ulong positionId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
      ulong targetTicket = (positionId > 0) ? positionId : dealTicket;

      if(IsTicketAlreadySynced(targetTicket))
      {
         continue;
      }

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
                                       "\"ticket\":\"%s\","
                                       "\"positionId\":\"%s\","
                                       "\"symbol\":\"%s\","
                                       "\"direction\":\"%s\","
                                       "\"volume\":%.2f,"
                                       "\"entryPrice\":%.5f,"
                                       "\"exitPrice\":%.5f,"
                                       "\"stopLoss\":0.0,"
                                       "\"takeProfit\":0.0,"
                                       "\"commission\":%.2f,"
                                       "\"swap\":%.2f,"
                                       "\"profit\":%.2f,"
                                       "\"entryTime\":\"%s\","
                                       "\"exitTime\":\"%s\","
                                       "\"magicNumber\":%d,"
                                       "\"comment\":\"%s\","
                                       "\"accountNumber\":\"%s\","
                                       "\"broker\":\"%s\","
                                       "\"server\":\"%s\","
                                       "\"currency\":\"%s\","
                                       "\"status\":\"closed\""
                                       "}",
                                       IntegerToString((long)targetTicket),
                                       IntegerToString((long)positionId),
                                       symbol,
                                       directionStr,
                                       volume,
                                       entryPrice,
                                       exitPrice,
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
         Print("[TradeTrackPro EA] ⚡ Trade Uploaded: Ticket #", IntegerToString((long)targetTicket), " (", symbol, ")");
      }
   }
}

//+------------------------------------------------------------------+
//| Queue Unsent Trade Payload to Local File                         |
//+------------------------------------------------------------------+
void QueueTradeLocally(string jsonPayload)
{
   int fileHandle = FileOpen(g_queueFilename, FILE_READ|FILE_WRITE|FILE_TXT|FILE_ANSI);
   if(fileHandle != INVALID_HANDLE)
   {
      FileSeek(fileHandle, 0, SEEK_END);
      FileWriteString(fileHandle, jsonPayload + "\r\n");
      FileClose(fileHandle);
      Print("[TradeTrackPro EA] 💾 Trade queued offline");
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

   Print("[TradeTrackPro EA] 🔄 Retry Upload (", count, " pending trades)...");

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
         Print("[TradeTrackPro EA] ✅ Retry Upload succeeded for queued trade!");
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
            FileWriteString(newFile, remainingLines[k] + "\r\n");
         }
         FileClose(newFile);
      }
   }
}
//+------------------------------------------------------------------+
