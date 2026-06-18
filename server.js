const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// List of technologies and their match patterns
const SKILLS_MAP = {
  'React': /\bReact\b/gi,
  'Python': /\bPython\b/gi,
  'TypeScript': /\bTypeScript\b|\bTS\b/gi,
  'JavaScript': /\bJavaScript\b|\bJS\b/gi,
  'Node.js': /\bNode(?:\.js)?\b|\bNodeJS\b/gi,
  'Go': /\bGo\b|\bGolang\b/g, // case-sensitive for Go to avoid matching verbs
  'Rust': /\bRust\b/gi,
  'Ruby': /\bRuby\b/gi,
  'Rails': /\bRails\b|\bRuby on Rails\b/gi,
  'Java': /\bJava\b/g,
  'C++': /\bC\+\+\b/gi,
  'C#': /\bC#\b|\bC-sharp\b/gi,
  'C': /\bC\b/g, // case-sensitive for C
  'Kubernetes': /\bKubernetes\b|\bK8s\b/gi,
  'Docker': /\bDocker\b/gi,
  'AWS': /\bAWS\b/gi,
  'GCP': /\bGCP\b|\bGoogle Cloud\b/gi,
  'Azure': /\bAzure\b/gi,
  'PostgreSQL': /\bPostgreSQL\b|\bPostgres\b/gi,
  'MongoDB': /\bMongoDB\b|\bMongo\b/gi,
  'Redis': /\bRedis\b/gi,
  'Kafka': /\bKafka\b/gi,
  'Svelte': /\bSvelte\b/gi,
  'Next.js': /\bNext(?:\.js)?\b|\bNextJS\b/gi,
  'Vue.js': /\bVue(?:\.js)?\b|\bVueJS\b/gi,
  'Angular': /\bAngular\b/gi,
  'Elixir': /\bElixir\b/gi,
  'Kotlin': /\bKotlin\b/gi,
  'Swift': /\bSwift\b/gi,
  'Scala': /\bScala\b/gi,
  'Flutter': /\bFlutter\b/gi,
  'React Native': /\bReact Native\b/gi,
  'TensorFlow': /\bTensorFlow\b/gi,
  'PyTorch': /\bPyTorch\b/gi,
  'GraphQL': /\bGraphQL\b/gi,
  'REST API': /\bREST\b|\bRESTful\b/gi,
  'Docker': /\bDocker\b/gi,
  'Solidity': /\bSolidity\b/gi,
  'Django': /\bDjango\b/gi,
  'Flask': /\bFlask\b/gi,
  'Spring Boot': /\bSpring\s*Boot\b/gi
};

// Email extractor with de-obfuscation logic
function extractEmails(text) {
  if (!text) return [];
  const found = new Set();

  // 1. Standard email pattern
  const standardRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const standardMatches = text.match(standardRegex);
  if (standardMatches) {
    standardMatches.forEach(email => found.add(email.toLowerCase().trim()));
  }

  // 2. De-obfuscation process
  let cleanText = text;

  // Replace brackets and parentheses around "at"
  cleanText = cleanText.replace(/\s*[\[\(\{]at[\]\)\}]\s*/gi, ' @ ');
  // Replace brackets and parentheses around "dot"
  cleanText = cleanText.replace(/\s*[\[\(\{]dot[\]\)\}]\s*/gi, ' . ');

  // Replace standalone words " at " and " dot "
  cleanText = cleanText.replace(/\s+at\s+/gi, ' @ ');
  cleanText = cleanText.replace(/\s+dot\s+/gi, ' . ');

  // Remove spaces around @ and .
  cleanText = cleanText.replace(/\s*@\s*/g, '@');
  cleanText = cleanText.replace(/\s*\.\s*/g, '.');

  // Search for emails in cleaned text
  const cleanMatches = cleanText.match(standardRegex);
  if (cleanMatches) {
    cleanMatches.forEach(email => {
      // Exclude potential false positives (e.g., must contain a valid dot and not end with a dot)
      if (email.includes('.') && !email.endsWith('.')) {
        found.add(email.toLowerCase().trim());
      }
    });
  }

  return Array.from(found);
}

