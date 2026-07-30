const { pool, query } = require('../config/db');
const bcrypt = require('bcryptjs');

async function seed() {
  if (!pool) {
    console.log('[Seed] PostgreSQL pool not configured. Skipping migration.');
    return;
  }

  try {
    console.log('🌱 Starting Database Migration & Seed Script...');

    // 1. Create Default Trader User
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('TraderPassword123!', salt);

    const userRes = await query(
      `INSERT INTO users (email, password_hash, display_name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING id;`,
      ['trader@example.com', passwordHash, 'Master Trader', 'trader']
    );

    const userId = userRes.rows[0]?.id || 'user-1';

    // 2. Insert Sample Executions
    await query(
      `INSERT INTO trades (user_id, symbol, asset_class, direction, entry_price, exit_price, lot_size, stop_loss, take_profit, pnl, outcome, session, setup_tag, entry_time)
       VALUES 
       ($1, 'XAU/USD', 'commodities', 'long', 2385.50, 2398.00, 2.0, 2380.00, 2405.00, 2500.00, 'win', 'london', 'Liquidity Grab + FVG', NOW() - INTERVAL '2 days'),
       ($1, 'EUR/USD', 'forex', 'short', 1.0890, 1.0840, 3.0, 1.0910, 1.0820, 1500.00, 'win', 'new_york', 'Order Block Retest', NOW() - INTERVAL '1 day')
       ON CONFLICT DO NOTHING;`,
      [userId]
    );

    console.log('✅ Migration & Seed Script completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Error:', error);
    process.exit(1);
  }
}

seed();
