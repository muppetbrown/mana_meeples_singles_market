async function listPokemonSets() {
  const response = await fetch('https://api.pokemontcg.io/v2/sets');
  const data = await response.json();
  
  console.log('\n📚 POKEMON TCG SETS\n');
  console.log('━'.repeat(80));
  
  // Group by series
  interface PokemonSet {
    id: string;
    name: string;
    series: string;
    releaseDate: string;
  }

  const grouped: Record<string, PokemonSet[]> = {};
  data.data.forEach((set: PokemonSet) => {
    if (!grouped[set.series]) {
      grouped[set.series] = [];
    }
    grouped[set.series].push(set);
  });

  // Print by series
  Object.keys(grouped).reverse().forEach(series => {
    console.log(`\n${series}:`);
    grouped[series].forEach((set: PokemonSet) => {
      console.log(`  ${set.name.padEnd(40)} | ID: ${set.id.padEnd(15)} | ${set.releaseDate}`);
    });
  });
  
  console.log('\n' + '━'.repeat(80));
}

listPokemonSets();