const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// AgentMail config
const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY || 'am_us_inbox_ec1c165f585ed00f28e1a6d17a4ddf198193d215e4c7fa9d8bcc9f6c2b3275e7';
const AGENTMAIL_INBOX = process.env.AGENTMAIL_INBOX || 'mrbubba@agentmail.to';

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Rate limiting - max 3 submissions per IP per hour
const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: 'Too many submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Service templates
const serviceTemplates = {
  'data-cleanup': {
    title: 'Data Cleanup Request',
    fields: [
      { name: 'fileDescription', label: 'Describe your data (what kind of file, what issues)', type: 'textarea', required: true }
    ]
  },
  'website': {
    title: 'Website Project',
    fields: [
      { name: 'businessDescription', label: 'Describe your business and what you do', type: 'textarea', required: true },
      { name: 'websiteGoal', label: 'What is the main goal of your website?', type: 'text', required: true },
      { name: 'examples', label: 'Links to websites you like (optional)', type: 'text', required: false }
    ]
  },
  'saas': {
    title: 'SaaS Product',
    fields: [
      { name: 'productDescription', label: 'Describe your SaaS product idea', type: 'textarea', required: true },
      { name: 'targetMarket', label: 'Who is your target market?', type: 'text', required: true },
      { name: 'features', label: 'Key features needed', type: 'textarea', required: false }
    ]
  },
  'automation': {
    title: 'Business Automation',
    fields: [
      { name: 'workflowDescription', label: 'Describe the task you want to automate', type: 'textarea', required: true },
      { name: 'timeSpent', label: 'How much time does this take per week?', type: 'text', required: true }
    ]
  },
  'spreadsheet': {
    title: 'Spreadsheet Template',
    fields: [
      { name: 'templateType', label: 'What type of template do you need?', type: 'text', required: true },
      { name: 'features', label: 'What features/formulas do you need?', type: 'textarea', required: false }
    ]
  },
  'pdf-processing': {
    title: 'PDF Processing',
    fields: [
      { name: 'pdfDescription', label: 'Describe what you need extracted from the PDF', type: 'textarea', required: true },
      { name: 'outputFormat', label: 'What output format do you need? (CSV, Excel, Word)', type: 'text', required: true }
    ]
  },
  'data-viz': {
    title: 'Data Visualization',
    fields: [
      { name: 'dataDescription', label: 'Describe your data and what you want to visualize', type: 'textarea', required: true },
      { name: 'chartTypes', label: 'What types of charts do you need?', type: 'text', required: false }
    ]
  },
  'resume': {
    title: 'Resume & Cover Letter',
    fields: [
      { name: 'targetRole', label: 'What role are you applying for?', type: 'text', required: true },
      { name: 'jobDescription', label: 'Paste the job description (optional)', type: 'textarea', required: false }
    ]
  },
  'lead-list': {
    title: 'Lead List Research',
    fields: [
      { name: 'industry', label: 'What industry?', type: 'text', required: true },
      { name: 'location', label: 'What location?', type: 'text', required: true },
      { name: 'companySize', label: 'Company size preference?', type: 'text', required: false }
    ]
  },
  'proposal': {
    title: 'Business Proposal',
    fields: [
      { name: 'projectDescription', label: 'Describe the project', type: 'textarea', required: true },
      { name: 'deadline', label: 'Deadline (if any)', type: 'text', required: false }
    ]
  },
  'email-copy': {
    title: 'Email Copywriting',
    fields: [
      { name: 'productService', label: 'What product/service are you promoting?', type: 'text', required: true },
      { name: 'emailType', label: 'What type of email? (welcome, promotional, follow-up)', type: 'text', required: true },
      { name: 'targetAudience', label: 'Who is your target audience?', type: 'text', required: false }
    ]
  },
  'api-integration': {
    title: 'API Integration',
    fields: [
      { name: 'services', label: 'What services do you want to connect?', type: 'text', required: true },
      { name: 'dataFlow', label: 'Describe the data flow', type: 'textarea', required: true }
    ]
  },
  'social-media': {
    title: 'Social Media Content',
    fields: [
      { name: 'platforms', label: 'What platforms? (Instagram, Facebook, LinkedIn)', type: 'text', required: true },
      { name: 'niche', label: 'What is your niche/industry?', type: 'text', required: true },
      { name: 'goals', label: 'What are your content goals?', type: 'text', required: false }
    ]
  },
  'database-report': {
    title: 'Database Report',
    fields: [
      { name: 'dataSource', label: 'What is your data source?', type: 'text', required: true },
      { name: 'reportNeeds', label: 'What insights do you need from the data?', type: 'textarea', required: true }
    ]
  }
};

// API endpoint to get form config
app.get('/api/config', (req, res) => {
  res.json({
    services: Object.entries(serviceTemplates).map(([key, val]) => ({
      value: key,
      label: val.title
    }))
  });
});

// API endpoint to get template for a service
app.get('/api/template/:service', (req, res) => {
  const template = serviceTemplates[req.params.service];
  if (!template) return res.status(404).json({ error: 'Service not found' });
  res.json(template);
});

// Form submission endpoint
app.post('/api/submit', formLimiter, async (req, res) => {
  try {
    const { name, email, business, serviceType, ...additionalFields } = req.body;
    
    if (!name || !email || !serviceType) {
      return res.status(400).json({ error: 'Name, email, and service type are required' });
    }
    
    const template = serviceTemplates[serviceType];
    if (!template) {
      return res.status(400).json({ error: 'Invalid service type' });
    }
    
    // Build email body
    let emailBody = `New Project Inquiry\n\n`;
    emailBody += `Name: ${name}\n`;
    emailBody += `Email: ${email}\n`;
    if (business) emailBody += `Business: ${business}\n`;
    emailBody += `Service: ${template.title}\n\n`;
    
    // Add additional fields
    for (const field of template.fields) {
      if (additionalFields[field.name]) {
        emailBody += `${field.label}: ${additionalFields[field.name]}\n`;
      }
    }
    
    emailBody += `\n---\nSent from Mr Bubba Services contact form\n`;
    emailBody += `IP: ${req.ip}\n`;
    emailBody += `User-Agent: ${req.get('User-Agent')}\n`;
    emailBody += `Timestamp: ${new Date().toISOString()}\n`;
    
    // Send via AgentMail
    const response = await axios.post(
      `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(AGENTMAIL_INBOX)}/messages/send`,
      {
        to: [AGENTMAIL_INBOX],
        subject: `New Inquiry: ${template.title} - ${name}`,
        text: emailBody
      },
      {
        headers: {
          'Authorization': `Bearer ${AGENTMAIL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status === 200 || response.status === 201) {
      res.json({ success: true, message: 'Message sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send message' });
    }
  } catch (error) {
    console.error('Error sending message:', error.message);
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

// Serve the form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
