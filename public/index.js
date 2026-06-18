// Global State
let extractedJobs = [];
let campaignQueue = [];
let activeInputMode = 'scraper'; // 'scraper' or 'direct'
let campaignTransmitter = { active: false, paused: false, currentIndex: 0, timerId: null };

// Resume Profile State & Default Values (Parsed from Sai_Harshitha_Mandapalli.pdf)
const DEFAULT_RESUME = {
  name: '',
  email: '',
  phone: '',
  linkedin: '',
  github: '',
  skills: '',
  highlights: ''
};

let userResume = { ...DEFAULT_RESUME };

// Load from LocalStorage if exists
if (localStorage.getItem('hn_user_resume')) {
  try {
    userResume = JSON.parse(localStorage.getItem('hn_user_resume'));
  } catch (e) {
    userResume = { ...DEFAULT_RESUME };
  }
}

// DOM Elements
const extractionForm = document.getElementById('extractionForm');
const urlInput = document.getElementById('urlInput');
const clearBtn = document.getElementById('clearBtn');
const extractBtn = document.getElementById('extractBtn');
const errorContainer = document.getElementById('errorContainer');
const errorMessage = document.getElementById('errorMessage');

// Input Mode Toggles
const btnModeScraper = document.getElementById('btnModeScraper');
const btnModeDirect = document.getElementById('btnModeDirect');
const scraperInputGroup = document.getElementById('scraperInputGroup');
const directInputGroup = document.getElementById('directInputGroup');
const directEmailsInput = document.getElementById('directEmailsInput');

const loadingSection = document.getElementById('loadingSection');
const loadingLogs = document.getElementById('loadingLogs');

const resultsSection = document.getElementById('resultsSection');
const statTotalJobs = document.getElementById('statTotalJobs');
const statTotalEmails = document.getElementById('statTotalEmails');
const statUniqueCompanies = document.getElementById('statUniqueCompanies');
const statFetchTime = document.getElementById('statFetchTime');

const searchInput = document.getElementById('searchInput');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');

const jobsTableBody = document.getElementById('jobsTableBody');
const noResults = document.getElementById('noResults');

// Dashboard tab switchers
const tabShowBoard = document.getElementById('tabShowBoard');
const tabShowCampaign = document.getElementById('tabShowCampaign');
const boardView = document.getElementById('boardView');
const campaignView = document.getElementById('campaignView');

// SMTP Settings
const smtpHost = document.getElementById('smtpHost');
const smtpPort = document.getElementById('smtpPort');
const smtpSecure = document.getElementById('smtpSecure');
const smtpUser = document.getElementById('smtpUser');
const smtpPass = document.getElementById('smtpPass');
const smtpFromName = document.getElementById('smtpFromName');
const btnTestSmtp = document.getElementById('btnTestSmtp');
const smtpTestStatus = document.getElementById('smtpTestStatus');

// Email Templates
const tplSubject = document.getElementById('tplSubject');
const tplBody = document.getElementById('tplBody');
const btnSaveTemplate = document.getElementById('btnSaveTemplate');

// Campaign Control
const campaignDelay = document.getElementById('campaignDelay');
const btnStartCampaign = document.getElementById('btnStartCampaign');
const btnPauseCampaign = document.getElementById('btnPauseCampaign');
const btnResetCampaign = document.getElementById('btnResetCampaign');
const campaignProgressSection = document.getElementById('campaignProgressSection');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');
const progressBarFill = document.getElementById('progressBarFill');
const campaignLogs = document.getElementById('campaignLogs');
const chkSelectAllQueue = document.getElementById('chkSelectAllQueue');
const campaignQueueBody = document.getElementById('campaignQueueBody');

