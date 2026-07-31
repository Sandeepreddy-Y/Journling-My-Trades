/**
 * TradeTrack Pro — Universal Multi-Format Statement File Parser
 * Supports:
 * - MetaTrader 5 (MT5) HTML Trade History Reports (New Positions Table layout)
 * - MetaTrader 4 (MT4) Detailed HTML Reports (Legacy layout)
 * - cTrader CSV & HTML Reports
 * - DXTrade / TradeLocker CSV Statements
 * - Prop Firm Statements (GoatFunded, FTMO, Funding Pips, MyFundedFX, Funding Traders)
 * - Multi-encoding buffer decoding (UTF-16LE, UTF-8)
 */

// Helper to determine asset class from symbol
const detectAssetClass = (symbol) => {
  if (!symbol) return 'forex';
  const sym = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'BNB', 'AVAX'].some((c) => sym.includes(c))) {
    return 'crypto';
  }
  if (['US30', 'NAS100', 'US100', 'SPX500', 'SP500', 'GER30', 'GER40', 'UK100', 'JPN225', 'NDX'].some((i) => sym.includes(i))) {
    return 'indices';
  }
  if (['XAU', 'XAG', 'GOLD', 'SILVER', 'USOIL', 'UKOIL', 'WTI', 'BRENT', 'OIL'].some((cm) => sym.includes(cm))) {
    return 'commodities';
  }
  return 'forex';
};

// Helper to determine trading session from date
const detectSession = (dateStr) => {
  try {
    const d = new Date(dateStr);
    const hour = d.getUTCHours();

    if (hour >= 22 || hour < 7) return 'tokyo';
    if (hour >= 7 && hour < 12) return 'london';
    if (hour >= 12 && hour < 16) return 'overlap';
    if (hour >= 16 && hour < 21) return 'new_york';
    return 'sydney';
  } catch {
    return 'london';
  }
};

