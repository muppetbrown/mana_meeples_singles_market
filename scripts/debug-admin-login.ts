import { config } from 'dotenv';
import bcrypt from 'bcrypt';
import readline from 'readline';

config();

async function debugAdminLogin() {
  const username = process.env.ADMIN_USERNAME;
  const storedHash = process.env.ADMIN_PASSWORD_HASH;
  const jwtSecret = process.env.JWT_SECRET;

  console.log('🔍 ADMIN LOGIN DEBUG TOOL');
  console.log('='.repeat(60));

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`  ADMIN_USERNAME: ${username || '❌ NOT SET'}`);
  console.log(`  ADMIN_PASSWORD_HASH: ${storedHash ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`  JWT_SECRET: ${jwtSecret ? '✅ SET' : '❌ NOT SET'}`);

  if (storedHash) {
    console.log('\n🔐 Password Hash Analysis:');
    console.log(`  Length: ${storedHash.length} chars`);
    console.log(`  Format: ${storedHash.startsWith('$2b$10$') ? '✅ Valid bcrypt' : '❌ Invalid format'}`);
    console.log(`  Preview: ${storedHash.substring(0, 20)}...`);
  }

  if (!username || !storedHash) {
    console.log('\n❌ SETUP REQUIRED:');
    console.log('1. Run: node scripts/generate-admin-hash.ts');
    console.log('2. Copy the generated values to your .env file');
    console.log('3. Restart your server');
    console.log('4. Run this script again to test');
    process.exit(1);
  }

  console.log('\n='.repeat(60));

  // Test password
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('🔑 Enter password to test: ', async (password: string) => {
    try {
      console.log('\n⏳ Testing password...\n');

      const isMatch = await bcrypt.compare(password, storedHash);

      if (isMatch) {
        console.log('✅ SUCCESS! Login credentials are correct.');
        console.log('✅ You can login with:');
        console.log(`   👤 Username: ${username}`);
        console.log(`   🔒 Password: ${password}`);
        console.log('\n💡 If you still can\'t login, check:');
        console.log('   • Server logs for detailed error messages');
        console.log('   • CORS/network connectivity');
        console.log('   • JWT_SECRET is set properly');
      } else {
        console.log('❌ FAILED! Password does NOT match.');
        console.log('\n🔧 To fix this:');
        console.log('1. Run: node scripts/generate-admin-hash.ts');
        console.log('2. Enter your desired password');
        console.log('3. Copy the hash to your .env ADMIN_PASSWORD_HASH');
        console.log('4. Restart your server');
        console.log('\n💡 Or verify you\'re using the exact password that was hashed');
      }

      rl.close();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Error testing password:', message);
      rl.close();
    }
  });
}

debugAdminLogin();