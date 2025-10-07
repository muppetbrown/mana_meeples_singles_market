require('dotenv').config();

console.log('='.repeat(70));
console.log('🔍 AUTHENTICATION DEBUG');
console.log('='.repeat(70));

console.log('\n📁 Environment Variables:');
console.log('ADMIN_USERNAME:', process.env.ADMIN_USERNAME || '❌ NOT SET');
console.log('ADMIN_PASSWORD_HASH:', process.env.ADMIN_PASSWORD_HASH ? 
  `${process.env.ADMIN_PASSWORD_HASH.substring(0, 20)}... (${process.env.ADMIN_PASSWORD_HASH.length} chars)` : 
  '❌ NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ SET' : '❌ NOT SET');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ SET' : '❌ NOT SET');

console.log('\n🔐 Hash Details:');
if (process.env.ADMIN_PASSWORD_HASH) {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  console.log('Starts with $2b$10$:', hash.startsWith('$2b$10$') ? '✅ YES' : '❌ NO');
  console.log('Full hash length:', hash.length, hash.length === 60 ? '✅ CORRECT' : '⚠️  Should be 60');
  console.log('Has spaces:', /\s/.test(hash) ? '❌ YES (BAD)' : '✅ NO (GOOD)');
  console.log('Has quotes:', /["']/.test(hash) ? '❌ YES (BAD)' : '✅ NO (GOOD)');
}

console.log('\n' + '='.repeat(70));

// Now test a password
const readline = require('readline');
const bcrypt = require('bcrypt');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\n🔑 Enter the password you want to test: ', async (password) => {
  try {
    if (!process.env.ADMIN_PASSWORD_HASH) {
      console.log('❌ ERROR: ADMIN_PASSWORD_HASH is not set in .env');
      rl.close();
      process.exit(1);
    }

    console.log('\n⏳ Testing password...\n');

    const isMatch = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);

    console.log('='.repeat(70));
    if (isMatch) {
      console.log('✅ SUCCESS! Password matches!');
      console.log('\nYou should be able to login with:');
      console.log(`   Username: ${process.env.ADMIN_USERNAME}`);
      console.log(`   Password: ${password}`);
    } else {
      console.log('❌ FAILED! Password does NOT match!');
      console.log('\n🔧 Possible issues:');
      console.log('   1. Wrong password entered');
      console.log('   2. Hash in .env is from a different password');
      console.log('   3. Hash was not copied correctly');
      console.log('\n💡 Solution: Run "node scripts/generate-admin-hash.js" again');
    }
    console.log('='.repeat(70));

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
});