// Clean string
const clean = (val) => (val ? String(val).replace(/["'\r]/g, '').trim() : '');

// Parse date string to ISO format
const parseDate = (val) => {
  if (!val) return new Date().toISOString();
  let str = clean(val);

  // MT4/MT5 format: 2026.07.25 14:30:00 -> 2026-07-25T14:30:00Z
  if (/^\d{4}\.\d{2}\.\d{2}/.test(str)) {
    str = str.replace(/\./g, '-').replace(' ', 'T') + 'Z';
  }
  // Standard format: 2026-07-25 14:30:00 -> 2026-07-25T14:30:00Z
  else if (/^\d{4}-\d{2}-\d{2}\s/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

/**
 * Split CSV line respecting quotes and preserving spaces inside values
 */
const parseCsvLine = (line) => {
  const result = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
};

/**
 * 1. PARSE HTML STATEMENTS (Supports New MT5 Positions Table & Legacy MT4 HTML Reports)
 */
const parseHtmlStatement = (htmlContent) => {
  console.log('[Parser] Selected Parser: parseHtmlStatement');

  // Completely strip hidden td/th elements (<td class="hidden">...) so they do not affect cell indexing
  const cleanHtml = htmlContent
    .replace(/<td[^>]*class=["'][^"']*hidden[^"']*["'][^>]*>[\s\S]*?<\/td>/gi, '')
    .replace(/<td[^>]*style=["'][^"']*display\s*:\s*none[^"']*["'][^>]*>[\s\S]*?<\/td>/gi, '')
    .replace(/<th[^>]*class=["'][^"']*hidden[^"']*["'][^>]*>[\s\S]*?<\/th>/gi, '')
    .replace(/<th[^>]*style=["'][^"']*display\s*:\s*none[^"']*["'][^>]*>[\s\S]*?<\/th>/gi, '');

  const trades = [];
  let isMt5Report = false;
  let positionsTableFound = false;
  let totalRowsFound = 0;
  let totalRowsSkipped = 0;

  // Extract all <table>...</table> blocks from the document
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;

  while ((tableMatch = tableRegex.exec(cleanHtml)) !== null) {
    const tableInner = tableMatch[1];

    // Extract rows <tr>...</tr>
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows = [];
    let rMatch;
    while ((rMatch = rowRegex.exec(tableInner)) !== null) {
      rows.push(rMatch[1]);
    }

    if (rows.length < 2) continue;

    // Helper to extract clean non-hidden cell texts from a row
    const getCells = (rowHtml) => {
      const cells = [];
      const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
      let cMatch;
      while ((cMatch = cellRegex.exec(rowHtml)) !== null) {
        const text = cMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/gi, '&')
          .trim();
        cells.push(text);
      }
      return cells;
    };

    // Inspect initial rows for header column names
    let headerRowIdx = -1;
    let headers = [];

    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const c = getCells(rows[i]);
      const lower = c.map((text) => text.toLowerCase());
      if (lower.includes('symbol') || lower.includes('position') || lower.includes('ticket') || (lower.includes('time') && lower.includes('type'))) {
        headerRowIdx = i;
        headers = lower;
        break;
      }
    }

    // Skip Orders and Deals tables (we ONLY parse closed positions in Positions table)
    if (headers.length > 0) {
      const isOrdersTable = headers.includes('order') && !headers.includes('position') && (headers.includes('state') || headers.includes('placed'));
      const isDealsTable = headers.includes('deal') && !headers.includes('position');
      if (isOrdersTable || isDealsTable) {
        continue;
      }
    }

    // Dynamic Header Column Index Mapping
    let openTimeIdx = -1;
    let closeTimeIdx = -1;
    let ticketIdx = -1;
    let symbolIdx = -1;
    let typeIdx = -1;
    let volumeIdx = -1;
    let openPriceIdx = -1;
    let closePriceIdx = -1;
    let slIdx = -1;
    let tpIdx = -1;
    let commIdx = -1;
    let swapIdx = -1;
    let profitIdx = -1;
    let isDynamicHeader = false;

    if (headers.length >= 5) {
      positionsTableFound = true;
      isDynamicHeader = true;

      const timeIndexes = [];
      const priceIndexes = [];

      headers.forEach((val, idx) => {
        if (val === 'time' || val.includes('open time') || val.includes('close time') || val.includes('date')) {
          timeIndexes.push(idx);
        }
        if (val === 'price' || val.includes('open price') || val.includes('close price')) {
          priceIndexes.push(idx);
        }
      });

      const getHeaderIdx = (keywords) => {
        for (const kw of keywords) {
          const idx = headers.findIndex((val) => val === kw);
          if (idx !== -1) return idx;
        }
        for (const kw of keywords) {
          const idx = headers.findIndex((val) => val.includes(kw));
          if (idx !== -1) return idx;
        }
        return -1;
      };

      ticketIdx = getHeaderIdx(['position', 'ticket', 'order']);
      symbolIdx = getHeaderIdx(['symbol', 'item', 'instrument']);
      typeIdx = getHeaderIdx(['type', 'action', 'direction']);
      volumeIdx = getHeaderIdx(['volume', 'size', 'lots', 'qty']);
      slIdx = getHeaderIdx(['s/l', 'sl', 'stop loss']);
      tpIdx = getHeaderIdx(['t/p', 'tp', 'take profit']);
      commIdx = getHeaderIdx(['commission', 'comm', 'fees']);
      swapIdx = getHeaderIdx(['swap', 'rollover']);
      profitIdx = getHeaderIdx(['profit', 'pnl', 'realized p/l']);

      openTimeIdx = timeIndexes.length > 0 ? timeIndexes[0] : getHeaderIdx(['open time', 'time']);
      closeTimeIdx = timeIndexes.length > 1 ? timeIndexes[1] : (timeIndexes.length === 1 ? timeIndexes[0] : getHeaderIdx(['close time', 'time']));

      openPriceIdx = priceIndexes.length > 0 ? priceIndexes[0] : getHeaderIdx(['open price', 'price']);
      closePriceIdx = priceIndexes.length > 1 ? priceIndexes[1] : (priceIndexes.length === 1 ? priceIndexes[0] : getHeaderIdx(['close price', 'price']));

      if (ticketIdx === 1 && symbolIdx === 2 && typeIdx === 3 && volumeIdx === 4) {
        isMt5Report = true;
      }
    }

    const startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;
    const dataRows = rows.slice(startRow);
    totalRowsFound += dataRows.length;

    console.log(`[Parser] Positions table found with ${dataRows.length} data rows`);

    for (let i = 0; i < dataRows.length; i++) {
      const rowIndex = i + 1;
      const cells = getCells(dataRows[i]);

      if (cells.length < 5) {
        totalRowsSkipped += 1;
        console.log(`[Parser] Skipped Row ${rowIndex} - Reason: Less than 5 cells found`);
        continue;
      }

      const getVal = (idx) => (idx >= 0 && idx < cells.length ? clean(cells[idx]) : '');

      let typeVal = '';
      let ticket = '';
      let symbol = '';
      let lotSize = 1.0;
      let entryPrice = 0;
      let exitPrice = 0;
      let stopLoss = null;
      let takeProfit = null;
      let commission = 0;
      let swap = 0;
      let pnl = 0;
      let entryTime = new Date().toISOString();
      let exitTime = new Date().toISOString();

      if (isDynamicHeader && typeIdx !== -1) {
        typeVal = getVal(typeIdx).toLowerCase();

        if (!typeVal || (!typeVal.includes('buy') && !typeVal.includes('sell') && !typeVal.includes('long') && !typeVal.includes('short'))) {
          totalRowsSkipped += 1;
          console.log(`[Parser] Skipped Row ${rowIndex} - Reason: Non-trade row or invalid type "${typeVal}"`);
          continue;
        }
        if (typeVal.includes('limit') || typeVal.includes('stop') || typeVal.includes('canceled') || typeVal.includes('rejected')) {
          totalRowsSkipped += 1;
          console.log(`[Parser] Skipped Row ${rowIndex} - Reason: Pending or canceled order type "${typeVal}"`);
          continue;
        }

        ticket = getVal(ticketIdx) || `mt-${Date.now()}-${trades.length}`;
        symbol = clean(getVal(symbolIdx)).toUpperCase();
        lotSize = Math.abs(parseFloat(getVal(volumeIdx)) || 1.0);
        entryPrice = parseFloat(getVal(openPriceIdx)) || 0;
        exitPrice = parseFloat(getVal(closePriceIdx)) || entryPrice;
        stopLoss = parseFloat(getVal(slIdx)) || null;
        takeProfit = parseFloat(getVal(tpIdx)) || null;
        commission = Math.abs(parseFloat(getVal(commIdx)) || 0);
        swap = parseFloat(getVal(swapIdx)) || 0;
        pnl = parseFloat(getVal(profitIdx)) || 0;
        entryTime = parseDate(getVal(openTimeIdx));
        exitTime = parseDate(getVal(closeTimeIdx));
      } else {
        // Legacy MT4 HTML report parsing fallback (fixed index layout)
        // [Ticket, Open Time, Type, Size, Item, Price, S/L, T/P, Close Time, Price, Commission, Taxes, Swap, Profit]
        typeVal = cells[2]?.toLowerCase() || '';
        if (!typeVal || (!typeVal.includes('buy') && !typeVal.includes('sell') && !typeVal.includes('long') && !typeVal.includes('short'))) {
          totalRowsSkipped += 1;
          console.log(`[Parser] Skipped Row ${rowIndex} - Reason: Invalid MT4 trade type "${typeVal}"`);
          continue;
        }

        ticket = clean(cells[0]) || `mt4-${Date.now()}-${trades.length}`;
        entryTime = parseDate(cells[1]);
        lotSize = Math.abs(parseFloat(cells[3]) || 1.0);
        symbol = clean(cells[4] || cells[3] || 'EURUSD').toUpperCase();
        entryPrice = parseFloat(cells[5]) || 0;
        stopLoss = parseFloat(cells[6]) || null;
        takeProfit = parseFloat(cells[7]) || null;
        exitTime = parseDate(cells[8]);
        exitPrice = parseFloat(cells[9]) || entryPrice;
        commission = cells.length >= 11 ? Math.abs(parseFloat(cells[10]) || 0) : 0;
        swap = cells.length >= 13 ? parseFloat(cells[12]) || 0 : 0;
        pnl = cells.length >= 14 ? parseFloat(cells[13]) || 0 : parseFloat(cells[cells.length - 1]) || 0;
      }

      if (!symbol) {
        totalRowsSkipped += 1;
        console.log(`[Parser] Skipped Row ${rowIndex} - Reason: Missing Symbol`);
        continue;
      }

      if (entryPrice <= 0) {
        totalRowsSkipped += 1;
        console.log(`[Parser] Skipped Row ${rowIndex} - Reason: Invalid Entry Price (${entryPrice})`);
        continue;
      }

      const direction = typeVal.includes('buy') || typeVal.includes('long') ? 'long' : 'short';
      const cleanSym = symbol.replace(/[^A-Z0-9/]/gi, '');

      const parsedTrade = {
        ticket,
        symbol: cleanSym,
        assetClass: detectAssetClass(cleanSym),
        direction,
        entryPrice,
        exitPrice: exitPrice > 0 ? exitPrice : entryPrice,
        lotSize,
        stopLoss: stopLoss > 0 ? stopLoss : null,
        takeProfit: takeProfit > 0 ? takeProfit : null,
        fees: commission,
        swap,
        pnl,
        pnlPips: parseFloat(((exitPrice - entryPrice) * (direction === 'long' ? 1 : -1) * 10000).toFixed(1)),
        outcome: pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'breakeven',
        session: detectSession(entryTime),
        setupTag: 'Statement Import',
        entryTime,
        exitTime,
        broker: isMt5Report ? 'MetaTrader 5 HTML Statement' : 'MetaTrader HTML Statement',
        status: 'closed',
      };

      trades.push(parsedTrade);
      console.log(`[Parser] Row ${rowIndex} parsed successfully:`, {
        symbol: parsedTrade.symbol,
        direction: parsedTrade.direction,
        entryPrice: parsedTrade.entryPrice,
        exitPrice: parsedTrade.exitPrice,
        entryTime: parsedTrade.entryTime,
        exitTime: parsedTrade.exitTime,
        lotSize: parsedTrade.lotSize,
        commission: parsedTrade.fees,
        swap: parsedTrade.swap,
        pnl: parsedTrade.pnl,
      });
    }
  }

  if (isMt5Report) {
    console.log('[Parser] Detected MT5 HTML report');
  } else {
    console.log('[Parser] Detected MT4 HTML report');
  }

  if (positionsTableFound) {
    console.log('[Parser] Positions table found');
  }

  console.log(`[Parser] Summary: Rows Found = ${totalRowsFound}, Rows Parsed = ${trades.length}, Rows Skipped = ${totalRowsSkipped}`);
  if (trades.length > 0) {
    console.log('[Parser] First parsed trade:', JSON.stringify(trades[0], null, 2));
  }

  return trades;
};

/**
 * 2. PARSE CSV STATEMENTS (MT4, MT5, cTrader, DXTrade, TradeLocker, FTMO, Prop Firms)
 */
const parseCsvStatement = (csvText) => {
  console.log('[Parser] Selected Parser: parseCsvStatement');
  const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error('CSV file contains less than 2 lines (header + data row required).');
  }

  const trades = [];
  const headers = parseCsvLine(lines[0].toLowerCase()).map((h) => clean(h));

  const getIdx = (keywords) => {
    for (const kw of keywords) {
      const exact = headers.findIndex((h) => h === kw);
      if (exact !== -1) return exact;
    }
    for (const kw of keywords) {
      const inc = headers.findIndex((h) => h.includes(kw));
      if (inc !== -1) return inc;
    }
    return -1;
  };

  const symbolIdx = getIdx(['symbol', 'item', 'instrument', 'pair']);
  const typeIdx = getIdx(['type', 'direction', 'side', 'action']);
  const sizeIdx = getIdx(['size', 'volume', 'lots', 'qty', 'quantity']);
  const openPriceIdx = getIdx(['open price', 'entry price', 'price', 'open']);
  const closePriceIdx = getIdx(['close price', 'exit price', 'close']);
  const openTimeIdx = getIdx(['open time', 'entry time', 'placed time', 'time', 'date']);
  const closeTimeIdx = getIdx(['close time', 'exit time', 'filled time']);
  const slIdx = getIdx(['s/l', 'sl', 'stop loss']);
  const tpIdx = getIdx(['t/p', 'tp', 'take profit']);
  const pnlIdx = getIdx(['profit', 'pnl', 'realized p/l', 'net pnl', 'net p/l']);
  const commIdx = getIdx(['commission', 'comm', 'fees']);
  const swapIdx = getIdx(['swap', 'rollover']);
  const ticketIdx = getIdx(['ticket', 'position', 'order id', 'id', 'deal']);

  if (symbolIdx === -1 && typeIdx === -1 && openPriceIdx === -1) {
    throw new Error(`CSV header does not contain recognizable trade columns. Found headers: [${headers.join(', ')}]. Expected columns like Symbol, Type, Open Price, Size.`);
  }

  let totalRowsSkipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    if (parts.length < 4) {
      totalRowsSkipped += 1;
      continue;
    }

    const getVal = (idx) => (idx >= 0 && idx < parts.length ? clean(parts[idx]) : '');

    const symbolVal = getVal(symbolIdx);
    const typeVal = getVal(typeIdx);

    if (!symbolVal || symbolVal.toLowerCase().includes('balance') || symbolVal.toLowerCase().includes('deposit')) {
      totalRowsSkipped += 1;
      continue;
    }

    const direction = typeVal.toLowerCase().includes('sell') || typeVal.toLowerCase().includes('short') ? 'short' : 'long';
    const lotSize = Math.abs(parseFloat(getVal(sizeIdx)) || 1.0);
    const entryPrice = parseFloat(getVal(openPriceIdx)) || 0;
    const exitPrice = parseFloat(getVal(closePriceIdx)) || entryPrice;
    const stopLoss = parseFloat(getVal(slIdx)) || null;
    const takeProfit = parseFloat(getVal(tpIdx)) || null;
    const pnl = parseFloat(getVal(pnlIdx)) || 0;
    const commission = Math.abs(parseFloat(getVal(commIdx)) || 0);
    const swap = parseFloat(getVal(swapIdx)) || 0;
    const entryTime = parseDate(getVal(openTimeIdx));
    const exitTime = parseDate(getVal(closeTimeIdx));
    const ticket = getVal(ticketIdx) || `csv-${Date.now()}-${i}`;

    if (symbolVal && entryPrice > 0) {
      const cleanSymbol = symbolVal.replace(/[^A-Z0-9/]/gi, '').toUpperCase();

      const parsedTrade = {
        ticket,
        symbol: cleanSymbol,
        assetClass: detectAssetClass(cleanSymbol),
        direction,
        entryPrice,
        exitPrice,
        lotSize,
        stopLoss: stopLoss > 0 ? stopLoss : null,
        takeProfit: takeProfit > 0 ? takeProfit : null,
        fees: commission,
        swap,
        pnl,
        pnlPips: parseFloat(((exitPrice - entryPrice) * (direction === 'long' ? 1 : -1) * 10000).toFixed(1)),
        outcome: pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'breakeven',
        session: detectSession(entryTime),
        setupTag: 'Statement Import',
        entryTime,
        exitTime,
        broker: 'CSV Statement Import',
        status: 'closed',
      };

      trades.push(parsedTrade);
      console.log(`[Parser] CSV Row ${i} parsed successfully:`, {
        symbol: parsedTrade.symbol,
        direction: parsedTrade.direction,
        entryPrice: parsedTrade.entryPrice,
        exitPrice: parsedTrade.exitPrice,
        entryTime: parsedTrade.entryTime,
        exitTime: parsedTrade.exitTime,
        lotSize: parsedTrade.lotSize,
        commission: parsedTrade.fees,
        swap: parsedTrade.swap,
        pnl: parsedTrade.pnl,
      });
    } else {
      totalRowsSkipped += 1;
    }
  }

  console.log(`[Parser] Summary: Rows Found = ${lines.length - 1}, Rows Parsed = ${trades.length}, Rows Skipped = ${totalRowsSkipped}`);
  if (trades.length > 0) {
    console.log('[Parser] First parsed trade:', JSON.stringify(trades[0], null, 2));
  }

  return trades;
};

/**
 * Universal Statement File Entry Point
 */
const parseStatementFile = (fileBuffer, filename = '') => {
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('No statement file content was provided in request.');
  }

  // Detect binary Excel XLSX (PK zip header)
  if (fileBuffer.length >= 4 && fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4b && fileBuffer[2] === 0x03 && fileBuffer[3] === 0x04) {
    console.log('[Parser] Detected binary XLSX (Zip container) file format.');
    throw new Error('Binary Excel (.xlsx) files are not plain text. Please save or export your statement as CSV (.csv) or Detailed Report (.html) from MetaTrader/cTrader.');
  }

  // Multi-encoding decoding (UTF-16LE, UTF-16BE, UTF-8)
  let content = '';
  let encodingUsed = 'utf-8';

  if (fileBuffer.length >= 2 && ((fileBuffer[0] === 0xff && fileBuffer[1] === 0xfe) || (fileBuffer[1] === 0x00 && fileBuffer[3] === 0x00))) {
    encodingUsed = 'utf-16le';
    content = fileBuffer.toString('utf16le');
  } else {
    content = fileBuffer.toString('utf-8');
    if (content.includes('\u0000')) {
      encodingUsed = 'utf-16le';
      content = fileBuffer.toString('utf16le');
    }
  }

  // Clean null characters & Byte Order Marks
  content = content.replace(/\u0000/g, '').replace(/^\uFEFF/, '').trim();

  if (!content) {
    throw new Error('Statement file is empty after content decoding.');
  }

  const ext = filename.toLowerCase().split('.').pop() || '';
  const lowerContent = content.toLowerCase();

  let detectedType = 'CSV / Plain Text Statement';
  let parserSelected = 'parseCsvStatement';

  if (lowerContent.includes('<html') || lowerContent.includes('<table') || lowerContent.includes('<tr') || ext === 'html' || ext === 'htm') {
    detectedType = 'HTML (MetaTrader / cTrader Detailed Report)';
    parserSelected = 'parseHtmlStatement';
  } else if (ext === 'csv' || lowerContent.includes(',') || lowerContent.includes('ticket')) {
    detectedType = 'CSV Statement';
    parserSelected = 'parseCsvStatement';
  }

  console.log(`[Parser] File Type Detected: ${detectedType} | Parser Selected: ${parserSelected} | Encoding: ${encodingUsed}`);

  let trades = [];
  if (parserSelected === 'parseHtmlStatement') {
    trades = parseHtmlStatement(content);
    if (trades.length === 0) {
      throw new Error('HTML statement parsed successfully, but no closed trade position rows (buy/sell) were found in the Positions <table> elements.');
    }
  } else {
    trades = parseCsvStatement(content);
    if (trades.length === 0) {
      throw new Error('CSV statement parsed, but no valid trade executions with symbol, price, and volume columns were found.');
    }
  }

  return {
    detectedType,
    parserSelected,
    trades,
  };
};

module.exports = {
  parseStatementFile,
  parseHtmlStatement,
  parseCsvStatement,
  parseCsvLine,
  detectAssetClass,
  detectSession,
};
