async function listPokemonSets() {
  const response = await fetch('https://api.pokemontcg.io/v2/sets');
  const data = await response.json();
  
  console.log('\n📚 POKEMON TCG SETS\n');
  console.log('━'.repeat(80));
  
  // Group by series
  const grouped = {};
  data.data.forEach((set: any) => {
    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    if (!grouped[set.series]) {
      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      grouped[set.series] = [];
    }
    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    grouped[set.series].push(set);
  });
  
  // Print by series
  Object.keys(grouped).reverse().forEach(series => {
    console.log(`\n${series}:`);
    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    grouped[series].forEach((set: any) => {
      console.log(`  ${set.name.padEnd(40)} | ID: ${set.id.padEnd(15)} | ${set.releaseDate}`);
    });
  });
  
  console.log('\n' + '━'.repeat(80));
}

listPokemonSets();