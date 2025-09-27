import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

/**
* Söker efter Instagram-profiler för YouTube-kommentatorer
* VIKTIGT: Använder endast publika sökmetoder som är GDPR-kompatibla
*/
export class InstagramFinder {
constructor(options = {}) {
this.delay = options.delay || 2000; // Fördröjning mellan sökningar (millisekunder)
this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
this.maxRetries = options.maxRetries || 3;
}

/**
* Söker efter Instagram-profil för en kommentator
*/
async findInstagramProfile(commenter) {
const results = {
youtubeDisplayName: commenter.authorDisplayName,
youtubeChannelUrl: commenter.authorChannelUrl,
instagramProfile: null,
verificationMethod: null,
confidence: 0,
searchAttempts: []
};

try {
console.log(` 🔍 Söker Instagram för: ${commenter.authorDisplayName}`);

// METOD 1: Kontrollera YouTube-kanalbeskrivningen för Instagram-länkar (HÖGST PRIORITET!)
console.log(` Kollar YouTube-kanalbeskrivning...`);
const channelInstagram = await this.checkYouTubeChannelDescription(commenter.authorChannelUrl);
if (channelInstagram) {
results.instagramProfile = channelInstagram;
results.verificationMethod = 'YouTube channel description';
results.confidence = 95;
results.searchAttempts.push('YouTube-beskrivning: HITTAD');
console.log(` ✅ Instagram hittad i YouTube-beskrivning: ${channelInstagram}`);
return results;
} else {
results.searchAttempts.push('YouTube-beskrivning: Ej hittad');
console.log(` ⚪ Ingen Instagram i YouTube-beskrivning`);
}

// METOD 2: Googlesökning med site:instagram.com
console.log(` Söker via Google...`);
const googleResult = await this.searchGoogleForInstagram(commenter.authorDisplayName);
if (googleResult) {
results.instagramProfile = googleResult;
results.verificationMethod = 'Google search (public)';
results.confidence = 70;
results.searchAttempts.push('Google-sökning: HITTAD');
console.log(` ✅ Instagram hittad via Google: ${googleResult}`);
return results;
} else {
results.searchAttempts.push('Google-sökning: Ej hittad');
console.log(` ⚪ Ingen träff på Google`);
}

// METOD 3: Kontrollera om användarnamnet matchar direkt på Instagram
console.log(` Testar direkt Instagram-matchning...`);
const directCheck = await this.checkDirectInstagramUrl(commenter.authorDisplayName);
if (directCheck) {
results.instagramProfile = directCheck;
results.verificationMethod = 'Direct username match';
results.confidence = 60;
results.searchAttempts.push('Direktmatchning: HITTAD');
console.log(` ✅ Direkt matchning funnen: ${directCheck}`);
return results;
} else {
results.searchAttempts.push('Direktmatchning: Ej hittad');
console.log(` ❌ Ingen Instagram-profil hittad`);
}

} catch (error) {
console.error(` ⚠️ Fel vid sökning: ${error.message}`);
results.searchAttempts.push(`Fel: ${error.message}`);
}

return results;
}

/**
* Kontrollerar YouTube-kanalbeskrivningen för Instagram-länkar
* UPPDATERAD VERSION - Mer omfattande sökning
*/
async checkYouTubeChannelDescription(channelUrl) {
if (!channelUrl) return null;

try {
// Försök flera URL-varianter för att hitta kanalbeskrivningen
const urlsToTry = [
`${channelUrl}/about`,
`${channelUrl}/channels`,
channelUrl
];

for (const url of urlsToTry) {
try {
const response = await axios.get(url, {
headers: {
'User-Agent': this.userAgent,
'Accept-Language': 'en-US,en;q=0.9',
'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
},
timeout: 10000,
maxRedirects: 5
});

const $ = cheerio.load(response.data);
const instagramLinks = new Set();

// METOD 1: Leta efter direkta Instagram-länkar i href-attribut
$('a[href*="instagram.com"]').each((i, elem) => {
const href = $(elem).attr('href');
if (href && this.isValidInstagramUrl(href)) {
instagramLinks.add(href);
}
});

// METOD 2: Leta i alla länkar som kan vara redirect-länkar
$('a').each((i, elem) => {
const href = $(elem).attr('href');
if (href) {
// Kontrollera om det är en YouTube redirect-länk
if (href.includes('/redirect') || href.includes('q=')) {
const decodedUrl = this.extractUrlFromRedirect(href);
if (decodedUrl && decodedUrl.includes('instagram.com')) {
instagramLinks.add(decodedUrl);
}
}
}
});

// METOD 3: Sök i beskrivningstext och script-taggar
const pageContent = $.html();
const instagramRegexPatterns = [
/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9_.]+)(?:\/)?/gi,
/instagram\.com\/([A-Za-z0-9_.]+)/gi,
/@([A-Za-z0-9_.]+)/gi // Om det finns @username som kan vara Instagram
];

for (const pattern of instagramRegexPatterns) {
const matches = pageContent.match(pattern);
if (matches) {
matches.forEach(match => {
if (match.includes('instagram.com')) {
instagramLinks.add(match);
} else if (match.startsWith('@')) {
// Om det är ett @-mention, validera om det kan vara Instagram
const username = match.substring(1);
if (this.isValidInstagramUsername(username)) {
// Leta efter kontext runt @-mention
const contextPattern = new RegExp(`instagram[\\s:]*${match}`, 'gi');
if (pageContent.match(contextPattern)) {
instagramLinks.add(`https://www.instagram.com/${username}/`);
}
}
}
});
}
}

// METOD 4: Leta i JSON-LD strukturerad data
$('script[type="application/ld+json"]').each((i, elem) => {
const jsonText = $(elem).html();
if (jsonText) {
try {
const jsonData = JSON.parse(jsonText);
const jsonString = JSON.stringify(jsonData);
const matches = jsonString.match(/instagram\.com\/[A-Za-z0-9_.]+/gi);
if (matches) {
matches.forEach(match => instagramLinks.add(match));
}
} catch (e) {
// Ignorera JSON-parsningsfel
}
}
});

// METOD 5: Leta i meta-taggar
$('meta').each((i, elem) => {
const content = $(elem).attr('content');
if (content && content.includes('instagram.com')) {
const matches = content.match(/instagram\.com\/[A-Za-z0-9_.]+/gi);
if (matches) {
matches.forEach(match => instagramLinks.add(match));
}
}
});

// Om vi hittat några Instagram-länkar, returnera den mest troliga
if (instagramLinks.size > 0) {
// Prioritera länkar som ser ut som användarprofiler
const links = Array.from(instagramLinks);
const profileLinks = links.filter(link => {
const clean = this.cleanInstagramUrl(link);
return clean && !clean.includes('/p/') && !clean.includes('/explore/') && !clean.includes('/stories/');
});

if (profileLinks.length > 0) {
return this.cleanInstagramUrl(profileLinks[0]);
}

// Om inga profillänkar, returnera första länken
return this.cleanInstagramUrl(links[0]);
}

} catch (error) {
// Fortsätt till nästa URL om denna misslyckas
continue;
}
}

} catch (error) {
console.error(` Fel vid YouTube-sökning: ${error.message}`);
}

