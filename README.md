# 🚀 Pharma Lead Generation Dashboard

An intelligent, automated dashboard for identifying pharmaceutical outreach opportunities through real-time RSS monitoring of regulatory events, compliance issues, patent cliffs, and investment needs.

## 🎯 What This Tool Does

This dashboard transforms pharmaceutical news into actionable sales leads by:

- **Monitoring 12+ pharma-specific RSS feeds** for regulatory triggers
- **Detecting key events** like FDA warning letters, patent expiries, trial failures, and funding needs  
- **Extracting company names** and categorizing by outreach priority
- **Generating contact suggestions** with role-specific email addresses
- **Providing ready-to-use outreach strategies** for each trigger type
- **Exporting leads** to CSV for CRM import

## 🔥 Key Features

### Real-Time Trigger Detection
- **Warning Letters & 483s**: FDA enforcement actions
- **Patent Expiries**: Companies facing generic competition  
- **Trial Difficulties**: Failed endpoints, enrollment issues, FDA holds
- **Compliance Issues**: Recalls, safety problems, quality failures
- **Investment Needs**: Funding rounds, financial difficulties
- **Regulatory Delays**: CRLs, approval setbacks

### Smart Lead Prioritization  
- **Critical**: Warning letters, recalls, FDA holds
- **High**: Compliance failures, regulatory delays
- **Medium**: Patent issues, trial difficulties
- **Low**: General funding news

### Contact Intelligence
- Automatically suggests key contacts (CMO, Regulatory VP, Clinical Head)
- Role-specific email generation
- Department categorization for targeted outreach

## 🚀 Quick Start

### Option 1: Browser Dashboard (Recommended)
1. Open `index.html` in your web browser
2. Click "Refresh Data" to scan latest pharmaceutical news
3. Filter by trigger type and priority
4. Click any lead to see detailed outreach strategy
5. Export leads to CSV for your CRM

### Option 2: Automated Daily Processing
```bash
# Run daily automation script
node automation.js

# Schedule daily runs (add to crontab)
0 9 * * * cd /path/to/pharma-dashboard && node automation.js
```

## 📊 Dashboard Overview

### Stats Panel
- Real-time counts of critical triggers
- Warning letter alerts
- Patent cliff monitoring  
- Investment opportunity tracking

### Lead Cards
Each trigger displays:
- **Company name** and news source
- **Priority level** (Critical/High/Medium/Low)
- **Trigger category** with color coding
- **Actionable outreach opportunity**
- **Direct link** to original news article

### Lead Details Modal
- Complete trigger analysis
- Suggested outreach strategy
- 4-5 potential contacts with emails
- Original article link
- "Mark as Contacted" tracking

## 🎯 Outreach Strategies by Trigger Type

### Warning Letters & 483s
> "Hi [Name], I noticed [Company] recently received an FDA warning letter regarding [specific issue]. We help pharmaceutical companies strengthen their regulatory compliance through real-time data monitoring and predictive analytics. Would you be interested in a brief call to discuss how we can help prevent future compliance issues?"

### Patent Expiries
> "Hi [Name], With [Drug]'s patent expiring soon, [Company] is likely evaluating competitive intelligence and market access strategies. Our platform provides comprehensive generic competition analysis and market entry predictions. Could we schedule 15 minutes to show you how this could support your strategic planning?"

### Trial Difficulties
> "Hi [Name], I saw that [Company]'s recent Phase II trial faced [specific challenge]. We specialize in helping biotech companies optimize their clinical development through advanced analytics and regulatory intelligence. Would you be open to a brief conversation about how we could support your future trials?"

## 📈 Data Sources

The dashboard monitors these key pharmaceutical information sources:

- **FDA News & Alerts** - Official regulatory announcements
- **FDA Warning Letters** - Enforcement actions and 483s
- **Pharmaphorum** - Industry news and analysis  
- **FierceBiotech** - Breaking biotech developments
- **BioPharma Dive** - Investment and M&A activity
- **Regulatory Affairs Professionals** - Compliance insights
- **ClinicalTrials.gov** - Trial status updates
- **SEC Pharmaceutical Filings** - Financial disclosures
- **EMA European Medicines** - EU regulatory actions

## 🔧 Customization

### Adding New RSS Feeds
Edit the `rssFeeds` object in `index.html` or `RSS_FEEDS` in `automation.js`:

```javascript
"Your Source Name": "https://api.rss2json.com/v1/api.json?rss_url=YOUR_RSS_URL"
```

### Adjusting Trigger Keywords  
Modify the `triggerKeywords` object to capture different events:

```javascript
'custom-trigger': ['keyword1', 'keyword2', 'keyword3']
```

### Contact Email Templates
Update the `generatePotentialContacts()` function to change email formats or add new roles.

## 📧 Integration Tips

### CRM Integration
1. Use "Export Leads" to download CSV
2. Import into Salesforce, HubSpot, or your CRM
3. Set up automated follow-up sequences
4. Track outreach success rates by trigger type

### Slack Notifications
Set environment variable `SLACK_WEBHOOK` to get alerts for critical triggers:
```bash
export SLACK_WEBHOOK=https://hooks.slack.com/your-webhook-url
```

### Daily Automation
Add to crontab for automatic daily lead generation:
```bash
# Edit crontab
crontab -e

# Add this line for daily 9am execution
0 9 * * * cd /path/to/pharma-dashboard && node automation.js
```

## 🎪 Example Use Cases

### Scenario 1: FDA Warning Letter
**Trigger**: "Acme Pharma receives FDA warning letter for manufacturing violations"
**Opportunity**: Regulatory compliance and quality management solutions
**Priority**: Critical
**Contacts**: CMO, VP Regulatory Affairs, Head of Quality

### Scenario 2: Patent Cliff
**Trigger**: "BigPharma's blockbuster drug patent expires next year"  
**Opportunity**: Competitive intelligence and market access consulting
**Priority**: High
**Contacts**: CMO, Director Market Access, Head of Business Development

### Scenario 3: Trial Failure
**Trigger**: "StartupBio's Phase II trial fails to meet primary endpoint"
**Opportunity**: Clinical development optimization and biostatistics support  
**Priority**: Medium
**Contacts**: Head of Clinical Development, CMO, VP R&D

## 📱 Mobile Support

The dashboard is fully responsive and works on mobile devices for checking leads on-the-go.

## 🔒 Privacy & Compliance

- All data is processed client-side
- No personal data is stored or transmitted
- RSS feeds are public information sources
- Email suggestions are generated, not harvested

## 🛠️ Technical Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for RSS feed access
- Node.js 14+ (for automation scripts)

## 📞 Support

For questions about implementation or customization, reach out to your development team or create an issue in the repository.

---

**Ready to turn pharmaceutical news into sales opportunities?** 🎯

Open `index.html` and start identifying leads today!