// Modal Elements
const detailsModal = document.getElementById('detailsModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalCompanyName = document.getElementById('modalCompanyName');
const modalJobTitle = document.getElementById('modalJobTitle');
const modalPosterLink = document.getElementById('modalPosterLink');
const modalPosterUser = document.getElementById('modalPosterUser');
const modalPostTime = document.getElementById('modalPostTime');
const modalEmailsList = document.getElementById('modalEmailsList');
const modalSkillsList = document.getElementById('modalSkillsList');
const modalJobDescription = document.getElementById('modalJobDescription');

// Resume DOM Elements
const resumeSection = document.getElementById('resumeSection');
const resumeHeader = document.getElementById('resumeHeader');
const resumeBody = document.getElementById('resumeBody');
const toggleResumeBtn = document.getElementById('toggleResumeBtn');

const resumeNameInput = document.getElementById('resumeName');
const resumeEmailInput = document.getElementById('resumeEmail');
const resumePhoneInput = document.getElementById('resumePhone');
const resumeLinkedInInput = document.getElementById('resumeLinkedIn');
const resumeGitHubInput = document.getElementById('resumeGitHub');
const resumeSkillsInput = document.getElementById('resumeSkills');
const resumeHighlightsInput = document.getElementById('resumeHighlights');

const saveProfileBtn = document.getElementById('saveProfileBtn');
const resetProfileBtn = document.getElementById('resetProfileBtn');

const profileSummaryName = document.getElementById('profileSummaryName');
const profileSummaryMeta = document.getElementById('profileSummaryMeta');

// Modal Email Elements
const modalEmailSubject = document.getElementById('modalEmailSubject');
const modalEmailBody = document.getElementById('modalEmailBody');
const copySubjectBtn = document.getElementById('copySubjectBtn');
const copyBodyBtn = document.getElementById('copyBodyBtn');
const sendEmailBtn = document.getElementById('sendEmailBtn');


// UI Helpers
function showElement(el) {
  el.classList.remove('hidden');
}

function hideElement(el) {
  el.classList.add('hidden');
}

function addLog(message, isSuccess = false) {
  const time = new Date().toLocaleTimeString();
  const icon = isSuccess ? '<i class="fa-solid fa-check log-success"></i>' : '<i class="fa-solid fa-circle-notch fa-spin"></i>';
  const classText = isSuccess ? 'log-entry log-success' : 'log-entry';

  const log = document.createElement('div');
  log.className = classText;
  log.innerHTML = `${icon} <span>[${time}] ${message}</span>`;
  loadingLogs.appendChild(log);
  loadingLogs.scrollTop = loadingLogs.scrollHeight;
}

function clearLogs() {
  loadingLogs.innerHTML = '';
}

// Input Mode Toggles Handling
btnModeScraper.addEventListener('click', () => {
  activeInputMode = 'scraper';
  btnModeScraper.classList.add('active');
  btnModeDirect.classList.remove('active');
  showElement(scraperInputGroup);
  hideElement(directInputGroup);
  urlInput.required = true;
  directEmailsInput.required = false;
});

btnModeDirect.addEventListener('click', () => {
  activeInputMode = 'direct';
  btnModeDirect.classList.add('active');
  btnModeScraper.classList.remove('active');
  showElement(directInputGroup);
  hideElement(scraperInputGroup);
  urlInput.required = false;
  directEmailsInput.required = true;
});

// Input Clear Handling
urlInput.addEventListener('input', () => {
  if (urlInput.value.length > 0) {
    clearBtn.style.display = 'flex';
  } else {
    clearBtn.style.display = 'none';
  }
});

clearBtn.addEventListener('click', () => {
  urlInput.value = '';
  clearBtn.style.display = 'none';
  urlInput.focus();
});

// Form Submission & Scraper Call / Direct Processing
extractionForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  hideElement(errorContainer);

  if (activeInputMode === 'scraper') {
    const url = urlInput.value.trim();
    if (!url) return;

    // Set UI States
    hideElement(resultsSection);
    showElement(loadingSection);
    clearLogs();

    // Disable button
    extractBtn.disabled = true;
    extractBtn.style.opacity = '0.7';

    addLog('Initializing extraction pipeline...');

    try {
      // Stage 1: Connect
      setTimeout(() => addLog('Establishing connection to server...'), 1000);

      // Stage 2: Scrape request
      setTimeout(() => addLog('Fetching target URL. Running HTML parser...'), 2200);
      setTimeout(() => addLog('De-obfuscating email contacts and identifying technologies...'), 4000);

      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Server error occurred during scraping.');
      }

      addLog('Scraped raw page layout successfully!', true);
      addLog(`Extracted ${data.stats.totalJobs} jobs and ${data.stats.totalEmails} emails!`, true);

      // Save state
      extractedJobs = data.jobs;

      // Wait a brief moment to show success log, then display the dashboard
      setTimeout(() => {
        hideElement(loadingSection);

        // Update Stats
        statTotalJobs.textContent = data.stats.totalJobs;
        statTotalEmails.textContent = data.stats.totalEmails;
        statUniqueCompanies.textContent = data.stats.uniqueCompanies;
        statFetchTime.textContent = `${data.stats.fetchTimeSeconds}s`;

        // Clear search
        searchInput.value = '';

        // Render Table & Build Campaign Queue
        renderTable(extractedJobs);
        buildCampaignQueue();
        showElement(resultsSection);

        // Re-enable button
        extractBtn.disabled = false;
        extractBtn.style.opacity = '1';
      }, 800);

    } catch (err) {
      console.error(err);
      hideElement(loadingSection);
      showError(err.message || 'An error occurred while connecting to the scraper.');

      // Re-enable button
      extractBtn.disabled = false;
      extractBtn.style.opacity = '1';
    }
  } else {
    // Direct Emails Paste Mode
    const rawText = directEmailsInput.value.trim();
    if (!rawText) return;

    // Standard email matching regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = rawText.match(emailRegex) || [];
    const uniqueEmails = Array.from(new Set(matches.map(e => e.toLowerCase().trim())));

    if (uniqueEmails.length === 0) {
      showError('No valid email addresses found in the input.');
      return;
    }

    // Process parsed emails into the extractedJobs state structure
    extractedJobs = [];
    const uniqueCompanies = new Set();

    uniqueEmails.forEach((email, index) => {
      const parts = email.split('@');
      const domain = parts[1] || '';
      let companyName = domain ? domain.split('.')[0] : 'Direct List';
      // Format company name nicely
      companyName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
      uniqueCompanies.add(companyName.toLowerCase());

      extractedJobs.push({
        id: index + 1,
        hnUser: 'Direct Input',
        timeAgo: 'Just now',
        companyName: companyName,
        title: 'Email Outreach Contact',
        emails: [email],
        applyLinks: [],
        skills: [],
        description: `Directly pasted email: ${email}`,
        descriptionHtml: `<p>Directly pasted email contact: <strong>${email}</strong></p>`,
        hnProfileUrl: ''
      });
    });

    // Update stats
    statTotalJobs.textContent = extractedJobs.length;
    statTotalEmails.textContent = uniqueEmails.length;
    statUniqueCompanies.textContent = uniqueCompanies.size;
    statFetchTime.textContent = '0.00s';

    // Clear search
    searchInput.value = '';

    // Render Table & Campaign queue
    renderTable(extractedJobs);
    buildCampaignQueue();
    showElement(resultsSection);
  }
});

function showError(msg) {
  errorMessage.textContent = msg;
  showElement(errorContainer);
}

