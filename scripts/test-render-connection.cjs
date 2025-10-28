// scripts/test-render-connection.cjs
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../apps/api/.env.local') });

async function testConnection() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found!');
    console.error('   Make sure apps/api/.env.local exists and has DATABASE_URL set.\n');
    process.exit(1);
  }

  const url = new URL(process.env.DATABASE_URL);
  console.log('🔌 Testing connection to Render database...');
  console.log(`   Host: ${url.hostname}`);
  console.log(`   Database: ${url.pathname.substring(1)}`);
  console.log(`   User: ${url.username}\n`);

  // ⚠️ CRITICAL: Render requires SSL with rejectUnauthorized: false
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false  // Required for Render
    }
  });

  try {
    console.log('🔐 Connecting with SSL enabled...\n');
    
    const result = await pool.query(`
      SELECT 
        NOW() as server_time,
        version() as pg_version,
        current_database() as database_name,
        current_user as user_name
    `);

    const row = result.rows[0];
    
    console.log('✅ Connection successful!\n');
    console.log('📊 Database Info:');
    console.log(`   Server time: ${row.server_time}`);
    console.log(`   PostgreSQL: ${row.pg_version.split(' ')[1]}`);
    console.log(`   Database: ${row.database_name}`);
    console.log(`   User: ${row.user_name}\n`);

    const tablesResult = await pool.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log(`   Tables: ${tablesResult.rows[0].table_count} tables found`);

    const tablesList = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name 
      LIMIT 10
    `);
    
    if (tablesList.rows.length > 0) {
      console.log('   Sample tables:', tablesList.rows.map(r => r.table_name).join(', '));
    }

    console.log('\n🎉 Database is ready for development!');

  } catch (err) {
    console.error('❌ Connection failed!\n');
    console.error('Error:', err.message);
    console.error('Error code:', err.code || 'N/A');
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Verify Render database is running (check dashboard)');
    console.error('   2. Check if DATABASE_URL is correct');
    console.error('   3. Try using the EXTERNAL connection URL from Render');
    console.error('   4. Check if your network/firewall allows outbound connections');
    
    if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
      console.error('   5. Connection issue - might be network or Render is down');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();