return null;
}

/**
* Extraherar URL från YouTube redirect-länk
*/
extractUrlFromRedirect(redirectUrl) {
try {
// YouTube redirect URLs brukar se ut som: /redirect?q=https://instagram.com/...
const urlMatch = redirectUrl.match(/[?&]q=([^&]+)/);
if (urlMatch) {
return decodeURIComponent(urlMatch[1]);
}

// Alternativ format
const urlMatch2 = redirectUrl.match(/url[?=]([^&]+)/);
if (urlMatch2) {
return decodeURIComponent(urlMatch2[1]);
}
} catch (error) {
// Ignorera fel
}
return null;
}

/**
* Validerar om en sträng är ett giltigt Instagram-användarnamn
*/
isValidInstagramUsername(username) {
// Instagram-användarnamn kan innehålla bokstäver, siffror, punkter och understreck
// Måste vara mellan 1-30 tecken
const pattern = /^[A-Za-z0-9_.]{1,30}$/;
return pattern.test(username);
}

/**
* Validerar om en URL är en giltig Instagram-URL
*/
isValidInstagramUrl(url) {
return url.includes('instagram.com') &&
!url.includes('instagram.com/static/') &&
!url.includes('instagram.com/developer/') &&
!url.includes('instagram.com/about/');
}

