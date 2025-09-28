import dotenv from 'dotenv';
import { getVideoComments, getChannelVideos, testApiConnection } from './youtube-api.js';
import { analyzeCommenters, exportRawComments, exportRankedCommenters, filterTopCommenters } from './analyzer.js';
import { InstagramFinder, exportInstagramResults } from './instagram-finder.js';
import fs from 'fs';
import path from 'path';

// Ladda miljövariabler
dotenv.config();

async function main() {
  console.log('🚀 YouTube Lead Generator - Startar...\n');
  
  // Validera konfiguration
  if (!process.env.YOUTUBE_API_KEY) {
    console.error('❌ YOUTUBE_API_KEY saknas i .env-filen');
    process.exit(1);
  }
  
  // Testa API-anslutning
  const apiWorking = await testApiConnection();
  if (!apiWorking) {
    console.error('❌ Kunde inte ansluta till YouTube API. Kontrollera din API-nyckel.');
    process.exit(1);
  }
  
  console.log('\n📊 Konfiguration:');
  console.log('────────────────────────────────');
  
  // Hämta konfiguration
  const config = {
    targetVideoIds: process.env.TARGET_VIDEO_IDS ? process.env.TARGET_VIDEO_IDS.split(',') : [],
    targetChannelId: process.env.TARGET_CHANNEL_ID,
    maxCommentsPerVideo: parseInt(process.env.MAX_COMMENTS_PER_VIDEO || '1000'),
    minActivityScore: parseInt(process.env.MIN_ACTIVITY_SCORE || '5'),
    enableInstagramSearch: process.env.ENABLE_INSTAGRAM_SEARCH === 'true',
    outputDir: process.env.OUTPUT_DIR || './output'
  };
  
  console.log(`• Målkanal: ${config.targetChannelId || 'Ej angiven'}`);
  console.log(`• Specifika videor: ${config.targetVideoIds.length > 0 ? config.targetVideoIds.join(', ') : 'Alla kanalens videor'}`);
  console.log(`• Max kommentarer per video: ${config.maxCommentsPerVideo}`);
  console.log(`• Min aktivitetspoäng: ${config.minActivityScore}`);
  console.log(`• Instagram-sökning: ${config.enableInstagramSearch ? 'Aktiverad' : 'Inaktiverad'}`);
  console.log('────────────────────────────────\n');
  
  // Skapa output-mapp
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
  
  let allComments = [];
  
  try {
    // Steg 1: Hämta videor att analysera
    let videoIds = config.targetVideoIds;
    
    if (config.targetChannelId && videoIds.length === 0) {
      console.log(`\n🎬 Hämtar videor från kanal ${config.targetChannelId}...`);
      const channelVideos = await getChannelVideos(config.targetChannelId, 10);
      videoIds = channelVideos.map(v => v.videoId);
      console.log(`   Hittade ${videoIds.length} videor`);
    }
    
    if (videoIds.length === 0) {
      console.error('❌ Inga videor att analysera. Ange antingen TARGET_VIDEO_IDS eller TARGET_CHANNEL_ID i .env-filen');
      process.exit(1);
    }
    
    // Steg 2: Hämta kommentarer från varje video
    console.log('\n💬 Hämtar kommentarer...');
    for (const videoId of videoIds) {
      console.log(`   Bearbetar video: ${videoId}`);
      
      try {
        const comments = await getVideoComments(videoId, config.maxCommentsPerVideo);
        allComments.push(...comments);
        console.log(`   ✅ ${comments.length} kommentarer hämtade`);
      } catch (error) {
        console.error(`   ⚠️ Kunde inte hämta kommentarer: ${error.message}`);
      }
    }
    
    if (allComments.length === 0) {
      console.error('❌ Inga kommentarer hittades');
      process.exit(1);
    }
    
    console.log(`\n✅ Totalt ${allComments.length} kommentarer hämtade`);
    
    // Steg 3: Exportera rådata
    console.log('\n📁 Exporterar rådata...');
    await exportRawComments(allComments);
    
    // Steg 4: Analysera och ranka kommentatorer
    console.log('\n🔍 Analyserar kommentatorer...');
    const analyzedCommenters = analyzeCommenters(allComments);
    console.log(`   ${analyzedCommenters.length} unika kommentatorer identifierade`);
    
    // Steg 5: Exportera rankade kommentatorer
    console.log('\n📊 Exporterar rankade kommentatorer...');
    await exportRankedCommenters(analyzedCommenters);
    
    // Steg 6: Filtrera top-kommentatorer
    const topCommenters = filterTopCommenters(analyzedCommenters, config.minActivityScore, 50);
    console.log(`   ${topCommenters.length} top-kommentatorer identifierade`);
    
    // Steg 7: Sök efter Instagram-profiler (om aktiverat)
    if (config.enableInstagramSearch && topCommenters.length > 0) {
      console.log('\n🔎 Söker efter Instagram-profiler...');
      console.log('   (Detta kan ta några minuter...)\n');
      
      const instagramFinder = new InstagramFinder({
        delay: parseInt(process.env.INSTAGRAM_SEARCH_DELAY || '2000')
      });
      
      const instagramResults = await instagramFinder.findInstagramProfiles(
        topCommenters,
        (current, total, name) => {
          console.log(`   [${current}/${total}] Söker för: ${name}`);
        }
      );
      
      // Kombinera data
      const combinedResults = instagramResults.map((result, index) => ({
        ...result,
        ...topCommenters[index]
      }));
      
      // Exportera Instagram-resultat
      console.log('\n📁 Exporterar Instagram-resultat...');
      await exportInstagramResults(combinedResults);
      
      // Visa statistik
      const foundCount = instagramResults.filter(r => r.instagramProfile).length;
      console.log(`\n✅ Instagram-profiler hittade: ${foundCount}/${instagramResults.length}`);
    }
    
    // Sammanfattning
    console.log('\n' + '═'.repeat(50));
    console.log('📈 SAMMANFATTNING');
    console.log('═'.repeat(50));
    console.log(`• Totalt antal kommentarer: ${allComments.length}`);
    console.log(`• Unika kommentatorer: ${analyzedCommenters.length}`);
    console.log(`• Top-kommentatorer: ${topCommenters.length}`);
    
    if (config.enableInstagramSearch) {
      const instagramCount = topCommenters.filter(c => c.instagramProfile).length;
      console.log(`• Instagram-profiler hittade: ${instagramCount}`);
    }
    
    console.log(`\n✅ Alla filer har exporterats till: ${path.resolve(config.outputDir)}`);
    console.log('\nFiler:');
    console.log('• youtube_commenters_raw.csv - Alla råa kommentarer');
    console.log('• youtube_commenters_ranked.csv - Rankade kommentatorer');
    
    if (config.enableInstagramSearch) {
      console.log('• top_candidates_with_instagram.csv - Top-kommentatorer med Instagram');
    }
    
  } catch (error) {
    console.error('\n❌ Ett fel uppstod:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Kör huvudprogrammet
main().catch(error => {
  console.error('❌ Kritiskt fel:', error);
  process.exit(1);
});
