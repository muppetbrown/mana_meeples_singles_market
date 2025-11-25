import { config } from 'dotenv';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// ES module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from parent directory (scripts folder)
config({ path: join(__dirname, '..', '.env') });

// Retry helper
async function fetchWithRetry(url: string, headers: Record<string, string>, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return await response.json();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function analyzePriceStructure(setId: string) {
  console.log(`\n🔍 Analyzing Price Structure for Set: ${setId.toUpperCase()}`);
  console.log('═'.repeat(80));
  
  const headers = { 'X-Api-Key': process.env.POKEMON_TCG_API_KEY || '' };
  
  // Fetch all cards from the set
  console.log(`\n📥 Fetching cards from ${setId}...`);
  const url = `https://api.pokemontcg.io/v2/cards?q=set.id:${setId.toLowerCase()}&pageSize=250`;
  const data = await fetchWithRetry(url, headers);
  
  if (!data.data || data.data.length === 0) {
    console.log('❌ No cards found');
    return;
  }
  
  console.log(`✅ Found ${data.data.length} cards\n`);
  console.log('═'.repeat(80));
  
  // Analyze price variants across all cards
  const priceVariantStats: Record<string, number> = {};
  const cardsWithMultipleVariants: any[] = [];
  const detailedAnalysis: any[] = [];
  
  for (const card of data.data) {
    const analysis: any = {
      id: card.id,
      name: card.name,
      number: card.number,
      rarity: card.rarity,
      tcgplayerVariants: [],
      cardmarketVariants: [],
      hasMultipleVariants: false
    };
    
    // Analyze TCGPlayer prices
    if (card.tcgplayer?.prices) {
      const variants = Object.keys(card.tcgplayer.prices);
      analysis.tcgplayerVariants = variants;
      
      variants.forEach((variant: string) => {
        priceVariantStats[variant] = (priceVariantStats[variant] || 0) + 1;
      });
      
      if (variants.length > 1) {
        analysis.hasMultipleVariants = true;
        cardsWithMultipleVariants.push(card);
      }
    }
    
    // Analyze Cardmarket prices
    if (card.cardmarket?.prices) {
      const variants = Object.keys(card.cardmarket.prices);
      analysis.cardmarketVariants = variants;
    }
    
    detailedAnalysis.push(analysis);
  }
  
  // Display summary statistics
  console.log('\n📊 PRICE VARIANT STATISTICS');
  console.log('═'.repeat(80));
  console.log('\nTCGPlayer Price Variants Found:');
  Object.entries(priceVariantStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([variant, count]) => {
      const percentage = ((count / data.data.length) * 100).toFixed(1);
      console.log(`  • ${variant.padEnd(30)} ${count.toString().padStart(4)} cards (${percentage}%)`);
    });
  
  console.log(`\n🎴 Cards with Multiple Foil Variants: ${cardsWithMultipleVariants.length}`);
  
  // Show examples of cards with multiple variants
  if (cardsWithMultipleVariants.length > 0) {
    console.log('\n═'.repeat(80));
    console.log('📋 EXAMPLE CARDS WITH MULTIPLE FOIL VARIANTS');
    console.log('═'.repeat(80));
    
    const examplesToShow = Math.min(10, cardsWithMultipleVariants.length);
    
    for (let i = 0; i < examplesToShow; i++) {
      const card = cardsWithMultipleVariants[i];
      console.log(`\n🎴 ${card.name} (#${card.number}) - ${card.rarity || 'Unknown'}`);
      console.log(`   ID: ${card.id}`);
      
      if (card.tcgplayer?.prices) {
        console.log(`   TCGPlayer Variants:`);
        Object.entries(card.tcgplayer.prices).forEach(([variant, prices]: [string, any]) => {
          console.log(`     • ${variant}:`);
          if (prices.low) console.log(`       - Low:    $${prices.low}`);
          if (prices.mid) console.log(`       - Mid:    $${prices.mid}`);
          if (prices.high) console.log(`       - High:   $${prices.high}`);
          if (prices.market) console.log(`       - Market: $${prices.market}`);
          if (prices.directLow) console.log(`       - Direct: $${prices.directLow}`);
        });
      }
      
      if (card.cardmarket?.prices) {
        console.log(`   Cardmarket Prices:`);
        Object.entries(card.cardmarket.prices).forEach(([key, value]) => {
          console.log(`     • ${key}: $${value}`);
        });
      }
      
      // Check for any other distinguishing fields
      console.log(`   Other Fields:`);
      console.log(`     • Supertype: ${card.supertype}`);
      console.log(`     • Subtypes: ${card.subtypes?.join(', ') || 'None'}`);
      console.log(`     • Set: ${card.set?.name} (${card.set?.id})`);
      if (card.artist) console.log(`     • Artist: ${card.artist}`);
      if (card.flavorText) console.log(`     • Flavor: ${card.flavorText}`);
    }
  }
  
  // Save detailed analysis
  const outputPath = join(__dirname, 'data-exports', `price-analysis-${setId.toLowerCase()}.json`);
  const output = {
    setId: setId,
    totalCards: data.data.length,
    cardsWithMultipleVariants: cardsWithMultipleVariants.length,
    variantStatistics: priceVariantStats,
    detailedAnalysis: detailedAnalysis,
    exampleCards: cardsWithMultipleVariants.slice(0, 20).map(card => ({
      id: card.id,
      name: card.name,
      number: card.number,
      rarity: card.rarity,
      tcgplayerPrices: card.tcgplayer?.prices,
      cardmarketPrices: card.cardmarket?.prices,
      fullCardData: card // Include everything for deep inspection
    }))
  };
  
  try {
    writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n💾 Detailed analysis saved to: ${outputPath}`);
  } catch (err) {
    console.log(`\n⚠️  Could not save file (directory might not exist)`);
  }
  
  // Key findings summary
  console.log('\n═'.repeat(80));
  console.log('🔑 KEY FINDINGS');
  console.log('═'.repeat(80));
  console.log('\n📌 The Pokemon TCG API treats foil variants as:');
  console.log('   ✓ Different PRICE KEYS within the same card record');
  console.log('   ✗ NOT as separate card records with different IDs');
  console.log('\n📌 Common variant types:');
  console.log('   • normal - Regular non-foil version');
  console.log('   • holofoil - Standard holographic foil');
  console.log('   • reverseHolofoil - Reverse holo pattern');
  console.log('   • 1stEditionHolofoil - First edition foils');
  console.log('   • unlimitedHolofoil - Unlimited print holos');
  
  console.log('\n📌 For Special Treatments (Poke Ball, Master Ball):');
  console.log('   ⚠️  These may NOT be differentiated in the API data');
  console.log('   ⚠️  The API might group them under generic variant names');
  console.log('   ⚠️  You may need to track these separately in your system');
  
  console.log('\n💡 RECOMMENDATION:');
  console.log('   Store each price variant as a separate inventory item');
  console.log('   Create a foil_type field in your database:');
  console.log('     - normal');
  console.log('     - holofoil');
  console.log('     - reverse_holofoil');
  console.log('     - special (for manual entry of Poke Ball/Master Ball)');
  
  console.log('\n═'.repeat(80));
}

// Main execution
const setId = process.argv[2];

if (!setId || setId === 'help') {
  console.log('\n📖 Pokemon TCG Price Structure Analyzer');
  console.log('\n🔧 Usage:');
  console.log('   npx tsx scripts/imports/analyze-price-structure.ts <SET_ID>');
  console.log('\n📚 Examples:');
  console.log('   npx tsx scripts/imports/analyze-price-structure.ts rsv10pt5  (White Flare)');
  console.log('   npx tsx scripts/imports/analyze-price-structure.ts zsv10pt5  (Black Bolt)');
  console.log('   npx tsx scripts/imports/analyze-price-structure.ts sv3        (Obsidian Flames)');
  console.log('\n💡 This will show you:');
  console.log('   • How many price variants exist per card');
  console.log('   • What the variant names are (normal, holofoil, etc.)');
  console.log('   • Example cards with detailed pricing breakdown');
  console.log('   • Whether special treatments are differentiated\n');
  process.exit(0);
}

analyzePriceStructure(setId)
  .then(() => {
    console.log('\n✅ Analysis complete!\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Analysis failed:', err.message);
    process.exit(1);
  });