/**
* Söker på Google efter Instagram-profil
*/
async searchGoogleForInstagram(displayName) {
try {
// Skapa flera sökfrågor för bättre träffar
const searchQueries = [
`site:instagram.com "${displayName}"`,
`"${displayName}" instagram profile`,
`instagram.com/${displayName.replace(/\s+/g, '')}`
];

for (const searchQuery of searchQueries) {
const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

// Simulera en webbläsare
const response = await axios.get(searchUrl, {
headers: {
'User-Agent': this.userAgent,
'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
'Accept-Language': 'en-US,en;q=0.5',
'Accept-Encoding': 'gzip, deflate, br',
'DNT': '1',
'Connection': 'keep-alive',
'Upgrade-Insecure-Requests': '1'
},
timeout: 10000
});

const $ = cheerio.load(response.data);

// Leta efter Instagram-länkar i sökresultaten
const instagramLinks = new Set();

$('a').each((i, elem) => {
const href = $(elem).attr('href');
if (href) {
// Google redirect URLs
if (href.includes('url?q=')) {
const urlMatch = href.match(/url\?q=(https?:\/\/[^&]+)/);
if (urlMatch && urlMatch[1].includes('instagram.com')) {
instagramLinks.add(decodeURIComponent(urlMatch[1]));
}
}
// Direkta Instagram-länkar
else if (href.includes('instagram.com') && !href.includes('/explore')) {
instagramLinks.add(href);
}
}
});

if (instagramLinks.size > 0) {
const links = Array.from(instagramLinks);
return this.cleanInstagramUrl(links[0]);
}
}

} catch (error) {
console.error(` Google-sökning misslyckades: ${error.message}`);
}

return null;
}

/**
* Kontrollerar om ett användarnamn finns på Instagram (publikt)
*/
async checkDirectInstagramUrl(displayName) {
try {
// Skapa flera möjliga användarnamn baserat på display name
const possibleUsernames = [
displayName.toLowerCase().replace(/[^a-z0-9_.]/g, ''),
displayName.toLowerCase().replace(/\s+/g, '_'),
displayName.toLowerCase().replace(/\s+/g, '.'),
displayName.toLowerCase().replace(/\s+/g, '')
];

// Ta bort duplicates och ogiltiga
const uniqueUsernames = [...new Set(possibleUsernames)]
.filter(u => u.length >= 3 && u.length <= 30)
.slice(0, 3); // Testa max 3 varianter

for (const username of uniqueUsernames) {
const instagramUrl = `https://www.instagram.com/${username}/`;

try {
// Gör en HEAD-request för att kontrollera om sidan finns
const response = await axios.head(instagramUrl, {
headers: {
'User-Agent': this.userAgent,
'Accept': '*/*'
},
timeout: 5000,
maxRedirects: 5,
validateStatus: (status) => status < 500
});

if (response.status === 200) {
return instagramUrl;
}
} catch (error) {
// Fortsätt till nästa användarnamn
continue;
}
}

} catch (error) {
console.error(` Direktkontroll misslyckades: ${error.message}`);
}

return null;
}

/**
* Rensar och standardiserar Instagram-URL
*/
cleanInstagramUrl(url) {
if (!url) return null;

try {
// Ta bort tracking-parametrar och standardisera
let cleanUrl = url.split('?')[0].split('#')[0];

// Lägg till https:// om det saknas
if (!cleanUrl.startsWith('http')) {
cleanUrl = 'https://' + cleanUrl;
}

// Standardisera till www.instagram.com
cleanUrl = cleanUrl.replace('://instagram.com', '://www.instagram.com');

// Extrahera användarnamnet och bygg om URL:en
const match = cleanUrl.match(/instagram\.com\/([A-Za-z0-9_.]+)/);
if (match && match[1]) {
// Filtrera bort oönskade sidor
const excludedPaths = ['p', 'explore', 'stories', 'reels', 'tv', 'accounts'];
if (!excludedPaths.includes(match[1])) {
return `https://www.instagram.com/${match[1]}/`;
}
}

return cleanUrl.endsWith('/') ? cleanUrl : cleanUrl + '/';
} catch (error) {
return url;
}
}

