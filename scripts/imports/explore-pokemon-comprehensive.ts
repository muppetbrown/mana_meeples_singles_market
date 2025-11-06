import { config } from 'dotenv';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// ES module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from parent directory (scripts folder)
// This script is in scripts/imports/, .env is in scripts/
config({ path: join(__dirname, '..', '.env') });

// Retry helper for API calls with longer timeout
async function fetchWithRetry(url: string, headers: Record<string, string>, maxRetries = 5, delay = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`   ⏰ Request timeout after 90 seconds...`);
        controller.abort();
      }, 90000); // Increased to 90 seconds

      const response = await fetch(url, {
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 504 || response.status === 503 || response.status === 502 || response.status === 429) {
          if (attempt < maxRetries) {
            console.log(`   ⏳ Server error (${response.status}), waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
            continue;
          }
        }
        throw new Error(`Pokemon TCG API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (err: unknown) {
      if (attempt === maxRetries) {
        console.log(`   ❌ Failed after ${maxRetries} attempts`);
        throw err;
      }
      
      const message = err instanceof Error ? err.message : String(err);
      
      // Special handling for abort errors
      if (message.includes('aborted') || message.includes('abort')) {
        console.log(`   ⚠️  Request timed out, attempt ${attempt}/${maxRetries}`);
      } else {
        console.log(`   ⚠️  ${message}`);
      }
      
      console.log(`   🔄 Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}

// Rate limiter - Being very conservative with Pokemon TCG API
// Using 2 seconds between page requests to avoid any issues
async function rateLimitedDelay(delayMs: number = 2000) {
  console.log(`   ⏱️  Waiting ${delayMs}ms (rate limiting)...`);
  await new Promise(resolve => setTimeout(resolve, delayMs));
}

// Get all sets from a series/era
async function getSetsBySeries(series: string, headers: Record<string, string>) {
  console.log(`\n🔍 Finding sets in series: ${series}`);
  
  // Fetch all sets (the API returns them all, it's not a huge dataset)
  console.log(`   📡 Fetching all sets from API...`);
  const allSetsUrl = 'https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate';
  const data = await fetchWithRetry(allSetsUrl, headers);
  
  if (!data.data || data.data.length === 0) {
    console.log(`   ❌ Could not fetch sets from API`);
    return [];
  }
  
  console.log(`   ℹ️  Retrieved ${data.data.length} total sets from API`);
  
  // Filter by series name (case-insensitive)
  const filteredSets = data.data.filter((set: any) => {
    const setSeriesLower = (set.series || '').toLowerCase();
    const searchSeriesLower = series.toLowerCase();
    return setSeriesLower === searchSeriesLower || setSeriesLower.includes(searchSeriesLower);
  });
  
  if (filteredSets.length === 0) {
    console.log(`   ⚠️  No sets found matching series: "${series}"`);
    console.log(`\n   💡 Available series:`);
    const uniqueSeries: string[] = [...new Set(data.data.map((s: any) => s.series).filter(Boolean))] as string[];
    uniqueSeries.slice(0, 10).forEach((s: string) => console.log(`      • ${s}`));
    return [];
  }
  
  console.log(`   ✅ Found ${filteredSets.length} sets in "${series}"`);
  return filteredSets;
}

// Extract the specific fields
function extractCardData(card: any) {
  return {
    // Core identification
    id: card.id,
    name: card.name,
    number: card.number,
    
    // Type information
    supertype: card.supertype,
    subtypes: card.subtypes || [],
    types: card.types || [],
    
    // Set information
    set: {
      id: card.set?.id,
      name: card.set?.name,
      series: card.set?.series,
      releaseDate: card.set?.releaseDate,
      total: card.set?.total,
      printedTotal: card.set?.printedTotal
    },
    
    // Images
    images: {
      small: card.images?.small,
      large: card.images?.large
    },
    
    // Pricing data (the key part!)
    tcgplayer: card.tcgplayer ? {
      url: card.tcgplayer.url,
      updatedAt: card.tcgplayer.updatedAt,
      prices: card.tcgplayer.prices
    } : null,
    
    cardmarket: card.cardmarket ? {
      url: card.cardmarket.url,
      updatedAt: card.cardmarket.updatedAt,
      prices: card.cardmarket.prices
    } : null,
    
    // Additional useful data
    rarity: card.rarity,
    artist: card.artist,
    hp: card.hp,
    
    // Game data (useful for filtering/categorization)
    attacks: card.attacks?.map((a: any) => ({
      name: a.name,
      cost: a.cost,
      damage: a.damage,
      text: a.text
    })) || [],
    
    abilities: card.abilities?.map((a: any) => ({
      name: a.name,
      text: a.text,
      type: a.type
    })) || [],
    
    rules: card.rules || [],
    
    // Market data flags
    nationalPokedexNumbers: card.nationalPokedexNumbers || [],
    regulationMark: card.regulationMark,
    legalities: card.legalities
  };
}

// Fetch all cards from a specific set
async function fetchSetCards(setId: string, setName: string, headers: Record<string, string>, delayMs: number = 2000) {
  console.log(`\n📦 Fetching cards from: ${setName} (${setId.toUpperCase()})`);
  
  let allCards: any[] = [];
  let page = 1;
  let totalPages = 1;
  
  while (page <= totalPages) {
    console.log(`   📄 Page ${page}/${totalPages}...`);
    
    try {
      const url = `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&page=${page}&pageSize=250`;
      const data = await fetchWithRetry(url, headers);
      
      if (!data.data || data.data.length === 0) {
        if (page === 1) {
          console.log(`   ⚠️  No cards found for ${setId}`);
        }
        break;
      }
      
      allCards = allCards.concat(data.data);
      totalPages = data.totalPages || 1;
      console.log(`   ✅ Retrieved ${data.data.length} cards (total so far: ${allCards.length})`);
      
      page++;
      
      // Rate limiting between pages
      if (page <= totalPages) {
        await rateLimitedDelay(delayMs);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`   ❌ Failed on page ${page}: ${message}`);
      
      if (allCards.length > 0) {
        console.log(`   ⚠️  Continuing with ${allCards.length} cards retrieved so far`);
        break;
      } else {
        throw err;
      }
    }
  }
  
  return allCards;
}

// Main exploration function
async function exploreEra(mode: string, target?: string) {
  console.log('\n🎴 Pokemon TCG API Comprehensive Data Explorer');
  console.log('═'.repeat(80));
  
  const headers = {
    'X-Api-Key': process.env.POKEMON_TCG_API_KEY || ''
  };
  
  // Ensure output directory exists
  try {
    mkdirSync('C:/Git_Repos/mana_meeples_singles_market/scripts/data-exports', { recursive: true });
  } catch (err) {
    // Directory might already exist
  }
  
  let allSets: any[] = [];
  let allExtractedCards: any[] = [];
  
  // Determine what to fetch
  if (mode === 'era') {
    // Fetch all sets from an era/series
    const series = target || 'Scarlet & Violet';
    console.log(`\n🎯 Mode: Entire Era`);
    console.log(`📚 Series: ${series}`);
    
    allSets = await getSetsBySeries(series, headers);
    
    if (allSets.length === 0) {
      console.log('\n❌ No sets found. Try one of these series names:');
      console.log('   • Scarlet & Violet');
      console.log('   • Sword & Shield');
      console.log('   • Sun & Moon');
      console.log('   • XY');
      return;
    }
    
  } else if (mode === 'set') {
    // Fetch single set
    const setId = target!;
    console.log(`\n🎯 Mode: Single Set`);
    console.log(`📦 Set ID: ${setId.toUpperCase()}`);
    
    // Get set info
    try {
      const setData = await fetchWithRetry(
        `https://api.pokemontcg.io/v2/sets/${setId.toLowerCase()}`,
        headers
      );
      allSets = [setData.data];
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`❌ Could not find set: ${message}`);
      return;
    }
  } else if (mode === 'sets') {
    // Fetch multiple specific sets
    const setIds = target!.split(',').map(s => s.trim());
    console.log(`\n🎯 Mode: Multiple Sets`);
    console.log(`📦 Sets: ${setIds.join(', ')}`);
    
    for (const setId of setIds) {
      try {
        const setData = await fetchWithRetry(
          `https://api.pokemontcg.io/v2/sets/${setId.toLowerCase()}`,
          headers
        );
        allSets.push(setData.data);
        await rateLimitedDelay(500); // Small delay between set info requests
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(`⚠️  Could not find set ${setId}: ${message}`);
      }
    }
  }
  
  console.log('\n═'.repeat(80));
  console.log(`📊 Found ${allSets.length} set(s) to process`);
  console.log('═'.repeat(80));
  
  // Display sets that will be processed
  console.log('\n📋 Sets to fetch:');
  for (const set of allSets) {
    console.log(`   • ${set.name} (${set.id}) - ${set.total || '?'} cards - Released: ${set.releaseDate}`);
  }
  
  const totalExpectedCards = allSets.reduce((sum, set) => sum + (set.total || 0), 0);
  console.log(`\n📈 Expected total cards: ~${totalExpectedCards}`);
  
  // Estimate time
  const estimatedRequests = allSets.length * 2; // Rough estimate (most sets fit in 1-2 pages)
  const estimatedMinutes = Math.ceil((estimatedRequests * 1.5) / 60); // 1.5 seconds per request average
  console.log(`⏱️  Estimated time: ~${estimatedMinutes} minute(s)`);
  
  console.log('\n═'.repeat(80));
  console.log('🚀 Starting fetch process...\n');
  
  // Fetch cards from each set
  let setNumber = 1;
  for (const set of allSets) {
    console.log(`\n[${ setNumber}/${allSets.length}] Processing: ${set.name}`);
    console.log('─'.repeat(80));
    
    try {
      const cards = await fetchSetCards(set.id, set.name, headers, 1000);
      
      if (cards.length > 0) {
        const extractedCards = cards.map(extractCardData);
        allExtractedCards.push(...extractedCards);
        
        console.log(`   ✅ Extracted ${extractedCards.length} cards from ${set.name}`);
        
        // Save individual set file
        const setFilename = `data-exports/pokemon-${set.id}-${set.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
        const setPath = `C:/Git_Repos/mana_meeples_singles_market/scripts/${setFilename}`;
        writeFileSync(setPath, JSON.stringify(extractedCards, null, 2));
        console.log(`   💾 Saved to: ${setFilename}`);
      }
      
      // Delay between sets to be respectful
      if (setNumber < allSets.length) {
        await rateLimitedDelay(3000); // 3 second pause between sets
      }
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`   ❌ Failed to fetch ${set.name}: ${message}`);
    }
    
    setNumber++;
  }
  
  // Save combined file
  if (allExtractedCards.length > 0) {
    console.log('\n═'.repeat(80));
    console.log('💾 Saving combined export...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const combinedFilename = mode === 'era' 
      ? `data-exports/pokemon-era-${(target || 'scarlet-violet').replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${timestamp}.json`
      : `data-exports/pokemon-combined-${timestamp}.json`;
    
    const combinedPath = `C:/Git_Repos/mana_meeples_singles_market/scripts/${combinedFilename}`;
    
    // Create summary object
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        mode: mode,
        target: target,
        totalSets: allSets.length,
        totalCards: allExtractedCards.length,
        sets: allSets.map(s => ({
          id: s.id,
          name: s.name,
          series: s.series,
          releaseDate: s.releaseDate,
          total: s.total,
          cardsInExport: allExtractedCards.filter(c => c.set.id === s.id).length
        }))
      },
      cards: allExtractedCards
    };
    
    writeFileSync(combinedPath, JSON.stringify(exportData, null, 2));
    console.log(`✅ Combined export saved to: ${combinedFilename}`);
  }
  
  // Final summary
  console.log('\n═'.repeat(80));
  console.log('📊 EXPORT SUMMARY');
  console.log('═'.repeat(80));
  console.log(`✅ Sets processed:        ${allSets.length}`);
  console.log(`✅ Total cards exported:  ${allExtractedCards.length}`);
  console.log(`💾 Individual set files:  ${allSets.length}`);
  console.log(`💾 Combined export:       1 file`);
  
  // Price coverage analysis
  const cardsWithTCGPlayer = allExtractedCards.filter(c => c.tcgplayer !== null).length;
  const cardsWithCardmarket = allExtractedCards.filter(c => c.cardmarket !== null).length;
  const tcgPlayerPercentage = ((cardsWithTCGPlayer / allExtractedCards.length) * 100).toFixed(1);
  const cardmarketPercentage = ((cardsWithCardmarket / allExtractedCards.length) * 100).toFixed(1);
  
  console.log(`\n💰 Pricing Coverage:`);
  console.log(`   TCGPlayer:   ${cardsWithTCGPlayer}/${allExtractedCards.length} (${tcgPlayerPercentage}%)`);
  console.log(`   Cardmarket:  ${cardsWithCardmarket}/${allExtractedCards.length} (${cardmarketPercentage}%)`);
  
  // Rarity breakdown
  const rarityCount: Record<string, number> = {};
  allExtractedCards.forEach(card => {
    const rarity = card.rarity || 'Unknown';
    rarityCount[rarity] = (rarityCount[rarity] || 0) + 1;
  });
  
  console.log(`\n🎴 Rarity Breakdown:`);
  Object.entries(rarityCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([rarity, count]) => {
      console.log(`   ${rarity.padEnd(25)} ${count}`);
    });
  
  console.log('═'.repeat(80));
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === 'help') {
  console.log('\n📖 Pokemon TCG API Comprehensive Data Explorer');
  console.log('\n🎯 MODES:\n');
  
  console.log('1️⃣  Entire Era (all sets from a series)');
  console.log('   node scripts/explore-pokemon-comprehensive.js era "Scarlet & Violet"');
  console.log('   node scripts/explore-pokemon-comprehensive.js era "Sword & Shield"');
  console.log('   node scripts/explore-pokemon-comprehensive.js era "Sun & Moon"\n');
  
  console.log('2️⃣  Single Set');
  console.log('   node scripts/explore-pokemon-comprehensive.js set sv3');
  console.log('   node scripts/explore-pokemon-comprehensive.js set sv9\n');
  
  console.log('3️⃣  Multiple Specific Sets');
  console.log('   node scripts/explore-pokemon-comprehensive.js sets sv3,sv4,sv5');
  console.log('   node scripts/explore-pokemon-comprehensive.js sets sv1,sv2\n');
  
  console.log('⏱️  Rate Limiting: 1 second between page requests, 2 seconds between sets');
  console.log('💾 Output: Individual JSON files per set + combined export');
  console.log('📊 Includes: Full pricing data, rarity analysis, coverage statistics\n');
  
  process.exit(0);
}

const mode = args[0];
const target = args[1];

if (mode === 'era') {
  exploreEra('era', target || 'Scarlet & Violet')
    .then(() => {
      console.log('\n✅ Export complete!\n');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Export failed:', err.message);
      process.exit(1);
    });
} else if (mode === 'set' && target) {
  exploreEra('set', target)
    .then(() => {
      console.log('\n✅ Export complete!\n');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Export failed:', err.message);
      process.exit(1);
    });
} else if (mode === 'sets' && target) {
  exploreEra('sets', target)
    .then(() => {
      console.log('\n✅ Export complete!\n');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Export failed:', err.message);
      process.exit(1);
    });
} else {
  console.error('\n❌ Invalid usage. Run with "help" for instructions.\n');
  process.exit(1);
}