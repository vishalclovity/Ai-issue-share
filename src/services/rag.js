// src/services/rag.js
import { logger } from '../utils/logger.js';

const BASE_URL = process.env.APP_RUNNER_BASE_URL || 'https://forgeapps.clovity.com';
const API_KEY  = process.env.APP_RUNNER_API_KEY
  || process.env.RAG_AUTH_TOKEN
  || process.env.APP_RUNNER_AUTH_TOKEN
  || '';
const USE_STUB = !BASE_URL || !API_KEY || process.env.USE_RAG_STUB === '1';
const EVENT    = 'jqlgeneration';

// --------- Helpers ----------
const ISSUE_KEY_RE = /\b([A-Z][A-Z0-9]+-\d+)\b/gi;

function buildStubJqlFromPrompt(prompt = '') {
  const keys = Array.from(prompt.matchAll(ISSUE_KEY_RE))
    .map(m => (m[1] || '').toUpperCase());
  if (keys.length) return `issuekey in (${keys.join(', ')}) ORDER BY updated DESC`;

  const project = /\bproject\s*=\s*([A-Z][A-Z0-9]+)\b/i.exec(prompt)?.[1]?.toUpperCase();
  if (project) return `project = ${project} AND statusCategory != Done ORDER BY updated DESC`;

  return `statusCategory != Done AND updated >= -7d ORDER BY updated DESC`;
}

// --------- Public API ----------
export async function parsePromptWithRag({ prompt, orgId, locale, userId }) {
  if (USE_STUB) {
    const jql = buildStubJqlFromPrompt(prompt || '');
    const out = {
      jql,
      fields: ['summary', 'status', 'priority', 'assignee', 'labels', 'created', 'updated', 'duedate'],
      recipients: [],
      answer: `Here are the matching issues based on your prompt.`,
      followups: [{ question: 'Confirm this list or edit the prompt?' }]
    };
    logger.info('rag:parse:ok:stub', { hasJql: !!out.jql });
    console.info('[AI Issue Share][RAG][STUB] parse →', out);
    return out;
  }

  console.info('[AI Issue Share][RAG] parsePromptWithRag → envOk?', !!BASE_URL && !!API_KEY, {
    baseUrlPresent: !!BASE_URL, apiKeyPresent: !!API_KEY
  });

  const resp = await fetch(`${BASE_URL}/v0/api/query`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: prompt, event: EVENT, orgId, locale, userId })
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error('[AI Issue Share][RAG] parse error', resp.status, text?.slice(0, 400));
    throw new Error(`RAG parse failed ${resp.status}: ${text?.slice(0, 400) || 'Unknown'}`);
  }

  const raw = await resp.json();
  const result = raw?.data?.result || raw?.result || raw;

  // Ensure we read JQL from the correct field
  const normalized = {
    jql: result?.jql || result?.JQL || null,
    fields: Array.isArray(result?.fields) ? result.fields : [],
    recipients: Array.isArray(result?.recipients) ? result.recipients : [],
    answer: result?.answer || 'Here are the matching issues based on your prompt.',
    followups: Array.isArray(result?.followups) ? result.followups : [{ question: 'Confirm this list or edit the prompt?' }]
  };

  logger.info('rag:parse:ok', { hasJql: !!normalized.jql, recipients: normalized.recipients.length });
  console.info('[AI Issue Share][RAG] parse OK', normalized);
  return normalized;
}

export async function sendIssueShareEmail({
  orgId, userId, locale, jql, issues, recipients, cc, bcc, subject, body, sender
}) {
  if (USE_STUB) {
    const stub = {
      success: true,
      data: {
        messageId: `mock:${Date.now()}`,
        provider: 'mock',
        status: 'queued',
        previewUrl: 'https://example.com/preview/mock',
        tracking: { openTracking: false, clickTracking: false, secureLink: null }
      }
    };
    console.info('[AI Issue Share][RAG][STUB] send →', {
      recipients, subjectPreview: String(subject || '').slice(0, 140),
      jqlPreview: String(jql || '').slice(0, 160),
      count: Array.isArray(issues) ? issues.length : 0
    });
    return stub;
  }

  console.info('[AI Issue Share][RAG] sendIssueShareEmail → envOk?', !!BASE_URL && !!API_KEY, {
    recipientsCount: Array.isArray(recipients) ? recipients.length : 0,
    hasSubject: !!subject,
    hasBody: !!body
  });

  // API expects single "to" plus arrays for cc/bcc
  const to = Array.isArray(recipients) ? recipients[0] : recipients;
  const ccList = Array.isArray(cc) ? cc : [];
  const bccList = Array.isArray(bcc) ? bcc : [];

  const payload = {
    query: {
      subject,           // subject from UI
      body,              // HTML body
      to,
      cc: ccList,
      bcc: bccList,
      sender: sender || 'AI Issue Share'
    },
    event: 'email_notification',
    orgId,
    locale
  };

  const resp = await fetch(`${BASE_URL}/v0/api/email/send`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.APP_RUNNER_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error('[AI Issue Share][RAG] send error', resp.status, text?.slice(0, 400));
    throw new Error(`Issue share send failed ${resp.status}: ${text?.slice(0, 400) || 'Unknown'}`);
  }

  const out = await resp.json();
  logger.info('rag:send:ok', { to, ccCount: ccList.length, bccCount: bccList.length });
  console.info('[AI Issue Share][RAG] send OK', out);
  return out;
}