/**
* Söker efter Instagram-profiler för flera kommentatorer
*/
async findInstagramProfiles(commenters, progressCallback) {
const results = [];
const totalCommenters = commenters.length;

console.log(`\n🔎 Startar Instagram-sökning för ${totalCommenters} kommentatorer...`);
console.log(` Sökning inkluderar: YouTube-beskrivning → Google → Direktmatchning\n`);

for (let i = 0; i < totalCommenters; i++) {
const commenter = commenters[i];

if (progressCallback) {
progressCallback(i + 1, totalCommenters, commenter.authorDisplayName);
} else {
console.log(`\n[${i + 1}/${totalCommenters}] Bearbetar: ${commenter.authorDisplayName}`);
}

const result = await this.findInstagramProfile(commenter);

// Lägg till ytterligare data från kommentatorn
result.totalComments = commenter.totalComments;
result.activityScore = commenter.activityScore;
result.totalLikes = commenter.totalLikes;

results.push(result);

// Lägg till fördröjning mellan sökningar för att undvika rate limiting
if (i < totalCommenters - 1) {
const delayTime = this.delay + Math.random() * 1000; // Lägg till lite slumpmässighet
console.log(` ⏱️ Väntar ${Math.round(delayTime/1000)} sekunder innan nästa sökning...`);
await this.sleep(delayTime);
}
}

// Sammanfatta resultat
const foundCount = results.filter(r => r.instagramProfile).length;
const byMethod = {
'YouTube channel description': results.filter(r => r.verificationMethod === 'YouTube channel description').length,
'Google search (public)': results.filter(r => r.verificationMethod === 'Google search (public)').length,
'Direct username match': results.filter(r => r.verificationMethod === 'Direct username match').length
};

console.log(`\n📊 Instagram-sökningsresultat:`);
console.log(` ✅ Hittade: ${foundCount}/${totalCommenters} (${Math.round(foundCount/totalCommenters*100)}%)`);
console.log(` 📍 Via YouTube-beskrivning: ${byMethod['YouTube channel description']}`);
console.log(` 📍 Via Google-sökning: ${byMethod['Google search (public)']}`);
console.log(` 📍 Via direktmatchning: ${byMethod['Direct username match']}`);

return results;
}

/**
* Hjälpfunktion för att pausa exekvering
*/
sleep(ms) {
return new Promise(resolve => setTimeout(resolve, ms));
}
}

/**
* Exporterar Instagram-resultat till CSV
*/
export async function exportInstagramResults(results) {
const outputDir = process.env.OUTPUT_DIR || './output';

if (!fs.existsSync(outputDir)) {
fs.mkdirSync(outputDir, { recursive: true });
}

const filepath = path.join(outputDir, 'top_candidates_with_instagram.csv');

// Filtrera endast de med hittade Instagram-profiler
const withInstagram = results.filter(r => r.instagramProfile);

const { createObjectCsvWriter } = await import('csv-writer');
const csvWriter = createObjectCsvWriter({
path: filepath,
header: [
{ id: 'rank', title: 'Rank' },
{ id: 'youtubeDisplayName', title: 'YouTube Display Name' },
{ id: 'youtubeChannelUrl', title: 'YouTube Channel URL' },
{ id: 'instagramProfile', title: 'Instagram Profile' },
{ id: 'verificationMethod', title: 'Verification Method' },
{ id: 'confidence', title: 'Confidence (%)' },
{ id: 'totalComments', title: 'Total Comments' },
{ id: 'totalLikes', title: 'Total Likes' },
{ id: 'activityScore', title: 'Activity Score' }
]
});

// Lägg till rank
const rankedResults = withInstagram.map((r, index) => ({
rank: index + 1,
...r
}));

await csvWriter.writeRecords(rankedResults);
console.log(`\n✅ Exporterade ${withInstagram.length} Instagram-profiler till ${filepath}`);

return filepath;
}
