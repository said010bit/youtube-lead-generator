# YouTube Lead Generator

Ett automatiserat verktyg för att analysera YouTube-kommentarer och identifiera engagerade följare med möjlighet att hitta deras Instagram-profiler.

## 🚀 Funktioner

- ✅ Hämtar kommentarer från YouTube-videor via officiella YouTube Data API
- ✅ Analyserar och rankar kommentatorer baserat på aktivitet
- ✅ Söker efter Instagram-profiler (endast publikt tillgänglig information)
- ✅ GDPR-kompatibel och respekterar användarnas integritet
- ✅ GitHub Actions integration för automatiserad körning
- ✅ Exporterar resultat i CSV-format

## 📋 Förutsättningar

1. **YouTube Data API v3 nyckel**
2. **GitHub-konto** (för GitHub Actions)
3. **Node.js 18+** (för lokal körning)

## 🔧 Installation & Setup

### Steg 1: Skaffa YouTube API-nyckel

1. Gå till [Google Cloud Console](https://console.cloud.google.com/)
2. Skapa ett nytt projekt eller välj ett befintligt
3. Aktivera **YouTube Data API v3**:
   - Gå till "APIs & Services" → "Library"
   - Sök efter "YouTube Data API v3"
   - Klicka på "Enable"
4. Skapa API-nyckel:
   - Gå till "APIs & Services" → "Credentials"
   - Klicka på "Create Credentials" → "API Key"
   - Kopiera API-nyckeln

### Steg 2: Hitta YouTube Video/Kanal ID

#### För Video-ID:
- Öppna YouTube-videon
- URL ser ut som: `https://www.youtube.com/watch?v=VIDEO_ID_HÄR`
- Kopiera delen efter `v=`

#### För Kanal-ID:
1. Gå till YouTube-kanalen
2. Högerklicka → "Visa sidkälla"
3. Sök efter `"channelId":"` 
4. Kopiera ID:t (börjar ofta med UC...)

Alternativt använd: https://commentpicker.com/youtube-channel-id.php

### Steg 3: GitHub Repository Setup

1. Forka eller klona detta repository
2. Gå till Settings → Secrets and variables → Actions
3. Lägg till följande secrets:

| Secret Name | Beskrivning | Exempel |
|------------|-------------|---------|
| `YOUTUBE_API_KEY` | Din YouTube API-nyckel | `AIzaSy...` |
| `TARGET_CHANNEL_ID` | YouTube kanal-ID (valfritt) | `UCxxxxxx` |
| `TARGET_VIDEO_IDS` | Kommaseparerade video-ID:n (valfritt) | `video1,video2` |

### Steg 4: Kör GitHub Action

1. Gå till "Actions" i ditt GitHub-repository
2. Välj "YouTube Lead Generator"
3. Klicka på "Run workflow"
4. Fyll i parametrar:
   - **Target Videos**: Kommaseparerade video-ID:n (valfritt)
   - **Target Channel**: Kanal-ID (valfritt)
   - **Max Comments**: Max antal kommentarer per video (standard: 1000)
   - **Enable Instagram**: Aktivera Instagram-sökning (standard: true)
   - **Min Activity Score**: Minsta aktivitetspoäng (standard: 5)
5. Klicka "Run workflow"

### Steg 5: Hämta resultat

Efter körning:
1. Gå till den avslutade workflow-körningen
2. Scrolla ner till "Artifacts"
3. Ladda ner:
   - `youtube-commenters-raw.csv` - Alla kommentarer
   - `youtube-commenters-ranked.csv` - Rankade kommentatorer
   - `top-candidates-with-instagram.csv` - Med Instagram-profiler

## 💻 Lokal körning

```bash
# 1. Klona repository
git clone https://github.com/YOUR_USERNAME/youtube-lead-generator.git
cd youtube-lead-generator

# 2. Installera dependencies
npm install

# 3. Skapa .env-fil
cp .env.example .env

# 4. Redigera .env med din konfiguration
nano .env

# 5. Kör analysen
npm start
```

## 📊 Output-filer

### youtube_commenters_raw.csv
Innehåller alla kommentarer med:
- Comment ID
- Video ID
- Author Name
- Channel ID & URL
- Comment Text
- Likes
- Publish/Update Date

### youtube_commenters_ranked.csv
Rankade kommentatorer med:
- Rank
- Display Name
- Channel Info
- Total Comments
- Total Likes
- Activity Score
- Average Comment Length
- First/Last Comment Date
- Sample Comments

### top_candidates_with_instagram.csv
Top-kommentatorer med:
- YouTube Display Name
- YouTube Channel URL
- Instagram Profile (om hittat)
- Verification Method
- Confidence Score (%)

## 🎯 Frågor att ställa kunden

### Allmänna frågor:
1. **Vilken konkurrent vill du analysera?** (Kanal-URL eller namn)
2. **Vilka specifika videor är mest intressanta?** (eller ska vi analysera alla?)
3. **Hur många kommentatorer vill du analysera?** (Top 50, 100, 500?)
4. **Vilken tidsperiod?** (Senaste månaden, 3 månader, allt?)

### Filtreringsfrågor:
5. **Minsta antal kommentarer per person?** (för att kvalificera som "aktiv")
6. **Ska vi inkludera svar på kommentarer?**
7. **Språkkrav?** (Endast engelska, alla språk?)
8. **Geografisk filtrering?** (Om möjligt via kanalinfo)

### Instagram-relaterat:
9. **Hur viktigt är Instagram-matchningen?** (Ska vi prioritera säkerhet över kvantitet?)
10. **Vilken confidence-nivå krävs?** (60%, 70%, 90%?)
11. **Vill du ha manuell verifiering av osäkra matchningar?**

### Leverans:
12. **Vilket format föredrar du?** (CSV, Excel, Google Sheets?)
13. **Hur ofta ska analysen köras?** (Engångs, veckovis, månadsvis?)
14. **Vill du ha notifikationer?** (Email, Slack, Discord?)
15. **Behöver du visualiseringar/dashboard?**

### Aktivitetspoäng:
16. **Vad är viktigast för ranking?**
    - Antal kommentarer?
    - Antal likes på kommentarer?
    - Kommentarslängd/kvalitet?
    - Regelbundenhet?
17. **Ska vi vikta nyare aktivitet högre?**

### GDPR & Etik:
18. **Har du samtycke att kontakta dessa personer?**
19. **Hur ska datan användas?**
20. **Behöver vi anonymisera någon data?**

## ⚖️ GDPR & Etiska överväganden

Detta verktyg:
- ✅ Använder endast publikt tillgänglig information
- ✅ Respekterar YouTube & Instagram ToS
- ✅ Ingen scraping av privat data
- ✅ Ingen automatisk kontakt med användare
- ✅ Data används endast för analys

## 🛠️ Teknisk arkitektur

```
youtube-lead-generator/
├── src/
│   ├── youtube-api.js      # YouTube API integration
│   ├── analyzer.js          # Data analysis & ranking
│   ├── instagram-finder.js  # Instagram profile matching
│   └── index.js             # Main application
├── .github/
│   └── workflows/
│       └── youtube-lead-generator.yml
├── output/                  # Generated CSV files
├── .env.example             # Environment template
├── package.json
└── README.md
```

## 📈 Aktivitetspoäng-beräkning

Poäng baseras på:
- **Antal kommentarer** (vikt: 10)
- **Total likes** (vikt: 1)
- **Genomsnittlig kommentarslängd** (vikt: 0.01)
- **Konsistens** (kommentarer/dag, vikt: 20)

Formel: `(comments × 10) + (likes × 1) + (avg_length × 0.01) + (consistency × 20)`

## 🔒 API Rate Limits

- **YouTube API**: 10,000 units per dag (gratis)
  - List comments: 1 unit per request
  - ~100 kommentarer per request
- **Rekommendation**: Max 10 videor per körning med 1000 kommentarer vardera

## 🤝 Support

För frågor eller problem, skapa en GitHub Issue eller kontakta utvecklaren.

## 📄 Licens

MIT License - Fri att använda för kommersiella ändamål.
