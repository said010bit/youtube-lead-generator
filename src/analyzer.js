import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

/**
 * Analyserar och rankar kommentatorer baserat på aktivitet
 */
export function analyzeCommenters(comments) {
  const commentersMap = new Map();
  
  for (const comment of comments) {
    const channelId = comment.authorChannelId;
    if (!channelId) continue;
    
    if (!commentersMap.has(channelId)) {
      commentersMap.set(channelId, {
        authorDisplayName: comment.authorDisplayName,
        authorChannelId: channelId,
        authorChannelUrl: comment.authorChannelUrl,
        comments: [],
        totalComments: 0,
        totalLikes: 0,
        firstComment: comment.publishedAt,
        lastComment: comment.publishedAt,
        averageCommentLength: 0,
        activityScore: 0
      });
    }
    
    const commenter = commentersMap.get(channelId);
    commenter.comments.push({
      text: comment.commentText,
      likes: comment.likeCount,
      date: comment.publishedAt,
      videoId: comment.videoId
    });
    commenter.totalComments++;
    commenter.totalLikes += comment.likeCount || 0;
    
    // Uppdatera första och sista kommentar
    if (new Date(comment.publishedAt) < new Date(commenter.firstComment)) {
      commenter.firstComment = comment.publishedAt;
    }
    if (new Date(comment.publishedAt) > new Date(commenter.lastComment)) {
      commenter.lastComment = comment.publishedAt;
    }
  }
  
  // Beräkna statistik och aktivitetspoäng
  for (const [channelId, commenter] of commentersMap) {
    // Beräkna genomsnittlig kommentarslängd
    const totalLength = commenter.comments.reduce((sum, c) => sum + c.text.length, 0);
    commenter.averageCommentLength = Math.round(totalLength / commenter.totalComments);
    
    // Beräkna aktivitetspoäng (kan anpassas efter behov)
    commenter.activityScore = calculateActivityScore(commenter);
    
    // Begränsa antalet sparade kommentarer för att minska filstorlek
    commenter.sampleComments = commenter.comments
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 3)
      .map(c => ({
        text: c.text.substring(0, 200),
        likes: c.likes
      }));
  }
  
  // Konvertera till array och sortera efter aktivitetspoäng
  const sortedCommenters = Array.from(commentersMap.values())
    .sort((a, b) => b.activityScore - a.activityScore);
  
  return sortedCommenters;
}

/**
 * Beräknar aktivitetspoäng för en kommentator
 */
function calculateActivityScore(commenter) {
  // Vikter för olika faktorer
  const weights = {
    comments: 10,
    likes: 1,
    length: 0.01,
    consistency: 20
  };
  
  // Beräkna tidsperiod (i dagar)
  const firstDate = new Date(commenter.firstComment);
  const lastDate = new Date(commenter.lastComment);
  const daysDiff = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24));
  
  // Beräkna konsistens (kommentarer per dag)
  const consistency = commenter.totalComments / daysDiff;
  
  // Beräkna totalpoäng
  const score = 
    (commenter.totalComments * weights.comments) +
    (commenter.totalLikes * weights.likes) +
    (commenter.averageCommentLength * weights.length) +
    (consistency * weights.consistency);
  
  return Math.round(score);
}

/**
 * Exporterar data till CSV
 */
export async function exportToCSV(data, filename, columns) {
  const outputDir = process.env.OUTPUT_DIR || './output';
  
  // Skapa output-mappen om den inte finns
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filepath = path.join(outputDir, filename);
  
  const csvWriter = createObjectCsvWriter({
    path: filepath,
    header: columns
  });
  
  await csvWriter.writeRecords(data);
  console.log(`✅ Exporterade ${data.length} rader till ${filepath}`);
  
  return filepath;
}

/**
 * Exporterar råa kommentarer
 */
export async function exportRawComments(comments) {
  const columns = [
    { id: 'commentId', title: 'Comment ID' },
    { id: 'videoId', title: 'Video ID' },
    { id: 'authorDisplayName', title: 'Author Name' },
    { id: 'authorChannelId', title: 'Channel ID' },
    { id: 'authorChannelUrl', title: 'Channel URL' },
    { id: 'commentText', title: 'Comment Text' },
    { id: 'likeCount', title: 'Likes' },
    { id: 'publishedAt', title: 'Published Date' },
    { id: 'updatedAt', title: 'Updated Date' }
  ];
  
  return await exportToCSV(comments, 'youtube_commenters_raw.csv', columns);
}

/**
 * Exporterar rankade kommentatorer
 */
export async function exportRankedCommenters(commenters) {
  const columns = [
    { id: 'rank', title: 'Rank' },
    { id: 'authorDisplayName', title: 'Display Name' },
    { id: 'authorChannelId', title: 'Channel ID' },
    { id: 'authorChannelUrl', title: 'Channel URL' },
    { id: 'totalComments', title: 'Total Comments' },
    { id: 'totalLikes', title: 'Total Likes' },
    { id: 'activityScore', title: 'Activity Score' },
    { id: 'averageCommentLength', title: 'Avg Comment Length' },
    { id: 'firstComment', title: 'First Comment Date' },
    { id: 'lastComment', title: 'Last Comment Date' },
    { id: 'sampleComment1', title: 'Sample Comment 1' },
    { id: 'sampleComment2', title: 'Sample Comment 2' },
    { id: 'sampleComment3', title: 'Sample Comment 3' }
  ];
  
  // Lägg till rank och formatera data
  const rankedData = commenters.map((c, index) => ({
    rank: index + 1,
    ...c,
    sampleComment1: c.sampleComments?.[0] ? `"${c.sampleComments[0].text}" (${c.sampleComments[0].likes} likes)` : '',
    sampleComment2: c.sampleComments?.[1] ? `"${c.sampleComments[1].text}" (${c.sampleComments[1].likes} likes)` : '',
    sampleComment3: c.sampleComments?.[2] ? `"${c.sampleComments[2].text}" (${c.sampleComments[2].likes} likes)` : ''
  }));
  
  return await exportToCSV(rankedData, 'youtube_commenters_ranked.csv', columns);
}

/**
 * Filtrerar topkommentatorer baserat på aktivitetskrav
 */
export function filterTopCommenters(commenters, minActivityScore = 5, maxResults = 100) {
  return commenters
    .filter(c => c.activityScore >= minActivityScore)
    .slice(0, maxResults);
}
