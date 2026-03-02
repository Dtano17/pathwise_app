const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;

async function testSearch(query, type = 'movie') {
  const endpoint = type === 'movie' ? 'search/movie' : 'search/tv';
  const url = `https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US`;

  console.log(`\n=== Searching ${type.toUpperCase()}: "${query}" ===`);

  const response = await fetch(url);
  const data = await response.json();

  if (data.results && data.results.length > 0) {
    console.log(`Found ${data.results.length} results. Top 5:`);
    data.results.slice(0, 5).forEach((r, i) => {
      const title = type === 'movie' ? r.title : r.name;
      const year = type === 'movie' ? r.release_date?.substring(0,4) : r.first_air_date?.substring(0,4);
      console.log(`  ${i+1}. "${title}" (${year || '?'}) - pop: ${r.popularity?.toFixed(1)}, votes: ${r.vote_count}, poster: ${r.poster_path ? 'YES' : 'NO'}`);
    });
    return data.results[0];
  } else {
    console.log('No results found');
    return null;
  }
}

async function getImages(id, type = 'movie') {
  const url = `https://api.themoviedb.org/3/${type}/${id}/images?api_key=${TMDB_API_KEY}&include_image_language=en,null`;
  const response = await fetch(url);
  const data = await response.json();

  console.log(`\n  Images for ${type} ${id}:`);
  console.log(`    Backdrops: ${data.backdrops?.length || 0}`);
  console.log(`    Posters: ${data.posters?.length || 0}`);

  if (data.posters?.length > 0) {
    const englishPoster = data.posters.find(p => p.iso_639_1 === 'en');
    const neutralPoster = data.posters.find(p => p.iso_639_1 === null);
    console.log(`    English poster: ${englishPoster ? 'YES' : 'NO'}`);
    console.log(`    Neutral poster: ${neutralPoster ? 'YES' : 'NO'}`);
    console.log(`    First poster lang: ${data.posters[0]?.iso_639_1 || 'null'}`);
  }
}

async function main() {
  console.log('TMDB API Key:', TMDB_API_KEY ? 'SET' : 'MISSING');

  // Test Spider-Man queries
  console.log('\n\n========== SPIDER-MAN TESTS ==========');
  const spiderMan = await testSearch('Spider-Man: Brand New Day', 'movie');
  await testSearch('Spider-Man', 'movie');
  const spider = await testSearch('Spider', 'movie');
  if (spider) await getImages(spider.id, 'movie');

  // Test The Bear
  console.log('\n\n========== THE BEAR TESTS ==========');
  const theBear = await testSearch('The Bear', 'tv');
  if (theBear) await getImages(theBear.id, 'tv');
  await testSearch('The Bear Season 5', 'tv');
  await testSearch('Bear', 'tv');

  // Test The Secret Agent
  console.log('\n\n========== THE SECRET AGENT TESTS ==========');
  const secretAgent = await testSearch('The Secret Agent', 'movie');
  if (secretAgent) await getImages(secretAgent.id, 'movie');
  await testSearch('The Secret Agent 2025', 'movie');
  await testSearch('O Agente Secreto', 'movie');
}

main().catch(console.error);
