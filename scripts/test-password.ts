import { config } from 'dotenv';
import bcrypt from 'bcrypt';
import readline from 'readline';

config();

async function testPassword() {
  const username = process.env.ADMIN_USERNAME;
  const storedHash = process.env.ADMIN_PASSWORD_HASH;
  
  console.log('='.repeat(60));
  console.log('🔍 Testing Admin Credentials');
  console.log('='.repeat(60));
  console.log('Username from .env:', username);
  console.log('Hash from .env:', storedHash ? storedHash.substring(0, 20) + '...' : 'NOT SET');
  console.log('Hash length:', storedHash ? storedHash.length : 0);
  console.log('Hash starts with $2b$10$:', storedHash?.startsWith('$2b$10$') ? '✅ YES' : '❌ NO');
  console.log('='.repeat(60));
  
  // Test password
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Enter the password you want to test: ', async (password: any) => {
    try {
      console.log('\n⏳ Comparing password with stored hash...\n');
      
      const isMatch = await bcrypt.compare(password, storedHash);
      
      if (isMatch) {
        console.log('✅ SUCCESS! Password matches the stored hash.');
        console.log('✅ You should be able to login with:');
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}`);
      } else {
        console.log('❌ FAILED! Password does NOT match the stored hash.');
        console.log('❌ This means either:');
        console.log('   1. You entered the wrong password');
        console.log('   2. The hash in .env is incorrect');
        console.log('   3. You need to regenerate the hash');
      }
      
      rl.close();
      process.exit(0);
    } catch (error) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      console.error('❌ Error testing password:', error.message);
      rl.close();
      process.exit(1);
    }
  });
}

testPassword();