// Table Rendering
function renderTable(jobs) {
  jobsTableBody.innerHTML = '';

  if (jobs.length === 0) {
    showElement(noResults);
    return;
  }

  hideElement(noResults);

  jobs.forEach(job => {
    const row = document.createElement('tr');

    // Company cell
    const companyCell = document.createElement('td');
    companyCell.className = 'company-cell';
    companyCell.textContent = job.companyName;
    row.appendChild(companyCell);

    // Role/Title cell
    const roleCell = document.createElement('td');
    roleCell.innerHTML = `
      <span class="role-cell-title">${escapeHtml(job.title)}</span>
      <div class="role-cell-meta">
        <span><i class="fa-solid fa-clock"></i> ${job.timeAgo}</span>
        <span>&bull;</span>
        <span><a href="${job.hnProfileUrl}" class="hn-user-link" target="_blank" onclick="event.stopPropagation();"><i class="fa-brands fa-y-combinator"></i> ${job.hnUser}</a></span>
      </div>
    `;
    row.appendChild(roleCell);

    // Emails cell
    const emailCell = document.createElement('td');
    if (job.emails && job.emails.length > 0) {
      const list = document.createElement('div');
      list.className = 'emails-list';
      job.emails.forEach(email => {
        const badge = document.createElement('span');
        badge.className = 'email-badge';
        badge.innerHTML = `<i class="fa-regular fa-envelope"></i> ${email}`;
        badge.title = `Click to copy: ${email}`;

        // Copy to clipboard helper
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(email);
          const origText = badge.innerHTML;
          badge.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
          setTimeout(() => {
            badge.innerHTML = origText;
          }, 1500);
        });

        list.appendChild(badge);
      });
      emailCell.appendChild(list);
    } else if (job.applyLinks && job.applyLinks.length > 0) {
      const list = document.createElement('div');
      list.className = 'emails-list';
      job.applyLinks.forEach(link => {
        const anchor = document.createElement('a');
        anchor.href = link;
        anchor.target = '_blank';
        anchor.className = 'email-badge';
        anchor.style.background = 'rgba(6, 182, 212, 0.1)';
        anchor.style.color = '#22d3ee';
        anchor.style.borderColor = 'rgba(6, 182, 212, 0.25)';
        anchor.style.textDecoration = 'none';
        anchor.title = link;
        anchor.addEventListener('click', (e) => {
          e.stopPropagation();
        });

        let displayName = 'Apply Link';
        try {
          const parsed = new URL(link);
          displayName = parsed.hostname.replace('www.', '');
        } catch (e) { }

        anchor.innerHTML = `<i class="fa-solid fa-up-right-from-square"></i> ${displayName}`;
        list.appendChild(anchor);
      });
      emailCell.appendChild(list);
    } else {
      emailCell.innerHTML = '<span class="no-email-text">No contact/apply info</span>';
    }
    row.appendChild(emailCell);

    // Skills cell
    const skillsCell = document.createElement('td');
    const skillsList = document.createElement('div');
    skillsList.className = 'skills-list';

    // Limit displaying to first 4 skills in table to prevent overcrowding
    const maxSkillsToShow = 4;
    const displayedSkills = job.skills.slice(0, maxSkillsToShow);

    displayedSkills.forEach(skill => {
      const badge = document.createElement('span');
      badge.className = 'skill-badge';
      badge.textContent = skill;
      skillsList.appendChild(badge);
    });

    if (job.skills.length > maxSkillsToShow) {
      const moreBadge = document.createElement('span');
      moreBadge.className = 'skill-badge';
      moreBadge.style.background = 'rgba(255, 255, 255, 0.05)';
      moreBadge.style.color = 'var(--text-secondary)';
      moreBadge.style.border = '1px solid var(--border-glow)';
      moreBadge.textContent = `+${job.skills.length - maxSkillsToShow} more`;
      skillsList.appendChild(moreBadge);
    }

    skillsCell.appendChild(skillsList);
    row.appendChild(skillsCell);

    // Row Click => Modal Details
    row.addEventListener('click', () => {
      openModal(job);
    });

    jobsTableBody.appendChild(row);
  });
}

// Client Side Search Filter
searchInput.addEventListener('input', () => {
  const query = searchInput.value.toLowerCase().trim();

  if (!query) {
    renderTable(extractedJobs);
    return;
  }

  const filtered = extractedJobs.filter(job => {
    return (
      job.companyName.toLowerCase().includes(query) ||
      job.title.toLowerCase().includes(query) ||
      job.description.toLowerCase().includes(query) ||
      job.skills.some(skill => skill.toLowerCase().includes(query)) ||
      job.emails.some(email => email.toLowerCase().includes(query))
    );
  });

  renderTable(filtered);
});

