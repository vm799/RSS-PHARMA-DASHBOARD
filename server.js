const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('.'));

// Verified working RSS feeds
const RSS_FEEDS = [
  'https://www.pharmaphorum.com/feed/',
  'https://www.biopharmadive.com/feeds/news/',
  'https://feeds.feedburner.com/fiercebiotech',
  'https://www.pharmtech.com/rss',
  'https://feeds.feedburner.com/fiercepharma',
  'https://www.outsourcing-pharma.com/RSS/News',
  'https://www.in-pharmatechnologist.com/RSS/News',
  'https://feeds.feedburner.com/PharmaTimes-News',
  'https://www.nature.com/nrd.rss',
  'https://www.clinicalleader.com/rss',
  'https://www.appliedclinicaltrialsonline.com/rss',
  'https://www.raps.org/news-and-articles/rss',
  'https://www.thefdalawblog.com/feed',
  'https://clinicaltrials.gov/ct2/results/rss.xml?lup_d=14',
  'https://www.bioworld.com/rss/bioworld-news.xml'
];

// Trigger keywords for pharmaceutical monitoring
const TRIGGER_KEYWORDS = [
  'FDA approval', 'drug approval', 'clinical trial', 'phase III', 'phase II', 'phase I',
  'patent expiry', 'patent expiration', 'generic drug', 'biosimilar', 'breakthrough therapy',
  'orphan drug', 'rare disease', 'accelerated approval', 'priority review', 'fast track',
  'regulatory approval', 'new indication', 'label expansion', 'market authorization',
  'EMA approval', 'CE marking', 'regulatory submission', 'NDA', 'BLA', 'ANDA',
  'clinical data', 'efficacy', 'safety profile', 'adverse events', 'side effects',
  'market launch', 'commercialization', 'partnership', 'licensing deal', 'acquisition',
  'merger', 'collaboration', 'joint venture', 'milestone payment', 'upfront payment',
  'royalty', 'licensing agreement', 'development program', 'pipeline', 'portfolio',
  'warning letter', '483', 'FDA inspection', 'compliance violation', 'regulatory action',
  'recall', 'safety issue', 'manufacturing defect', 'contamination', 'quality issue'
];

async function fetchRSSFeed(url) {
  try {
    const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return null;
  }
}

function scoreContent(content) {
  const lowerContent = content.toLowerCase();
  let score = 0;
  
  TRIGGER_KEYWORDS.forEach(keyword => {
    if (lowerContent.includes(keyword.toLowerCase())) {
      score += 1;
    }
  });
  
  return score;
}

function classifyLead(item, score) {
  const content = (item.title + ' ' + item.description).toLowerCase();
  
  if (content.includes('fda approval') || content.includes('breakthrough therapy')) {
    return 'regulatory';
  } else if (content.includes('partnership') || content.includes('acquisition')) {
    return 'business';
  } else if (content.includes('clinical trial') || content.includes('phase')) {
    return 'clinical';
  } else if (content.includes('patent') || content.includes('generic')) {
    return 'intellectual-property';
  }
  
  return 'general';
}

// API endpoint to fetch and process RSS feeds
app.get('/api/rss-data', async (req, res) => {
  try {
    console.log('Fetching RSS feeds...');
    const allItems = [];
    const feedResults = {};

    for (const feedUrl of RSS_FEEDS) {
      console.log(`Fetching: ${feedUrl}`);
      const feedData = await fetchRSSFeed(feedUrl);
      
      if (feedData && feedData.items) {
        const feedTitle = feedData.feed?.title || 'Unknown Feed';
        feedResults[feedUrl] = {
          title: feedTitle,
          url: feedUrl,
          lastUpdated: new Date().toISOString(),
          items: feedData.items.slice(0, 10) // Keep latest 10 items per feed
        };

        // Process items for lead scoring
        feedData.items.forEach(item => {
          const score = scoreContent(item.title + ' ' + item.description);
          if (score > 0) {
            const processedItem = {
              ...item,
              source: feedTitle,
              sourceUrl: feedUrl,
              score: score,
              category: classifyLead(item, score),
              processedAt: new Date().toISOString()
            };
            allItems.push(processedItem);
          }
        });
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Sort by score and date
    allItems.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.pubDate) - new Date(a.pubDate);
    });

    // Create metadata
    const metadata = {
      lastUpdated: new Date().toISOString(),
      totalFeeds: RSS_FEEDS.length,
      successfulFeeds: Object.keys(feedResults).length,
      totalLeads: allItems.length,
      categories: {
        regulatory: allItems.filter(i => i.category === 'regulatory').length,
        business: allItems.filter(i => i.category === 'business').length,
        clinical: allItems.filter(i => i.category === 'clinical').length,
        'intellectual-property': allItems.filter(i => i.category === 'intellectual-property').length,
        general: allItems.filter(i => i.category === 'general').length
      }
    };

    res.json({
      leads: allItems.slice(0, 50), // Top 50 leads
      feeds: feedResults,
      metadata: metadata
    });

    console.log(`Processing complete: ${metadata.totalLeads} leads from ${metadata.successfulFeeds}/${metadata.totalFeeds} feeds`);

  } catch (error) {
    console.error('Error processing RSS feeds:', error);
    res.status(500).json({ error: 'Failed to fetch RSS data' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint serves the dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Pharma Lead Generation Dashboard running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api/rss-data`);
});