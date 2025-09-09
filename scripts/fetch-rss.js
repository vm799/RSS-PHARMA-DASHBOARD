const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Verified working RSS feeds for pharmaceutical industry monitoring
const RSS_FEEDS = [
  'https://www.biopharmadive.com/feeds/news/',
  'https://feeds.feedburner.com/fiercebiotech',
  'https://feeds.feedburner.com/fiercepharma',
  'https://www.pharmtech.com/rss',
  'https://www.outsourcing-pharma.com/RSS/News',
  'https://www.in-pharmatechnologist.com/RSS/News',
  'https://feeds.feedburner.com/PharmaTimes-News',
  'https://www.clinicalleader.com/rss',
  'https://www.appliedclinicaltrialsonline.com/rss',
  'https://www.raps.org/news-and-articles/rss',
  'https://www.bioworld.com/rss/bioworld-news.xml',
  'https://www.thefdalawblog.com/feed'
];

// Trigger keywords from automation.js
const TRIGGER_KEYWORDS = [
  'FDA approval', 'drug approval', 'clinical trial', 'phase III', 'phase II', 'phase I',
  'patent expiry', 'patent expiration', 'generic drug', 'biosimilar', 'breakthrough therapy',
  'orphan drug', 'rare disease', 'accelerated approval', 'priority review', 'fast track',
  'regulatory approval', 'new indication', 'label expansion', 'market authorization',
  'EMA approval', 'CE marking', 'regulatory submission', 'NDA', 'BLA', 'ANDA',
  'clinical data', 'efficacy', 'safety profile', 'adverse events', 'side effects',
  'market launch', 'commercialization', 'partnership', 'licensing deal', 'acquisition',
  'merger', 'collaboration', 'joint venture', 'milestone payment', 'upfront payment',
  'royalty', 'licensing agreement', 'development program', 'pipeline', 'portfolio'
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

async function main() {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const allItems = [];
  const feedResults = {};

  console.log('Fetching RSS feeds...');
  
  for (const feedUrl of RSS_FEEDS) {
    console.log(`Fetching: ${feedUrl}`);
    const feedData = await fetchRSSFeed(feedUrl);
    
    if (feedData && feedData.items) {
      feedResults[feedUrl] = {
        title: feedData.feed?.title || 'Unknown Feed',
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
            source: feedData.feed?.title || 'Unknown Feed',
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
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Sort by score and date
  allItems.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.pubDate) - new Date(a.pubDate);
  });

  // Save individual feed data
  fs.writeFileSync(
    path.join(dataDir, 'feeds.json'), 
    JSON.stringify(feedResults, null, 2)
  );

  // Save processed leads
  fs.writeFileSync(
    path.join(dataDir, 'leads.json'), 
    JSON.stringify(allItems.slice(0, 50), null, 2) // Top 50 leads
  );

  // Save metadata
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

  fs.writeFileSync(
    path.join(dataDir, 'metadata.json'), 
    JSON.stringify(metadata, null, 2)
  );

  console.log(`\nProcessing complete:`);
  console.log(`- Feeds processed: ${metadata.successfulFeeds}/${metadata.totalFeeds}`);
  console.log(`- Total leads found: ${metadata.totalLeads}`);
  console.log(`- Data saved to: ${dataDir}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };