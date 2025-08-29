// Pharma Lead Generation Automation Script
// This script can be run with Node.js to automatically collect and process leads

const fs = require('fs');
const https = require('https');
const path = require('path');

// Configuration
const CONFIG = {
  outputFile: 'daily-leads.json',
  csvOutputFile: 'daily-leads.csv',
  backupDays: 7,
  emailThreshold: 5, // Minimum triggers to send email alert
  webhookUrl: process.env.SLACK_WEBHOOK || null // Optional Slack integration
};

// Enhanced RSS feeds for comprehensive coverage
const RSS_FEEDS = {
  "FDA News": "https://api.rss2json.com/v1/api.json?rss_url=https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/food-and-drug-administration/rss.xml",
  "FDA Warning Letters": "https://api.rss2json.com/v1/api.json?rss_url=https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters",
  "Pharmaphorum": "https://api.rss2json.com/v1/api.json?rss_url=https://pharmaphorum.com/rssfeed/news",
  "Pharmaceutical Executive": "https://api.rss2json.com/v1/api.json?rss_url=https://www.pharmexec.com/rss",
  "FDA Law Blog": "https://api.rss2json.com/v1/api.json?rss_url=https://www.thefdalawblog.com/feed",
  "PharmTech News": "https://api.rss2json.com/v1/api.json?rss_url=https://www.pharmtech.com/rss",
  "FierceBiotech": "https://api.rss2json.com/v1/api.json?rss_url=https://www.fiercebiotech.com/rss/feed",
  "BioPharma Dive": "https://api.rss2json.com/v1/api.json?rss_url=https://www.biopharmadive.com/feeds/news/",
  "Regulatory Affairs": "https://api.rss2json.com/v1/api.json?rss_url=https://www.raps.org/news-and-articles/news-articles",
  "SEC Pharma Filings": "https://api.rss2json.com/v1/api.json?rss_url=https://www.sec.gov/Archives/edgar/xbrlrss.all.xml",
  "ClinicalTrials.gov": "https://api.rss2json.com/v1/api.json?rss_url=https://clinicaltrials.gov/ct2/results/rss.xml",
  "EMA News": "https://api.rss2json.com/v1/api.json?rss_url=https://www.ema.europa.eu/en/news/rss.xml"
};

// Enhanced trigger keywords with scoring
const TRIGGER_KEYWORDS = {
  'warning-letter': {
    keywords: ['warning letter', '483', 'FDA inspection', 'compliance violation', 'regulatory action', 'enforcement', 'violation', 'non-compliance', 'citation', 'form 483'],
    score: 10
  },
  'patent-expiry': {
    keywords: ['patent expiry', 'patent cliff', 'exclusivity', 'generic competition', 'patent challenge', 'intellectual property', 'patent litigation', 'ANDA'],
    score: 8
  },
  'compliance-issue': {
    keywords: ['recall', 'safety issue', 'adverse event', 'regulatory issue', 'compliance failure', 'quality issue', 'manufacturing defect', 'contamination'],
    score: 9
  },
  'trial-difficulty': {
    keywords: ['trial failure', 'phase II', 'endpoint not met', 'enrollment challenge', 'trial delay', 'FDA hold', 'clinical hold', 'trial terminated'],
    score: 7
  },
  'investment-need': {
    keywords: ['funding', 'investment', 'capital raise', 'series', 'IPO', 'financial difficulty', 'cash runway', 'financing', 'venture capital'],
    score: 6
  },
  'regulatory-delay': {
    keywords: ['FDA delay', 'approval delay', 'regulatory setback', 'CRL', 'complete response letter', 'PDUFA', 'submission delay'],
    score: 8
  },
  'orphan-drug': {
    keywords: ['orphan drug', 'rare disease', 'orphan designation', 'pediatric', 'unmet medical need'],
    score: 7
  },
  'merger-acquisition': {
    keywords: ['merger', 'acquisition', 'takeover', 'buyout', 'strategic partnership', 'licensing deal'],
    score: 5
  }
};

// Enhanced company database
const PHARMA_COMPANIES = [
  // Big Pharma
  'Pfizer', 'Johnson & Johnson', 'Roche', 'Novartis', 'Merck', 'AbbVie', 'Sanofi',
  'GlaxoSmithKline', 'Gilead', 'Amgen', 'Bristol Myers Squibb', 'AstraZeneca',
  'Eli Lilly', 'Biogen', 'Regeneron', 'Vertex', 'Moderna', 'BioNTech',
  // Mid-cap and Biotech
  'Illumina', 'Alexion', 'Incyte', 'Alnylam', 'Biomarin', 'Celgene', 'Genmab',
  'Horizon Therapeutics', 'Jazz Pharmaceuticals', 'Neurocrine', 'Sarepta',
  'Ultragenyx', 'Bluebird Bio', 'CRISPR Therapeutics', 'Editas Medicine'
];

class LeadProcessor {
  constructor() {
    this.triggers = [];
    this.processedToday = 0;
    this.startTime = Date.now();
  }

  async fetchFeed(name, url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ name, data: parsed });
          } catch (e) {
            reject(new Error(`Failed to parse ${name}: ${e.message}`));
          }
        });
      }).on('error', reject);
    });
  }

  extractCompanyName(title) {
    // Check for known pharma companies first
    for (const company of PHARMA_COMPANIES) {
      if (title.toLowerCase().includes(company.toLowerCase())) {
        return company;
      }
    }

    // Try to extract company names using patterns
    const patterns = [
      /([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)*(?:,? Inc\.?|,? Corp\.?|,? Ltd\.?|,? Pharmaceuticals?|,? Biotech|,? Therapeutics))/g,
      /([A-Z][A-Za-z]+(?:[A-Z][A-Za-z]+)*)/g // CamelCase company names
    ];

    for (const pattern of patterns) {
      const matches = title.match(pattern);
      if (matches && matches.length > 0) {
        // Filter out common non-company words
        const filtered = matches.filter(match => 
          !['FDA', 'SEC', 'EMA', 'News', 'Report', 'Study', 'Trial', 'Drug'].includes(match)
        );
        if (filtered.length > 0) {
          return filtered[0];
        }
      }
    }

    return 'Unknown Company';
  }

  analyzeTrigger(item, source) {
    const title = (item.title || '').toLowerCase();
    const description = (item.description || '').toLowerCase();
    const content = title + ' ' + description;

    let bestMatch = null;
    let highestScore = 0;

    // Find the best matching trigger type
    for (const [triggerType, config] of Object.entries(TRIGGER_KEYWORDS)) {
      const matchCount = config.keywords.filter(keyword => 
        content.includes(keyword.toLowerCase())
      ).length;

      if (matchCount > 0) {
        const score = matchCount * config.score;
        if (score > highestScore) {
          highestScore = score;
          bestMatch = triggerType;
        }
      }
    }

    if (!bestMatch) return null;

    const company = this.extractCompanyName(item.title);
    const priority = this.calculatePriority(content, highestScore);

    return {
      id: this.generateId(),
      title: item.title,
      description: item.description || '',
      link: item.link,
      source: source,
      date: item.pubDate || new Date().toISOString(),
      triggerType: bestMatch,
      priority: priority,
      score: highestScore,
      company: company,
      actionable: this.generateActionableInsights(bestMatch, company, item.title),
      contacts: this.generatePotentialContacts(company),
      processed: new Date().toISOString()
    };
  }

  calculatePriority(content, score) {
    // High priority triggers
    if (content.includes('warning letter') || content.includes('483') || 
        content.includes('recall') || content.includes('fda hold')) {
      return 'critical';
    }
    
    // Medium-high priority
    if (score >= 15 || content.includes('fda') || content.includes('compliance') || 
        content.includes('failure') || content.includes('delay')) {
      return 'high';
    }
    
    // Default priority based on score
    return score >= 10 ? 'medium' : 'low';
  }

  generateActionableInsights(triggerType, company, title) {
    const insights = {
      'warning-letter': `🚨 ${company} received FDA enforcement action. High-value opportunity for regulatory compliance solutions and data management services.`,
      'patent-expiry': `⏰ ${company} facing patent cliff. Opportunity for competitive intelligence, market access data, and generic competition analysis.`,
      'compliance-issue': `⚠️ ${company} experiencing quality/safety issues. Opportunity for regulatory data solutions and compliance monitoring tools.`,
      'trial-difficulty': `🧪 ${company} struggling with clinical development. Opportunity for trial optimization, biostatistics, and regulatory strategy services.`,
      'investment-need': `💰 ${company} seeking capital. Opportunity for due diligence data, market analysis, and valuation support services.`,
      'regulatory-delay': `📋 ${company} facing regulatory hurdles. Opportunity for regulatory intelligence and submission optimization services.`,
      'orphan-drug': `🏥 ${company} in rare disease space. Opportunity for specialized regulatory pathways and market access solutions.`,
      'merger-acquisition': `🤝 ${company} involved in M&A activity. Opportunity for due diligence data and competitive intelligence services.`
    };
    
    return insights[triggerType] || `📊 Opportunity to engage ${company} with relevant medical research platform solutions.`;
  }

  generatePotentialContacts(company) {
    const cleanCompany = company.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    
    return [
      { 
        role: 'Chief Medical Officer', 
        email: `cmo@${cleanCompany}.com`,
        priority: 'high',
        department: 'Medical Affairs'
      },
      { 
        role: 'VP Regulatory Affairs', 
        email: `regulatory@${cleanCompany}.com`,
        priority: 'high',
        department: 'Regulatory'
      },
      { 
        role: 'Head of Clinical Development', 
        email: `clinical@${cleanCompany}.com`,
        priority: 'medium',
        department: 'Clinical'
      },
      { 
        role: 'Director of Market Access', 
        email: `marketaccess@${cleanCompany}.com`,
        priority: 'medium',
        department: 'Commercial'
      },
      { 
        role: 'Head of Business Development', 
        email: `bizdev@${cleanCompany}.com`,
        priority: 'medium',
        department: 'Business Development'
      }
    ];
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  async processAllFeeds() {
    console.log('🔄 Starting lead generation process...');
    
    const feedPromises = Object.entries(RSS_FEEDS).map(async ([name, url]) => {
      try {
        const result = await this.fetchFeed(name, url);
        console.log(`✅ Fetched ${name}: ${result.data.items?.length || 0} items`);
        return result;
      } catch (error) {
        console.error(`❌ Error fetching ${name}:`, error.message);
        return null;
      }
    });

    const results = await Promise.all(feedPromises);
    
    // Process all feed items
    for (const result of results) {
      if (result && result.data.items) {
        for (const item of result.data.items) {
          const trigger = this.analyzeTrigger(item, result.name);
          if (trigger) {
            this.triggers.push(trigger);
            this.processedToday++;
          }
        }
      }
    }

    // Sort by priority and score
    this.triggers.sort((a, b) => {
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0) || 
             b.score - a.score ||
             new Date(b.date) - new Date(a.date);
    });

    console.log(`🎯 Found ${this.triggers.length} actionable triggers`);
    return this.triggers;
  }

  generateReport() {
    const stats = {
      total: this.triggers.length,
      critical: this.triggers.filter(t => t.priority === 'critical').length,
      high: this.triggers.filter(t => t.priority === 'high').length,
      medium: this.triggers.filter(t => t.priority === 'medium').length,
      low: this.triggers.filter(t => t.priority === 'low').length,
      byTrigger: {},
      topCompanies: {},
      processingTime: Date.now() - this.startTime
    };

    // Count by trigger type
    for (const trigger of this.triggers) {
      stats.byTrigger[trigger.triggerType] = (stats.byTrigger[trigger.triggerType] || 0) + 1;
      stats.topCompanies[trigger.company] = (stats.topCompanies[trigger.company] || 0) + 1;
    }

    return stats;
  }

  async saveResults() {
    const timestamp = new Date().toISOString();
    const report = this.generateReport();
    
    const output = {
      timestamp,
      report,
      triggers: this.triggers
    };

    // Save JSON
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(output, null, 2));
    
    // Save CSV for easy import
    const csvContent = this.generateCSV();
    fs.writeFileSync(CONFIG.csvOutputFile, csvContent);
    
    // Create backup
    const backupFile = `backup-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(backupFile, JSON.stringify(output, null, 2));
    
    console.log(`💾 Results saved to ${CONFIG.outputFile} and ${CONFIG.csvOutputFile}`);
    return { report, triggers: this.triggers };
  }

  generateCSV() {
    const headers = [
      'Date', 'Priority', 'Company', 'Trigger Type', 'Title', 'Description', 
      'Outreach Strategy', 'Contact Role', 'Contact Email', 'Contact Priority',
      'Email Subject', 'Generated Email Copy', 'Source', 'URL', 'Score'
    ];

    const rows = [headers.join(',')];

    for (const trigger of this.triggers) {
      // Generate email for this trigger
      const emailContent = this.generatePersonalizedEmail(trigger);
      const emailLines = emailContent.split('\n');
      const subject = emailLines[0].replace('Subject: ', '');
      const emailBody = emailLines.slice(2).join('\n');
      
      for (const contact of trigger.contacts) {
        rows.push([
          `"${new Date(trigger.date).toLocaleDateString()}"`,
          `"${trigger.priority}"`,
          `"${trigger.company}"`,
          `"${trigger.triggerType}"`,
          `"${trigger.title.replace(/"/g, '""')}"`,
          `"${trigger.description.substring(0, 200).replace(/"/g, '""')}"`,
          `"${trigger.actionable.replace(/"/g, '""')}"`,
          `"${contact.role}"`,
          `"${contact.email}"`,
          `"${contact.priority}"`,
          `"${subject.replace(/"/g, '""')}"`,
          `"${emailBody.replace(/"/g, '""')}"`,
          `"${trigger.source}"`,
          `"${trigger.link}"`,
          `"${trigger.score}"`
        ].join(','));
      }
    }

    return rows.join('\n');
  }

  generatePersonalizedEmail(trigger) {
    // SyneticX company information and value propositions
    const SYNETICX_INFO = {
      companyName: 'SyneticX',
      tagline: 'Medical Intelligence Consultancy',
      website: 'www.syneticx.com',
      valueProps: {
        'warning-letter': {
          expertise: 'regulatory compliance optimization',
          solution: 'AI-powered compliance monitoring and predictive analytics',
          benefit: 'prevent future regulatory issues and accelerate approvals',
          caseStudy: 'helped 15+ pharmaceutical companies achieve zero 483 observations over 2 years'
        },
        'patent-expiry': {
          expertise: 'competitive intelligence and market access strategy',
          solution: 'comprehensive patent landscape analysis and generic entry predictions',
          benefit: 'maximize exclusivity periods and prepare for competitive threats',
          caseStudy: 'generated $300M+ in preserved revenue through strategic patent cliff management'
        },
        'compliance-issue': {
          expertise: 'quality management and regulatory remediation',
          solution: 'real-time quality intelligence and remediation roadmaps',
          benefit: 'resolve compliance issues faster and prevent recurring problems',
          caseStudy: 'reduced average remediation time by 60% for Fortune 500 pharma clients'
        },
        'trial-difficulty': {
          expertise: 'clinical development optimization',
          solution: 'predictive trial analytics and regulatory strategy consulting',
          benefit: 'improve trial success rates and accelerate time-to-market',
          caseStudy: 'increased Phase II success rates by 40% through data-driven protocol optimization'
        },
        'investment-need': {
          expertise: 'pharmaceutical valuation and due diligence',
          solution: 'comprehensive market intelligence and competitive analysis',
          benefit: 'support funding rounds with robust data and market insights',
          caseStudy: 'supported $2B+ in pharmaceutical transactions with critical market intelligence'
        },
        'regulatory-delay': {
          expertise: 'regulatory strategy and submission optimization',
          solution: 'FDA interaction intelligence and submission enhancement services',
          benefit: 'navigate regulatory challenges and accelerate approval timelines',
          caseStudy: 'reduced average CRL resolution time by 8 months for biotech clients'
        }
      }
    };

    const valueProps = SYNETICX_INFO.valueProps[trigger.triggerType] || SYNETICX_INFO.valueProps['compliance-issue'];
    const storyDetails = this.extractStoryDetails(trigger);
    
    const subject = `Strategic Support Following ${trigger.company}'s ${this.getTriggerLabel(trigger.triggerType)}`;
    
    const emailBody = `Dear [Contact Name],

I hope this message finds you well. I'm reaching out from ${SYNETICX_INFO.companyName}, a leading ${SYNETICX_INFO.tagline} that specializes in ${valueProps.expertise}.

I noticed the recent development regarding ${trigger.company}'s ${storyDetails.issue || 'situation'} as reported in ${trigger.source}. Having worked extensively with pharmaceutical companies facing similar challenges, I understand the complexities and strategic considerations this presents for your organization.

At ${SYNETICX_INFO.companyName}, we have a proven track record in addressing these exact challenges. Our ${valueProps.solution} has enabled pharmaceutical leaders to ${valueProps.benefit}. Specifically, we have ${valueProps.caseStudy}.

Given ${trigger.company}'s current situation, we believe our expertise could provide significant value by:

• Providing real-time intelligence and analytics to navigate the current challenge
• Developing strategic roadmaps based on successful outcomes with similar companies
• Offering regulatory and competitive insights to optimize decision-making
• Supporting your team with proven methodologies and industry best practices

I would welcome the opportunity to discuss how ${SYNETICX_INFO.companyName} can support ${trigger.company} during this critical period. Our approach is always confidential, collaborative, and focused on delivering measurable outcomes that align with your business objectives.

Would you be available for a brief 15-minute conversation this week to explore how we might assist? I'm confident that our specialized expertise in ${valueProps.expertise} could provide valuable insights for your strategic planning.

Thank you for your time and consideration. I look forward to the possibility of supporting ${trigger.company}'s continued success.

Best regards,

[Your Name]
${SYNETICX_INFO.companyName} | ${SYNETICX_INFO.tagline}
[Your Title] | [Your Phone] | [Your Email]
${SYNETICX_INFO.website}

---
This communication is confidential and intended solely for the addressee. If you have received this message in error, please notify the sender immediately.`;

    return `Subject: ${subject}\n\n${emailBody}`;
  }

  extractStoryDetails(trigger) {
    const title = trigger.title.toLowerCase();
    const description = trigger.description.toLowerCase();
    
    let issue = '';
    
    // Extract specific issue details based on trigger type
    switch (trigger.triggerType) {
      case 'warning-letter':
        if (title.includes('manufacturing')) issue = 'manufacturing violations';
        else if (title.includes('clinical')) issue = 'clinical trial deficiencies';
        else if (title.includes('quality')) issue = 'quality control issues';
        else if (title.includes('data')) issue = 'data integrity concerns';
        else issue = 'regulatory compliance deficiencies';
        break;
      case 'patent-expiry':
        if (title.includes('expir')) issue = 'patent expiration';
        else if (title.includes('challenge')) issue = 'patent challenge';
        else issue = 'intellectual property concerns';
        break;
      case 'compliance-issue':
        if (title.includes('recall')) issue = 'product recall';
        else if (title.includes('contamina')) issue = 'contamination issues';
        else issue = 'compliance violations';
        break;
      case 'trial-difficulty':
        if (title.includes('failed')) issue = 'missed primary endpoints';
        else if (title.includes('enrollment')) issue = 'enrollment challenges';
        else issue = 'clinical development setbacks';
        break;
      default:
        issue = 'situation';
    }
    
    return { issue };
  }

  getTriggerLabel(triggerType) {
    const labels = {
      'warning-letter': 'FDA Warning Letter',
      'patent-expiry': 'Patent Concerns',
      'compliance-issue': 'Compliance Issue',
      'trial-difficulty': 'Clinical Trial Challenge',
      'investment-need': 'Investment Opportunity',
      'regulatory-delay': 'Regulatory Delay'
    };
    return labels[triggerType] || triggerType;
  }

  async cleanup() {
    // Clean up old backup files
    const files = fs.readdirSync('./').filter(f => f.startsWith('backup-') && f.endsWith('.json'));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - CONFIG.backupDays);

    for (const file of files) {
      const fileDate = new Date(file.match(/backup-(\d{4}-\d{2}-\d{2})/)?.[1]);
      if (fileDate < cutoff) {
        fs.unlinkSync(file);
        console.log(`🗑️ Cleaned up old backup: ${file}`);
      }
    }
  }

  async sendSlackNotification(report) {
    if (!CONFIG.webhookUrl || report.critical === 0) return;

    const message = {
      text: `🚨 Pharma Lead Alert: ${report.critical} critical triggers found!`,
      attachments: [{
        color: 'danger',
        fields: [
          { title: 'Critical Triggers', value: report.critical, short: true },
          { title: 'High Priority', value: report.high, short: true },
          { title: 'Total Leads', value: report.total, short: true },
          { title: 'Processing Time', value: `${report.processingTime}ms`, short: true }
        ]
      }]
    };

    // Implementation would require http request to Slack webhook
    console.log('📢 Slack notification prepared (implement webhook call)');
  }
}

// Main execution
async function main() {
  const processor = new LeadProcessor();
  
  try {
    await processor.processAllFeeds();
    const { report } = await processor.saveResults();
    await processor.cleanup();
    await processor.sendSlackNotification(report);
    
    console.log('\n📊 Daily Report Summary:');
    console.log(`   Critical Triggers: ${report.critical}`);
    console.log(`   High Priority: ${report.high}`);
    console.log(`   Total Actionable Leads: ${report.total}`);
    console.log(`   Processing Time: ${report.processingTime}ms`);
    console.log(`   Top Trigger Types:`, Object.entries(report.byTrigger)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type, count]) => `${type}(${count})`)
      .join(', '));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error in main process:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { LeadProcessor, CONFIG, RSS_FEEDS, TRIGGER_KEYWORDS };