// Modal Actions
function openModal(job) {
  modalCompanyName.textContent = job.companyName;
  modalJobTitle.textContent = job.title;
  modalPosterUser.textContent = job.hnUser;
  modalPosterLink.href = job.hnProfileUrl;
  modalPostTime.textContent = job.timeAgo;

  // Populate emails
  modalEmailsList.innerHTML = '';
  if (job.emails.length > 0 || job.applyLinks.length > 0) {
    job.emails.forEach(email => {
      const badge = document.createElement('span');
      badge.className = 'email-badge';
      badge.innerHTML = `<i class="fa-regular fa-envelope"></i> ${email}`;
      badge.style.cursor = 'pointer';
      badge.title = 'Click to copy';

      badge.addEventListener('click', () => {
        navigator.clipboard.writeText(email);
        const orig = badge.innerHTML;
        badge.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
        setTimeout(() => badge.innerHTML = orig, 1500);
      });
      modalEmailsList.appendChild(badge);
    });

    job.applyLinks.forEach(link => {
      const anchor = document.createElement('a');
      anchor.href = link;
      anchor.target = '_blank';
      anchor.className = 'email-badge';
      anchor.style.background = 'rgba(6, 182, 212, 0.1)';
      anchor.style.color = '#22d3ee';
      anchor.style.borderColor = 'rgba(6, 182, 212, 0.25)';
      anchor.style.textDecoration = 'none';
      anchor.title = link;
      anchor.innerHTML = `<i class="fa-solid fa-up-right-from-square"></i> ${link}`;
      modalEmailsList.appendChild(anchor);
    });
  } else {
    modalEmailsList.innerHTML = '<span class="no-email-text">No contact or application links extracted.</span>';
  }

  // Populate skills
  modalSkillsList.innerHTML = '';
  if (job.skills.length > 0) {
    job.skills.forEach(skill => {
      const badge = document.createElement('span');
      badge.className = 'skill-badge';
      badge.textContent = skill;
      modalSkillsList.appendChild(badge);
    });
  } else {
    modalSkillsList.innerHTML = '<span class="no-email-text">No matching skill tags identified.</span>';
  }

  // Job description HTML
  modalJobDescription.innerHTML = job.descriptionHtml || escapeHtml(job.description);

  // Generate and render Tailored application email
  const emailTemplate = generatePersonalizedEmail(job);
  modalEmailSubject.value = emailTemplate.subject;
  modalEmailBody.value = emailTemplate.body;

  // Update Send Email mailto link
  const toEmail = job.emails && job.emails.length > 0 ? job.emails[0] : '';
  const mailtoUrl = `mailto:${toEmail}?subject=${encodeURIComponent(emailTemplate.subject)}&body=${encodeURIComponent(emailTemplate.body)}`;
  sendEmailBtn.href = mailtoUrl;
  if (!toEmail) {
    sendEmailBtn.title = "No email address found for this job; copies template directly.";
  } else {
    sendEmailBtn.removeAttribute('title');
  }

  showElement(detailsModal);
  document.body.style.overflow = 'hidden'; // prevent scrolling background
}

function closeModal() {
  hideElement(detailsModal);
  document.body.style.overflow = '';
}

closeModalBtn.addEventListener('click', closeModal);
detailsModal.addEventListener('click', (e) => {
  if (e.target === detailsModal) {
    closeModal();
  }
});

// ESC key to close modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});

