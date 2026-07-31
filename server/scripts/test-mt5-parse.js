const { parseStatementFile } = require('../utils/tradeParsers');

const sampleMt5Html = `
<html>
<body>
<h2>Positions</h2>
<table>
  <tr>
    <th>Time</th>
    <th>Position</th>
    <th>Symbol</th>
    <th>Type</th>
    <th>Volume</th>
    <th>Price</th>
    <th>S/L</th>
    <th>T/P</th>
    <th>Time</th>
    <th>Price</th>
    <th>Commission</th>
    <th>Swap</th>
    <th>Profit</th>
  </tr>
  <tr>
    <td>2026.07.25 10:00:00</td>
    <td>100101</td>
    <td>XAUUSD</td>
    <td>buy</td>
    <td>1.50</td>
    <td>2380.00</td>
    <td>2370.00</td>
    <td>2400.00</td>
    <td>2026.07.25 14:30:00</td>
    <td>2395.00</td>
    <td>-10.00</td>
    <td>0.00</td>
    <td>2250.00</td>
  </tr>
  <tr>
    <td>2026.07.26 09:00:00</td>
    <td>100102</td>
    <td>EURUSD</td>
    <td>sell</td>
    <td>2.00</td>
    <td>1.0890</td>
    <td>1.0920</td>
    <td>1.0820</td>
    <td>2026.07.26 12:15:00</td>
    <td>1.0840</td>
    <td>-15.00</td>
    <td>0.00</td>
    <td>1000.00</td>
  </tr>
</table>
<h2>Orders</h2>
<table>
  <tr><th>Time</th><th>Order</th><th>Symbol</th><th>Type</th><th>Volume</th></tr>
  <tr><td>2026.07.27 12:00:00</td><td>5001</td><td>GBPUSD</td><td>buy limit</td><td>1.00</td></tr>
</table>
</body>
</html>
`;

try {
  const result = parseStatementFile(Buffer.from(sampleMt5Html), 'GoatFunded_MT5_Report.html');
  console.log('MT5 Parse Result:', JSON.stringify(result, null, 2));
} catch (err) {
  console.error('MT5 Parse Failed:', err.message, err.stack);
}
