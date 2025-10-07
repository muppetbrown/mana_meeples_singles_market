const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function generateHash() {
  rl.question('Enter admin password (min 10 characters): ', async (password) => {
    if (password.length < 10) {
      console.error('❌ Password must be at least 12 characters long');
      process.exit(1);
    }

    try {
      const saltRounds = 10;
      const hash = await bcrypt.hash(password, saltRounds);
      
      console.log('\n✅ Password hash generated successfully!');
      console.log('\nAdd these to your .env file:');
      console.log('━'.repeat(60));
      console.log(`ADMIN_USERNAME=admin`);
      console.log(`ADMIN_PASSWORD_HASH=${hash}`);
      console.log('━'.repeat(60));
      console.log('\n⚠️  IMPORTANT: Keep this hash secret!');
      console.log('⚠️  Never commit .env to version control!');
      
      rl.close();
      process.exit(0);
    } catch (error) {
      console.error('❌ Error generating hash:', error);
      rl.close();
      process.exit(1);
    }
  });
}

generateHash();