// CSV Export
exportCsvBtn.addEventListener('click', () => {
  if (extractedJobs.length === 0) return;

  const headers = ['Company', 'Job Title', 'Emails', 'Application Links', 'Skills', 'Time Posted', 'Hacker News User', 'Profile Link'];
  const rows = extractedJobs.map(job => [
    job.companyName,
    job.title,
    job.emails.join('; '),
    job.applyLinks.join('; '),
    job.skills.join(', '),
    job.timeAgo,
    job.hnUser,
    job.hnProfileUrl
  ]);

  let csvContent = "data:text/csv;charset=utf-8,";

  // Add headers
  csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\r\n";

  // Add rows
  rows.forEach(row => {
    csvContent += row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(",") + "\r\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `hnhiring_emails_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// JSON Export
exportJsonBtn.addEventListener('click', () => {
  if (extractedJobs.length === 0) return;

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(extractedJobs, null, 2));
  const link = document.createElement("a");
  link.setAttribute("href", dataStr);
  link.setAttribute("download", `hnhiring_emails_${Date.now()}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// String Escaper
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =======================================================
   Resume Management & Tailored Email Generator Logic
   ======================================================= */

// Populate Resume Inputs and summary header
function updateResumeUI() {
  resumeNameInput.value = userResume.name;
  resumeEmailInput.value = userResume.email;
  resumePhoneInput.value = userResume.phone;
  resumeLinkedInInput.value = userResume.linkedin;
  resumeGitHubInput.value = userResume.github;
  resumeSkillsInput.value = userResume.skills;
  resumeHighlightsInput.value = userResume.highlights;

  profileSummaryName.textContent = userResume.name;

  // Format summary metadata
  const skillList = userResume.skills.split(',').map(s => s.trim()).slice(0, 6).join(', ');
  profileSummaryMeta.textContent = `Software Engineer • ${skillList}`;
}

// Save profile
saveProfileBtn.addEventListener('click', () => {
  userResume.name = resumeNameInput.value.trim() || DEFAULT_RESUME.name;
  userResume.email = resumeEmailInput.value.trim() || DEFAULT_RESUME.email;
  userResume.phone = resumePhoneInput.value.trim() || DEFAULT_RESUME.phone;
  userResume.linkedin = resumeLinkedInInput.value.trim() || DEFAULT_RESUME.linkedin;
  userResume.github = resumeGitHubInput.value.trim() || DEFAULT_RESUME.github;
  userResume.skills = resumeSkillsInput.value.trim() || DEFAULT_RESUME.skills;
  userResume.highlights = resumeHighlightsInput.value || DEFAULT_RESUME.highlights;

  localStorage.setItem('hn_user_resume', JSON.stringify(userResume));
  updateResumeUI();

  // Visual success feedback on Save button
  const originalText = saveProfileBtn.innerHTML;
  saveProfileBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Profile Saved!';
  saveProfileBtn.style.background = '#10b981';
  setTimeout(() => {
    saveProfileBtn.innerHTML = originalText;
    saveProfileBtn.style.background = '';
  }, 2000);
});

// Reset profile
resetProfileBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to reset your profile details to the default resume?')) {
    userResume = { ...DEFAULT_RESUME };
    localStorage.removeItem('hn_user_resume');
    updateResumeUI();
  }
});

// Toggle Resume Collapsible
resumeHeader.addEventListener('click', () => {
  const isCollapsed = resumeSection.classList.contains('collapsed');
  if (isCollapsed) {
    resumeSection.classList.remove('collapsed');
    resumeBody.classList.remove('hidden');
  } else {
    resumeSection.classList.add('collapsed');
    resumeBody.classList.add('hidden');
  }
});

// Copy Subject Event Listener
copySubjectBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(modalEmailSubject.value);
  const origIcon = copySubjectBtn.innerHTML;
  copySubjectBtn.innerHTML = '<i class="fa-solid fa-check" style="color: #10b981;"></i>';
  setTimeout(() => {
    copySubjectBtn.innerHTML = origIcon;
  }, 1500);
});

// Copy Body Event Listener
copyBodyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(modalEmailBody.value);
  const origIcon = copyBodyBtn.innerHTML;
  copyBodyBtn.innerHTML = '<i class="fa-solid fa-check" style="color: #10b981;"></i>';
  setTimeout(() => {
    copyBodyBtn.innerHTML = origIcon;
  }, 1500);
});

// Tailored Cold Email Generator Compiler
function generatePersonalizedEmail(job) {
  const company = job.companyName || 'the team';
  const roleTitle = job.title || 'Software Engineer';
  const jobDesc = (job.description || '').toLowerCase();

  // Clean up role title for the subject (e.g. remove separators)
  let cleanRole = roleTitle.split(/[|()]/)[0].trim();
  if (cleanRole.length > 50) cleanRole = 'Software Engineer';

  const subject = `Application for ${cleanRole} - ${userResume.name}`;

  // Pick the best highlights based on job description matching
  let tailoredPitch = '';
  let matchedSkillset = [];

  // 1. Check for AI / LLM / GPT
  if (jobDesc.includes('ai ') || jobDesc.includes('llm') || jobDesc.includes('gpt') || jobDesc.includes('openai') || jobDesc.includes('artificial intelligence') || jobDesc.includes('machine learning')) {
    tailoredPitch = `At my previous role, I specialized in leveraging GPT-4o with structured prompt engineering to build automated test-case systems and tool integrations. Specifically, I engineered a strict JSON prompt schema MERN tool that cut manual QA writing efforts by 80% and successfully shipped secure JWT authentication features.`;
    matchedSkillset = ['GPT-4o', 'Prompt Engineering', 'LLM Integration', 'Node.js', 'Express'];
  }
  // 2. Check for QA / Automation / Testing / Playwright
  else if (jobDesc.includes('test') || jobDesc.includes('qa') || jobDesc.includes('automation') || jobDesc.includes('playwright') || jobDesc.includes('selenium') || jobDesc.includes('cypress')) {
    tailoredPitch = `I have extensive experience in testing & quality assurance automation. I successfully built and deployed E2E automation suites using Playwright, which reduced regression cycle times by 40%. I also engineered an AI-powered test case generator leveraging GPT-4o that saved 80% of manual test creation time.`;
    matchedSkillset = ['Playwright', 'Postman', 'API Testing', 'E2E Automation', 'Regression Testing'];
  }
  // 3. Check for React / Frontend / Tailwind
  else if (jobDesc.includes('react') || jobDesc.includes('frontend') || jobDesc.includes('ui') || jobDesc.includes('css') || jobDesc.includes('typescript') || jobDesc.includes('vue') || jobDesc.includes('angular')) {
    tailoredPitch = `I am highly proficient in frontend development, particularly with React.js, React Hooks, and responsive layouts (Tailwind CSS, CSS3). In my previous work, I regularly pair-debugged complex React state management and rendering issues, and built multiple responsive frontend interfaces for core product modules at Inncircles Technologies.`;
    matchedSkillset = ['React.js', 'JavaScript', 'Tailwind CSS', 'Responsive Design', 'HTML5/CSS3'];
  }
  // 4. Check for Backend / Node / API / Database
  else if (jobDesc.includes('backend') || jobDesc.includes('node') || jobDesc.includes('express') || jobDesc.includes('mongodb') || jobDesc.includes('sql') || jobDesc.includes('api') || jobDesc.includes('postgres')) {
    tailoredPitch = `My core expertise is in backend development and distributed systems. I have built and validated 30+ production REST API endpoints using Node.js and Express. I also optimized MongoDB schemas with indexed queries and aggregation pipelines, delivering a 20% improvement in API response times under concurrent load.`;
    matchedSkillset = ['Node.js', 'Express.js', 'REST API Design', 'MongoDB', 'SQL', 'JWT'];
  }
  // 5. Default Full Stack / Software Engineer Pitch
  else {
    tailoredPitch = `I have hands-on experience designing and building scalable MERN stack applications, distributed REST APIs, and automated test systems. I designed 30+ production endpoints, reduced regression cycle time by 40% using Playwright automation, and shipped an AI-powered tool using GPT-4o to boost developer productivity by 80%.`;
    matchedSkillset = ['Node.js', 'React.js', 'Express.js', 'MongoDB', 'REST API Design'];
  }

  // Intersect user skills with job skills
  const skillsList = userResume.skills.split(',').map(s => s.trim());
  const jobSkillsLower = (job.skills || []).map(s => s.toLowerCase());
  const skillMatches = skillsList.filter(skill => {
    return jobSkillsLower.includes(skill.toLowerCase()) || matchedSkillset.includes(skill);
  }).slice(0, 6);

  const skillsParagraph = skillMatches.length > 0
    ? `My technical skillset directly aligns with your requirements, including: ${skillMatches.join(', ')}.`
    : `My technical toolkit spans Java, JavaScript, Python, Node.js, React, and SQL.`;

  const body = `Dear hiring team at ${company},

I hope you are having a productive week. I noticed your posting on Hacker News for the ${cleanRole} role and wanted to reach out to express my strong interest.

${tailoredPitch}

${skillsParagraph}

I graduated with a B.Tech in Computer Science and Engineering (CGPA 9.01/10) and have a strong foundation in CS fundamentals, object-oriented design, and algorithms (400+ LeetCode problems solved). I write clean, maintainable code and operate comfortably in fast-paced, Agile environments.

For a summary of my background, please find my profile details below:
- Phone: ${userResume.phone}
- LinkedIn: ${userResume.linkedin}
- GitHub: ${userResume.github}

I would welcome the opportunity to discuss how my backend expertise, frontend skills, and automated testing background can add value to the engineering team. Thank you for your time and consideration.

Best regards,

${userResume.name}
${userResume.email}`;

  return { subject, body };
}

// Initial Template Setup & SMTP Configuration Loader
const DEFAULT_TEMPLATE = {
  subject: 'Application for {role} at {company} - {resume_name}',
  body: `Dear hiring team at {company},

I hope this email finds you well. I noticed your posting for the {role} role on Hacker News and wanted to reach out to express my strong interest.

I have hands-on experience designing and building scalable applications, particularly with backend APIs, database optimization, and frontend interfaces. My technical skillset and background align closely with the requirements you described.

For a summary of my background, please find my details below:
- Name: {resume_name}
- Phone: {resume_phone}
- LinkedIn: {resume_linkedin}
- GitHub: {resume_github}

I would welcome the opportunity to discuss how I can add value to your engineering team. Thank you for your time and consideration.

Best regards,

{resume_name}
{resume_email}`
};

let smtpConfig = {};
let emailTemplate = { ...DEFAULT_TEMPLATE };

function loadSMTPAndTemplates() {
  // Load SMTP Settings from localStorage
  const storedSmtp = localStorage.getItem('hn_smtp_config');
  if (storedSmtp) {
    try {
      smtpConfig = JSON.parse(storedSmtp);
      smtpHost.value = smtpConfig.host || '';
      smtpPort.value = smtpConfig.port || '';
      smtpSecure.checked = smtpConfig.secure || false;
      smtpUser.value = smtpConfig.auth?.user || '';
      smtpPass.value = smtpConfig.auth?.pass || '';
      smtpFromName.value = smtpConfig.fromName || '';
    } catch (e) {
      smtpConfig = {};
    }
  }

  // Load Template Settings from localStorage
  const storedTemplate = localStorage.getItem('hn_smtp_template');
  if (storedTemplate) {
    try {
      emailTemplate = JSON.parse(storedTemplate);
    } catch (e) {
      emailTemplate = { ...DEFAULT_TEMPLATE };
    }
  }
  tplSubject.value = emailTemplate.subject;
  tplBody.value = emailTemplate.body;
}

// Dashboard Tab Switching Handler
tabShowBoard.addEventListener('click', () => {
  tabShowBoard.classList.add('active');
  tabShowCampaign.classList.remove('active');
  showElement(boardView);
  hideElement(campaignView);
});

tabShowCampaign.addEventListener('click', () => {
  tabShowCampaign.classList.add('active');
  tabShowBoard.classList.remove('active');
  showElement(campaignView);
  hideElement(boardView);
});

// Test SMTP Connection Action
btnTestSmtp.addEventListener('click', async () => {
  const host = smtpHost.value.trim();
  const port = parseInt(smtpPort.value.trim(), 10);
  const secure = smtpSecure.checked;
  const user = smtpUser.value.trim();
  const pass = smtpPass.value.trim();
  const fromName = smtpFromName.value.trim();

  if (!host || !port || !user || !pass) {
    showSmtpStatus('Please fill in Host, Port, Username, and Password.', 'error');
    return;
  }

  btnTestSmtp.disabled = true;
  btnTestSmtp.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing Connection...';
  hideSmtpStatus();

  try {
    const response = await fetch('/api/smtp/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host, port, secure, auth: { user, pass } })
    });

    const data = await response.json();
    if (data.success) {
      showSmtpStatus('SMTP connection verified successfully!', 'success');
      // Save credentials locally
      smtpConfig = { host, port, secure, auth: { user, pass }, fromName };
      localStorage.setItem('hn_smtp_config', JSON.stringify(smtpConfig));
    } else {
      showSmtpStatus(`Connection Failed: ${data.error}`, 'error');
    }
  } catch (err) {
    showSmtpStatus(`Network Error: ${err.message}`, 'error');
  } finally {
    btnTestSmtp.disabled = false;
    btnTestSmtp.innerHTML = '<i class="fa-solid fa-vial"></i> Test SMTP Connection';
  }
});

function showSmtpStatus(text, className) {
  smtpTestStatus.textContent = text;
  smtpTestStatus.className = `smtp-test-status ${className}`;
  smtpTestStatus.style.display = 'block';
}

function hideSmtpStatus() {
  smtpTestStatus.style.display = 'none';
}

// Save Template Action
btnSaveTemplate.addEventListener('click', () => {
  emailTemplate.subject = tplSubject.value.trim() || DEFAULT_TEMPLATE.subject;
  emailTemplate.body = tplBody.value || DEFAULT_TEMPLATE.body;

  localStorage.setItem('hn_smtp_template', JSON.stringify(emailTemplate));

  // Visual success feedback
  const originalHtml = btnSaveTemplate.innerHTML;
  btnSaveTemplate.innerHTML = '<i class="fa-solid fa-circle-check"></i> Template Saved!';
  btnSaveTemplate.style.background = '#10b981';
  btnSaveTemplate.style.color = '#fff';
  setTimeout(() => {
    btnSaveTemplate.innerHTML = originalHtml;
    btnSaveTemplate.style.background = '';
    btnSaveTemplate.style.color = '';
  }, 1500);
});

// Campaign Queue Builder
function buildCampaignQueue() {
  campaignQueue = [];
  extractedJobs.forEach(job => {
    if (job.emails && job.emails.length > 0) {
      job.emails.forEach(email => {
        // Prevent exact duplicates in the campaign queue table
        const exists = campaignQueue.some(item => item.email === email);
        if (!exists) {
          let roleTitle = job.title || 'Software Engineer';
          let cleanRole = roleTitle.split(/[|()]/)[0].trim();
          if (cleanRole.length > 50) cleanRole = 'Software Engineer';

          campaignQueue.push({
            email: email.toLowerCase().trim(),
            companyName: job.companyName,
            role: cleanRole,
            status: 'Pending',
            error: '',
            selected: true
          });
        }
      });
    }
  });

  renderCampaignQueue();
  updateCampaignStats();
}

function renderCampaignQueue() {
  campaignQueueBody.innerHTML = '';
  if (campaignQueue.length === 0) {
    campaignQueueBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem 0;">No contacts available in the queue. Scrape a site or paste emails first.</td></tr>';
    return;
  }

  campaignQueue.forEach((item, index) => {
    const tr = document.createElement('tr');

    // Checkbox Cell
    const tdCheck = document.createElement('td');
    tdCheck.style.textAlign = 'center';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.selected;
    checkbox.addEventListener('change', () => {
      item.selected = checkbox.checked;
      updateCampaignStats();
    });
    tdCheck.appendChild(checkbox);
    tr.appendChild(tdCheck);

    // Email Cell
    const tdEmail = document.createElement('td');
    tdEmail.textContent = item.email;
    tdEmail.style.fontWeight = '500';
    tr.appendChild(tdEmail);

    // Company / Role Cell
    const tdDetails = document.createElement('td');
    tdDetails.innerHTML = `<span style="color: var(--text-primary); font-weight: 500;">${item.companyName}</span> <span style="color: var(--text-muted); font-size: 0.8rem;">(${item.role})</span>`;
    tr.appendChild(tdDetails);

    // Status Cell
    const tdStatus = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `status-badge ${getStatusClass(item.status)}`;
    badge.innerHTML = getStatusIcon(item.status) + ' ' + item.status;
    if (item.status === 'Failed' && item.error) {
      badge.title = item.error;
    }
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    // Action (Retry) Cell
    const tdAction = document.createElement('td');
    tdAction.style.textAlign = 'center';
    const retryBtn = document.createElement('button');
    retryBtn.className = 'btn-retry-single';
    retryBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
    retryBtn.title = 'Send single outreach email now';

    // Handle single sending trigger
    retryBtn.addEventListener('click', async () => {
      retryBtn.disabled = true;
      retryBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      await sendOutreachEmail(index);
      retryBtn.disabled = false;
      retryBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
    });

    tdAction.appendChild(retryBtn);
    tr.appendChild(tdAction);

    campaignQueueBody.appendChild(tr);
  });
}

function getStatusClass(status) {
  switch (status) {
    case 'Pending': return 'status-pending';
    case 'Sending': return 'status-sending';
    case 'Sent': return 'status-sent';
    case 'Failed': return 'status-failed';
    default: return 'status-pending';
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'Pending': return '<i class="fa-regular fa-clock"></i>';
    case 'Sending': return '<i class="fa-solid fa-spinner fa-spin"></i>';
    case 'Sent': return '<i class="fa-solid fa-circle-check"></i>';
    case 'Failed': return '<i class="fa-solid fa-circle-xmark"></i>';
    default: return '<i class="fa-regular fa-clock"></i>';
  }
}

// Campaign Progress Update
function updateCampaignStats() {
  const total = campaignQueue.length;
  const selected = campaignQueue.filter(item => item.selected).length;
  const sent = campaignQueue.filter(item => item.selected && item.status === 'Sent').length;
  const failed = campaignQueue.filter(item => item.selected && item.status === 'Failed').length;

  if (selected > 0) {
    showElement(campaignProgressSection);
    progressText.textContent = `${sent} / ${selected} Sent (Failed: ${failed})`;
    const pct = Math.round((sent / selected) * 100);
    progressPercent.textContent = `${pct}%`;
    progressBarFill.style.width = `${pct}%`;
  } else {
    hideElement(campaignProgressSection);
  }
}

// Campaign Logger
function addCampaignLog(message, type = 'system') {
  const log = document.createElement('div');
  log.className = `log-entry log-entry-${type}`;
  const time = new Date().toLocaleTimeString();

  let icon = '';
  if (type === 'sending') icon = '<i class="fa-solid fa-paper-plane" style="color: #60a5fa; animation: spin 1s linear infinite;"></i>';
  else if (type === 'sent') icon = '<i class="fa-solid fa-circle-check" style="color: #34d399;"></i>';
  else if (type === 'error') icon = '<i class="fa-solid fa-circle-xmark" style="color: #f87171;"></i>';
  else icon = '<i class="fa-solid fa-circle-info" style="color: var(--text-muted);"></i>';

  log.innerHTML = `${icon} <span>[${time}] ${message}</span>`;
  campaignLogs.appendChild(log);
  campaignLogs.scrollTop = campaignLogs.scrollHeight;
}

// Single Email Dispatch logic
async function sendOutreachEmail(index) {
  const item = campaignQueue[index];

  // Retrieve live config parameters
  const host = smtpHost.value.trim();
  const port = parseInt(smtpPort.value.trim(), 10);
  const secure = smtpSecure.checked;
  const user = smtpUser.value.trim();
  const pass = smtpPass.value.trim();
  const fromName = smtpFromName.value.trim();

  if (!host || !port || !user || !pass) {
    addCampaignLog(`Error sending to ${item.email}: SMTP details are missing. Please complete SMTP configuration.`, 'error');
    item.status = 'Failed';
    item.error = 'SMTP Configuration incomplete';
    renderCampaignQueue();
    updateCampaignStats();
    return false;
  }

  // Save config
  smtpConfig = { host, port, secure, auth: { user, pass }, fromName };
  localStorage.setItem('hn_smtp_config', JSON.stringify(smtpConfig));

  item.status = 'Sending';
  renderCampaignQueue();
  updateCampaignStats();
  addCampaignLog(`Sending email to ${item.email}...`, 'sending');

  // Compile Subject and Body replacing placeholders
  const role = item.role;
  const company = item.companyName;
  const email = item.email;

  let subject = tplSubject.value || emailTemplate.subject;
  let body = tplBody.value || emailTemplate.body;

  // Placeholders mapping
  const mappings = {
    '{email}': email,
    '{company}': company,
    '{role}': role,
    '{resume_name}': userResume.name,
    '{resume_email}': userResume.email,
    '{resume_linkedin}': userResume.linkedin,
    '{resume_github}': userResume.github,
    '{resume_phone}': userResume.phone
  };

  // Perform replacements
  for (const [placeholder, val] of Object.entries(mappings)) {
    subject = subject.replaceAll(placeholder, val || '');
    body = body.replaceAll(placeholder, val || '');
  }

  try {
    const response = await fetch('/api/smtp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smtpConfig,
        to: email,
        subject,
        body,
        fromName
      })
    });

    const data = await response.json();
    if (data.success) {
      item.status = 'Sent';
      item.error = '';
      addCampaignLog(`Email sent successfully to ${item.email}!`, 'sent');
      renderCampaignQueue();
      updateCampaignStats();
      return true;
    } else {
      item.status = 'Failed';
      item.error = data.error || 'Unknown error';
      addCampaignLog(`Failed sending to ${item.email}: ${item.error}`, 'error');
      renderCampaignQueue();
      updateCampaignStats();
      return false;
    }
  } catch (err) {
    item.status = 'Failed';
    item.error = err.message || 'Network error';
    addCampaignLog(`Network error sending to ${item.email}: ${item.error}`, 'error');
    renderCampaignQueue();
    updateCampaignStats();
    return false;
  }
}

// Select All checkbox trigger
chkSelectAllQueue.addEventListener('change', () => {
  const checked = chkSelectAllQueue.checked;
  campaignQueue.forEach(item => item.selected = checked);
  renderCampaignQueue();
  updateCampaignStats();
});

// Start Campaign Action
btnStartCampaign.addEventListener('click', async () => {
  // Save template settings
  emailTemplate.subject = tplSubject.value.trim() || DEFAULT_TEMPLATE.subject;
  emailTemplate.body = tplBody.value || DEFAULT_TEMPLATE.body;
  localStorage.setItem('hn_smtp_template', JSON.stringify(emailTemplate));

  // Check SMTP settings
  const host = smtpHost.value.trim();
  const port = parseInt(smtpPort.value.trim(), 10);
  const user = smtpUser.value.trim();
  const pass = smtpPass.value.trim();

  if (!host || !port || !user || !pass) {
    alert('Please enter SMTP credentials before starting the campaign.');
    return;
  }

  const pendingSelected = campaignQueue.filter(item => item.selected && item.status !== 'Sent');
  if (pendingSelected.length === 0) {
    alert('No pending selected recipients in the queue.');
    return;
  }

  // Start campaign loop
  campaignTransmitter.active = true;
  campaignTransmitter.paused = false;

  btnStartCampaign.disabled = true;
  btnPauseCampaign.disabled = false;
  btnResetCampaign.disabled = true;
  chkSelectAllQueue.disabled = true;

  addCampaignLog(`Starting bulk email outreach campaign for ${pendingSelected.length} contacts...`, 'system');
  runNextInQueue();
});

// Pause Campaign Action
btnPauseCampaign.addEventListener('click', () => {
  campaignTransmitter.paused = true;
  btnPauseCampaign.disabled = true;
  addCampaignLog('Pausing campaign queue. Running loop will stop after the current email finishes.', 'system');
});

// Reset Campaign Queue Action
btnResetCampaign.addEventListener('click', () => {
  if (confirm('Reset status for all recipients in the queue to Pending?')) {
    campaignQueue.forEach(item => {
      item.status = 'Pending';
      item.error = '';
    });
    campaignLogs.innerHTML = '';
    addCampaignLog('Queue status reset.', 'system');
    renderCampaignQueue();
    updateCampaignStats();
  }
});

async function runNextInQueue() {
  if (campaignTransmitter.paused) {
    addCampaignLog('Campaign paused.', 'system');
    resetQueueControlButtons();
    return;
  }

  // Find first selected item that is not 'Sent'
  const nextIndex = campaignQueue.findIndex(item => item.selected && item.status !== 'Sent');

  if (nextIndex === -1) {
    addCampaignLog('Outreach campaign completed! All selected emails successfully processed.', 'sent');
    resetQueueControlButtons();
    return;
  }

  // Send email to this index
  await sendOutreachEmail(nextIndex);

  // Check delay and trigger next
  const delaySec = parseInt(campaignDelay.value, 10) || 2;
  if (!campaignTransmitter.paused) {
    addCampaignLog(`Waiting for ${delaySec} seconds before sending next email...`, 'system');
    campaignTransmitter.timerId = setTimeout(() => {
      runNextInQueue();
    }, delaySec * 1000);
  } else {
    resetQueueControlButtons();
  }
}

function resetQueueControlButtons() {
  campaignTransmitter.active = false;
  btnStartCampaign.disabled = false;
  btnPauseCampaign.disabled = true;
  btnResetCampaign.disabled = false;
  chkSelectAllQueue.disabled = false;
  if (campaignTransmitter.timerId) {
    clearTimeout(campaignTransmitter.timerId);
  }
}

// Initial Calls
updateResumeUI();
loadSMTPAndTemplates();

