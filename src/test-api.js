import dotenv from 'dotenv';
import { testApiConnection, getVideoDetails, getVideoComments } from './youtube-api.js';

dotenv.config();

async function test() {
  console.log('🧪 YouTube API Test Suite\n');
  console.log('═'.repeat(50));
  
  // Test 1: API-anslutning
  console.log('\n📡 Test 1: API-anslutning');
  const connected = await testApiConnection();
  if (!connected) {
    console.error('❌ API-anslutning misslyckades. Kontrollera din YOUTUBE_API_KEY i .env-filen');
    process.exit(1);
  }
  
  // Test 2: Hämta videodetaljer
  console.log('\n🎬 Test 2: Hämta videodetaljer');
  const testVideoId = 'dQw4w9WgXcQ'; // Rick Astley - Never Gonna Give You Up
  
  try {
    const videoDetails = await getVideoDetails(testVideoId);
    console.log('✅ Videodetaljer hämtade:');
    console.log(`   Titel: ${videoDetails.title}`);
    console.log(`   Kanal: ${videoDetails.channelTitle}`);
    console.log(`   Visningar: ${videoDetails.viewCount.toLocaleString()}`);
    console.log(`   Kommentarer: ${videoDetails.commentCount.toLocaleString()}`);
  } catch (error) {
    console.error('❌ Kunde inte hämta videodetaljer:', error.message);
  }
  
  // Test 3: Hämta några kommentarer
  console.log('\n💬 Test 3: Hämta kommentarer (max 10)');
  
  try {
    const comments = await getVideoComments(testVideoId, 10);
    console.log(`✅ ${comments.length} kommentarer hämtade`);
    
    if (comments.length > 0) {
      console.log('\n   Exempel på kommentarer:');
      comments.slice(0, 3).forEach((comment, i) => {
        const preview = comment.commentText.substring(0, 100);
        console.log(`   ${i + 1}. "${preview}${comment.commentText.length > 100 ? '...' : ''}"`);
        console.log(`      - Av: ${comment.authorDisplayName}`);
        console.log(`      - Likes: ${comment.likeCount}`);
      });
    }
  } catch (error) {
    console.error('❌ Kunde inte hämta kommentarer:', error.message);
  }
  
  // Test 4: Kontrollera konfiguration
  console.log('\n⚙️ Test 4: Kontrollera konfiguration');
  
  const config = {
    apiKey: process.env.YOUTUBE_API_KEY ? '✅ Konfigurerad' : '❌ Saknas',
    targetVideos: process.env.TARGET_VIDEO_IDS ? process.env.TARGET_VIDEO_IDS.split(',').length + ' videor' : '⚠️ Inga videor angivna',
    targetChannel: process.env.TARGET_CHANNEL_ID || '⚠️ Ingen kanal angiven',
    maxComments: process.env.MAX_COMMENTS_PER_VIDEO || '1000 (standard)',
    instagramSearch: process.env.ENABLE_INSTAGRAM_SEARCH === 'true' ? '✅ Aktiverad' : '❌ Inaktiverad'
  };
  
  console.log('   Nuvarande konfiguration:');
  Object.entries(config).forEach(([key, value]) => {
    console.log(`   • ${key}: ${value}`);
  });
  
  // Sammanfattning
  console.log('\n' + '═'.repeat(50));
  console.log('📊 TESTRESULTAT');
  console.log('═'.repeat(50));
  
  console.log('\n✅ Alla tester slutförda!');
  console.log('\nNästa steg:');
  console.log('1. Konfigurera TARGET_VIDEO_IDS eller TARGET_CHANNEL_ID i .env-filen');
  console.log('2. Kör "npm start" för att starta analysen');
  console.log('3. Eller använd GitHub Actions för automatiserad körning');
}

test().catch(error => {
  console.error('❌ Testfel:', error);
  process.exit(1);
});
