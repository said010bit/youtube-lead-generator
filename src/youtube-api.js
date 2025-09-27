import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

/**
 * Hämtar kommentarer från en specifik video
 */
export async function getVideoComments(videoId, maxResults = 100) {
  const comments = [];
  let nextPageToken = null;
  
  try {
    do {
      const response = await youtube.commentThreads.list({
        part: 'snippet,replies',
        videoId: videoId,
        maxResults: Math.min(maxResults, 100),
        pageToken: nextPageToken,
        textFormat: 'plainText'
      });
      
      for (const item of response.data.items) {
        const topComment = item.snippet.topLevelComment.snippet;
        
        comments.push({
          commentId: item.id,
          videoId: videoId,
          authorDisplayName: topComment.authorDisplayName,
          authorChannelId: topComment.authorChannelId?.value || '',
          authorChannelUrl: topComment.authorChannelUrl || '',
          commentText: topComment.textDisplay,
          likeCount: topComment.likeCount || 0,
          publishedAt: topComment.publishedAt,
          updatedAt: topComment.updatedAt
        });
        
        // Hantera svar på kommentarer
        if (item.replies) {
          for (const reply of item.replies.comments) {
            const replySnippet = reply.snippet;
            comments.push({
              commentId: reply.id,
              videoId: videoId,
              parentId: item.id,
              authorDisplayName: replySnippet.authorDisplayName,
              authorChannelId: replySnippet.authorChannelId?.value || '',
              authorChannelUrl: replySnippet.authorChannelUrl || '',
              commentText: replySnippet.textDisplay,
              likeCount: replySnippet.likeCount || 0,
              publishedAt: replySnippet.publishedAt,
              updatedAt: replySnippet.updatedAt
            });
          }
        }
      }
      
      nextPageToken = response.data.nextPageToken;
      
      // Begränsa totala antalet kommentarer
      if (comments.length >= maxResults) {
        break;
      }
      
      // Lägg till en liten fördröjning för att undvika rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } while (nextPageToken);
    
    console.log(`✅ Hämtade ${comments.length} kommentarer från video ${videoId}`);
    return comments;
    
  } catch (error) {
    console.error(`❌ Fel vid hämtning av kommentarer för video ${videoId}:`, error.message);
    
    // Returnera detaljerad felinformation
    if (error.response) {
      console.error('API-svar:', error.response.data);
    }
    
    throw error;
  }
}

/**
 * Hämtar information om en kanal
 */
export async function getChannelInfo(channelId) {
  try {
    const response = await youtube.channels.list({
      part: 'snippet,statistics,contentDetails',
      id: channelId
    });
    
    if (!response.data.items || response.data.items.length === 0) {
      throw new Error(`Kanal med ID ${channelId} hittades inte`);
    }
    
    const channel = response.data.items[0];
    
    return {
      channelId: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      customUrl: channel.snippet.customUrl,
      publishedAt: channel.snippet.publishedAt,
      country: channel.snippet.country,
      subscriberCount: parseInt(channel.statistics.subscriberCount || 0),
      videoCount: parseInt(channel.statistics.videoCount || 0),
      viewCount: parseInt(channel.statistics.viewCount || 0)
    };
    
  } catch (error) {
    console.error(`❌ Fel vid hämtning av kanalinfo för ${channelId}:`, error.message);
    throw error;
  }
}

/**
 * Hämtar alla videor från en kanal
 */
export async function getChannelVideos(channelId, maxResults = 50) {
  const videos = [];
  let nextPageToken = null;
  
  try {
    do {
      const response = await youtube.search.list({
        part: 'id,snippet',
        channelId: channelId,
        type: 'video',
        maxResults: Math.min(maxResults, 50),
        pageToken: nextPageToken,
        order: 'date'
      });
      
      for (const item of response.data.items) {
        videos.push({
          videoId: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          publishedAt: item.snippet.publishedAt,
          channelId: item.snippet.channelId,
          channelTitle: item.snippet.channelTitle
        });
      }
      
      nextPageToken = response.data.nextPageToken;
      
      if (videos.length >= maxResults) {
        break;
      }
      
    } while (nextPageToken);
    
    console.log(`✅ Hämtade ${videos.length} videor från kanal ${channelId}`);
    return videos;
    
  } catch (error) {
    console.error(`❌ Fel vid hämtning av videor från kanal ${channelId}:`, error.message);
    throw error;
  }
}

/**
 * Hämtar detaljerad information om en video
 */
export async function getVideoDetails(videoId) {
  try {
    const response = await youtube.videos.list({
      part: 'snippet,statistics,contentDetails',
      id: videoId
    });
    
    if (!response.data.items || response.data.items.length === 0) {
      throw new Error(`Video med ID ${videoId} hittades inte`);
    }
    
    const video = response.data.items[0];
    
    return {
      videoId: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      publishedAt: video.snippet.publishedAt,
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle,
      duration: video.contentDetails.duration,
      viewCount: parseInt(video.statistics.viewCount || 0),
      likeCount: parseInt(video.statistics.likeCount || 0),
      commentCount: parseInt(video.statistics.commentCount || 0)
    };
    
  } catch (error) {
    console.error(`❌ Fel vid hämtning av videodetaljer för ${videoId}:`, error.message);
    throw error;
  }
}

/**
 * Testar API-anslutningen
 */
export async function testApiConnection() {
  try {
    console.log('🔍 Testar YouTube API-anslutning...');
    
    // Testa med en populär YouTube-video (YouTube Rewind 2018)
    const testVideoId = 'YbJOTdZBX1g';
    const response = await youtube.videos.list({
      part: 'snippet',
      id: testVideoId,
      maxResults: 1
    });
    
    if (response.data.items && response.data.items.length > 0) {
      console.log('✅ YouTube API-anslutning fungerar!');
      console.log(`   Testvideo: ${response.data.items[0].snippet.title}`);
      return true;
    } else {
      throw new Error('Ingen data returnerades från API:et');
    }
    
  } catch (error) {
    console.error('❌ YouTube API-anslutning misslyckades:', error.message);
    
    if (error.response && error.response.status === 403) {
      console.error('   → API-nyckeln saknar behörighet eller kvoten är slut');
    } else if (error.response && error.response.status === 400) {
      console.error('   → Ogiltig API-nyckel');
    }
    
    return false;
  }
}
