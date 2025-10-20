// scripts/test-db-connection.ts
/**
 * Simple database connection test
 * Usage: pnpm tsx scripts/test-db-connection.ts
 */

console.log('🚀 Starting connection test...');

try {
  console.log('📦 Importing dotenv...');
  await import('dotenv/config');
  console.log('✅ dotenv imported');

  console.log('📦 Importing pg...');
  const { Pool } = await import('pg');
  console.log('✅ pg imported');

  console.log('\n🔍 Checking DATABASE_URL...');
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not found in environment');
    console.error('Current working directory:', process.cwd());
    console.error('\nAll env vars starting with DB:', 
      Object.keys(process.env).filter(k => k.startsWith('DB'))
    );
    process.exit(1);
  }
  
  console.log('✅ DATABASE_URL found');
  console.log('   Length:', dbUrl.length, 'characters');
  console.log('   Starts with:', dbUrl.substring(0, 15) + '...');

  console.log('\n🔌 Creating connection pool...');
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('.render.com') || dbUrl.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
    max: 5,
    connectionTimeoutMillis: 10000,
  });
  console.log('✅ Pool created');

  console.log('\n🧪 Testing connection...');
  const result = await pool.query('SELECT NOW() as time, current_database() as db');
  console.log('✅ Connection successful!');
  console.log('   Database:', result.rows[0].db);
  console.log('   Server time:', result.rows[0].time);

  console.log('\n📊 Checking tables...');
  const tables = await pool.query(
    `SELECT table_name FROM information_schema.tables 
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );
  console.log(`✅ Found ${tables.rows.length} tables:`);
  tables.rows.forEach((row: any) => {
    console.log('   -', row.table_name);
  });

  await pool.end();
  console.log('\n✅ Test completed successfully!');

} catch (error) {
  console.error('\n❌ Error occurred:');
  console.error(error);
  process.exit(1);
}