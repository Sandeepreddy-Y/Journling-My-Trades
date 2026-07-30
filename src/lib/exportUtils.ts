import type { Trade } from '@/types';

/**
 * Export Trades Array to CSV / Excel File
 */
export function exportTradesToCSV(trades: Trade[], filename = 'tradetrack_export.csv') {
  if (!trades || trades.length === 0) return;

  const headers = [
    'Date & Time',
    'Symbol',
    'Asset Class',
    'Direction',
    'Broker',
    'Account Name',
    'Entry Price',
    'Exit Price',
    'Stop Loss',
    'Take Profit',
    'Lot Size',
    'Risk Amount ($)',
    'Reward Amount ($)',
    'Risk:Reward',
    'Commission ($)',
    'Swap ($)',
    'Net PnL ($)',
    'Outcome',
    'Session',
    'Setup Tag',
    'Emotion',
    'Notes',
  ];

  const rows = trades.map((t) => [
    `"${t.entryTime}"`,
    `"${t.symbol}"`,
    `"${t.assetClass}"`,
    `"${t.direction.toUpperCase()}"`,
    `"${t.broker || 'MetaTrader 5'}"`,
    `"${t.accountName || 'Main Account'}"`,
    t.entryPrice,
    t.exitPrice || '',
    t.stopLoss || '',
    t.takeProfit || '',
    t.lotSize,
    t.riskAmount || '',
    t.rewardAmount || '',
    t.riskReward ? `1:${t.riskReward}` : '',
    t.fees || 0,
    t.swap || 0,
    t.pnl || 0,
    `"${t.outcome}"`,
    `"${t.session || ''}"`,
    `"${t.setupTag || ''}"`,
    `"${t.emotion || ''}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Trigger Print / Save as PDF for Trade Records
 */
export function exportTradesToPDF() {
  window.print();
}
