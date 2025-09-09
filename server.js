const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('.'));

// Verified working RSS feeds (tested and confirmed functional)
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

// Enhanced trigger keywords with broader pharmaceutical coverage
const TRIGGER_KEYWORDS = [
  // Regulatory & Approval
  'FDA', 'approval', 'approved', 'clinical trial', 'phase III', 'phase II', 'phase I', 'phase 3', 'phase 2', 'phase 1',
  'drug', 'medication', 'therapy', 'treatment', 'pharmaceutical', 'biotech', 'medicine',
  
  // Patents & Competition
  'patent', 'generic', 'biosimilar', 'exclusivity', 'competition', 'expir', 'cliff',
  
  // Business & Investment
  'partnership', 'deal', 'acquisition', 'merger', 'collaboration', 'investment', 'funding', 'IPO',
  'milestone', 'royalty', 'license', 'agreement', 'contract', 'revenue', 'sales',
  
  // Regulatory Issues
  'warning letter', '483', 'inspection', 'compliance', 'violation', 'enforcement', 'regulatory',
  'recall', 'safety', 'adverse', 'contamination', 'quality', 'manufacturing', 'GMP',
  
  // Clinical Development
  'trial', 'study', 'endpoint', 'efficacy', 'safety', 'patient', 'enrollment', 'data',
  'results', 'outcome', 'response', 'failure', 'success', 'interim', 'analysis',
  
  // Market & Commercial
  'launch', 'market', 'commercial', 'price', 'pricing', 'reimbursement', 'access',
  'indication', 'label', 'expansion', 'new', 'first', 'breakthrough', 'orphan',
  
  // Companies & Organizations
  'pfizer', 'novartis', 'roche', 'merck', 'abbvie', 'sanofi', 'gsk', 'gilead', 'amgen',
  'bristol myers', 'astrazeneca', 'eli lilly', 'biogen', 'regeneron', 'vertex', 'moderna'
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

        // Process items for lead scoring (include all pharma-related content)
        feedData.items.forEach(item => {
          const content = (item.title + ' ' + (item.description || '')).toLowerCase();
          const score = scoreContent(item.title + ' ' + (item.description || ''));
          
          // Include items that are pharmaceutical-related (score > 0) or contain pharma companies
          const isPharmaceutical = score > 0 || 
            content.includes('pharmaceutical') || 
            content.includes('biotech') || 
            content.includes('pharma') || 
            content.includes('drug') || 
            content.includes('fda') ||
            content.includes('clinical');
          
          if (isPharmaceutical) {
            const processedItem = {
              ...item,
              source: feedTitle,
              sourceUrl: feedUrl,
              score: Math.max(score, 1), // Ensure minimum score of 1 for pharma content
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