// Extraction API
app.post('/api/extract', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Validate URL format
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  const startTime = Date.now();
  console.log(`Starting extraction for URL: ${url}`);

  try {
    // Fetch the page content
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 15000 // 15 seconds timeout
    });

    const $ = cheerio.load(response.data);
    const jobs = [];
    const uniqueCompanies = new Set();
    let totalEmailsFound = 0;

    const isHnHiring = parsedUrl.hostname.includes('hnhiring.com');

    if (isHnHiring) {
      // Iterate through list items with class "job"
      $('li.job').each((index, element) => {
        const hnUser = $(element).find('.user a').text().trim();
        const timeAgo = $(element).find('.user .type-info').text().trim();
        const bodyEl = $(element).find('.body');

        // Clone body to manipulate for clean text extraction (insert spacing between block elements to avoid concatenating text)
        const bodyClone = bodyEl.clone();
        bodyClone.find('p, br, div, li, h1, h2, h3, h4, h5, h6').each((i, el) => {
          $(el).prepend(' \n ').append(' \n ');
        });

        // Extract the full HTML and clean text
        const fullText = bodyClone.text().trim();
        const cleanHtml = bodyEl.html().trim();

        // Find the first line to extract the company and job title
        const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const headerText = lines.length > 0 ? lines[0] : '';

        // Determine company name (text before the first separator | or ()
        let companyName = '';
        if (headerText) {
          const parts = headerText.split(/[|()]/);
          if (parts.length > 0) {
            const possibleName = parts[0].trim();
            // Verify company name is not too long or just boilerplate (like "Location:")
            if (possibleName.length > 0 && possibleName.length < 50 && !possibleName.toLowerCase().startsWith('location:')) {
              companyName = possibleName;
            }
          }
        }

        // Fallback if no clean company name was parsed
        if (!companyName) {
          companyName = hnUser || 'Unknown Company';
        }

        // Track unique companies
        uniqueCompanies.add(companyName.toLowerCase());

        // Extract emails
        const emails = extractEmails(fullText);
        totalEmailsFound += emails.length;

        // Extract application links (filter out Hacker News/HNHiring internal links)
        const uniqueApplyLinks = new Set();
        bodyEl.find('a').each((i, el) => {
          const href = $(el).attr('href');
          if (href) {
            try {
              const parsedHref = new URL(href, 'https://hnhiring.com');
              if (!parsedHref.hostname.includes('ycombinator.com') && !parsedHref.hostname.includes('hnhiring.com')) {
                uniqueApplyLinks.add(href);
              }
            } catch (e) {
              if (!href.startsWith('#') && !href.startsWith('/') && !href.includes('ycombinator.com') && !href.includes('hnhiring.com')) {
                uniqueApplyLinks.add(href);
              }
            }
          }
        });
        const applyLinks = Array.from(uniqueApplyLinks);

        // Match skills
        const matchedSkills = [];
        for (const [skill, regex] of Object.entries(SKILLS_MAP)) {
          if (regex.test(headerText) || regex.test(fullText)) {
            matchedSkills.push(skill);
          }
        }

        jobs.push({
          id: index + 1,
          hnUser,
          timeAgo,
          companyName,
          title: headerText || 'Job Posting',
          emails,
          applyLinks,
          skills: matchedSkills,
          description: fullText,
          descriptionHtml: cleanHtml,
          hnProfileUrl: $(element).find('.user a').attr('href') || ''
        });
      });
    } else {
      // Generic web page email extraction
      const wholePageText = $('body').text() || '';
      const pageTitle = $('title').text().trim() || parsedUrl.hostname;
      const emails = extractEmails(wholePageText);
      totalEmailsFound = emails.length;

      let companyName = parsedUrl.hostname.replace('www.', '');

      // Match skills on the entire page
      const matchedSkills = [];
      for (const [skill, regex] of Object.entries(SKILLS_MAP)) {
        if (regex.test(wholePageText) || regex.test(pageTitle)) {
          matchedSkills.push(skill);
        }
      }

      jobs.push({
        id: 1,
        hnUser: 'Web Scraper',
        timeAgo: 'Just now',
        companyName: companyName,
        title: pageTitle,
        emails: emails,
        applyLinks: [],
        skills: matchedSkills,
        description: wholePageText.substring(0, 5000), // Snippet of text
        descriptionHtml: `<p>Extracted from <a href="${url}" target="_blank">${url}</a></p>`,
        hnProfileUrl: ''
      });
      uniqueCompanies.add(companyName.toLowerCase());
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    res.json({
      success: true,
      stats: {
        totalJobs: jobs.length,
        totalEmails: totalEmailsFound,
        uniqueCompanies: uniqueCompanies.size,
        fetchTimeSeconds: duration
      },
      jobs
    });

  } catch (error) {
    console.error('Scraping error:', error.message);
    res.status(500).json({
      success: false,
      error: `Failed to scrape website: ${error.message}`
    });
  }
});

// SMTP Connection Verification API
app.post('/api/smtp/test', async (req, res) => {
  const { host, port, secure, auth } = req.body;

  if (!host || !port || !auth || !auth.user || !auth.pass) {
    return res.status(400).json({ success: false, error: 'All SMTP settings (Host, Port, User, Password) are required.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: secure === true || secure === 'true',
      auth: {
        user: auth.user,
        pass: auth.pass
      },
      connectTimeout: 8000 // 8 seconds timeout
    });

    await transporter.verify();
    res.json({ success: true, message: 'SMTP connection verified successfully!' });
  } catch (error) {
    console.error('SMTP verify error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Single Email Sending API
app.post('/api/smtp/send', async (req, res) => {
  const { smtpConfig, to, subject, body, fromName } = req.body;

  if (!smtpConfig || !to || !subject || !body) {
    return res.status(400).json({ success: false, error: 'Missing required parameters (SMTP configuration, recipient, subject, or body).' });
  }

  const { host, port, secure, auth } = smtpConfig;

  if (!host || !port || !auth || !auth.user || !auth.pass) {
    return res.status(400).json({ success: false, error: 'Invalid SMTP configuration provided.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: secure === true || secure === 'true',
      auth: {
        user: auth.user,
        pass: auth.pass
      }
    });

    const mailOptions = {
      from: fromName ? `"${fromName}" <${auth.user}>` : auth.user,
      to,
      subject,
      text: body
    };

    const info = await transporter.sendMail(mailOptions);
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Default path (fallback to frontend)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
