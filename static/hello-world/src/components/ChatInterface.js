// src/components/ChatInterface.jsx
import { useState, useRef, useEffect, useMemo } from 'react';
import { invoke, view as forgeView, router } from '@forge/bridge';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import html2pdf from 'html2pdf.js';

// shadcn/ui
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Drawer } from './ui/drawer';
import { MoreAppsDrawer } from './MoreAppsDrawer';

// icons
import {
  Bot as BotIcon, User as UserIcon, Download,
  Search, Users, Calculator, Activity, Calendar, Store, AlertCircle
} from 'lucide-react';

import "../index.css";

/* ---------- Markdown helpers ---------- */
marked.setOptions({ gfm: true, breaks: true });
function safeJson(v) { try { return JSON.stringify(v, null, 2); } catch { return String(v); } }
function toMd(v) { if (v == null) return ""; if (typeof v === "string") return v; if (Array.isArray(v)) return v.map(x => typeof x === "string" ? x : safeJson(x)).join("\n"); return safeJson(v); }
function stripDebugSuffix(md) { return String(md).replace(/\s*⚠️\s*\(\d+\)\s*\[[\s\S]*\]\s*$/m, "").trim(); }
function renderMarkdownToSafeHtml(content) { const md = stripDebugSuffix(toMd(content)).replace(/\r\n/g, "\n"); const html = marked.parse(md); return DOMPurify.sanitize(html); }

/* ---------- Quick Actions icons ---------- */
const qaIconMap = {
  search: Search, users: Users, calculator: Calculator, activity: Activity, calendar: Calendar, 'alert-circle': AlertCircle
};

/* ---------- Story Points field keys ---------- */
const STORY_POINTS_KEY_FALLBACK = 'customfield_10031';

/* ---------- Small HTML helpers ---------- */
function escapeHtml(s = '') {
  return String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function nl2br(s = '') {
  return escapeHtml(s).replace(/\r\n|\r|\n/g, '<br/>');
}
const trimSite = (u) => String(u || '').replace(/\/+$/, '');
const joinNames = (arr, key = 'name') =>
  Array.isArray(arr) && arr.length
    ? arr.map((x) => (typeof x === 'string' ? x : x?.[key])).filter(Boolean).join(', ')
    : '—';
const truncate = (str, n) => {
  const s = String(str || '');
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};

function sortIssuesAscByCreated(issues = []) {
  return [...issues].sort((a, b) => {
    const aT = new Date(a?.fields?.created || 0).getTime();
    const bT = new Date(b?.fields?.created || 0).getTime();
    return aT - bT; // oldest first
  });
}

// --- ADF (Jira v3) -> plain text ---
function adfToPlain(doc) {
  try {
    if (typeof doc === 'string') return doc;        // already plain
    if (!doc || typeof doc !== 'object') return ''; // nothing to do

    const out = [];
    const walk = (node) => {
      if (!node) return;
      const t = node.type;

      // inline primitives
      if (t === 'text') { out.push(node.text || ''); return; }
      if (t === 'hardBreak') { out.push('\n'); return; }
      if (t === 'emoji') { out.push(node.attrs?.shortName || ''); return; }
      if (t === 'mention') { out.push(node.attrs?.text || ''); return; }
      if (t === 'inlineCard' || t === 'blockCard') { out.push(node.attrs?.url || ''); return; }

      // block-ish containers
      if (Array.isArray(node.content)) node.content.forEach(walk);

      // add newlines after certain block nodes
      if (t === 'paragraph' || t === 'heading' || t === 'blockquote' || t === 'codeBlock' || t === 'panel' || t === 'listItem') {
        out.push('\n');
      }
    };

    if (Array.isArray(doc.content)) doc.content.forEach(walk); else walk(doc);

    return out.join('')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch {
    return '';
  }
}

/* ---------- Build final HTML from PLAIN TEXT + issues (expanded columns) ---------- */
function buildEmailHtmlFromText({
  introText = '',
  issues = [],
  senderName = 'You',
  content,
  siteUrl,                // optional: "https://your-domain.atlassian.net"
  dateLocale = 'en-US',
  maxDescription = 220    // trim description in table
}) {
  const title = content?.email?.title || 'Issue Share – Summary';
  const greeting = content?.email?.greeting || 'Hello,';
  const prepared = content?.email?.preparedByLabel || 'Prepared by';
  const regardsLb = content?.email?.regardsLabel || 'Regards,';
  const introHtml = nl2br(introText || (content?.email?.defaultIntro || 'Please find the requested issues below. You can reply to this email for any changes or clarifications.'));

  const toDateTime = (s) => (s ? new Date(s).toLocaleString(dateLocale) : '—');
  const toDate = (s) => (s ? new Date(s).toLocaleDateString(dateLocale) : '—');

  const rows = (issues || []).map((i) => {
    const key = i?.key || '';
    const f = i?.fields || {};

    const keyCell = siteUrl
      ? `<a href="${trimSite(siteUrl)}/browse/${encodeURIComponent(key)}" style="color:#0ea5e9;text-decoration:none">${escapeHtml(key)}</a>`
      : escapeHtml(key);

    const summary = escapeHtml(f.summary || '—');
    const typeName = escapeHtml(f.issuetype?.name || '—');
    const statusName = escapeHtml(f.status?.name || '—');
    const priority = escapeHtml(f.priority?.name || '—');
    const assignee = escapeHtml(f.assignee?.displayName || '—');
    const reporter = escapeHtml(f.reporter?.displayName || '—');
    const projectKey = escapeHtml(f.project?.key || f.project?.name || '—');

    const created = escapeHtml(toDateTime(f.created));
    const updated = escapeHtml(toDateTime(f.updated));
    const due = escapeHtml(toDate(f.duedate));

    const labels = escapeHtml(joinNames(f.labels, null));
    const components = escapeHtml(joinNames(f.components));
    const fixVersions = escapeHtml(joinNames(f.fixVersions));

    const descRaw = adfToPlain(f.description);
    const description = escapeHtml(truncate(descRaw || '—', maxDescription));

    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-weight:600">${keyCell}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7">${summary}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7">${typeName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7">${statusName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7">${priority}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7">${assignee}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7">${reporter}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7">${projectKey}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7">${created}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7">${updated}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7">${due}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7">${labels}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7">${components}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7">${fixVersions}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;white-space:pre-wrap">${description}</td>
      </tr>
    `;
  }).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="1080" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#0f172a;color:#fff;padding:18px 24px;font-size:18px;font-weight:600;">
              ${escapeHtml(title)}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;color:#0f172a;font-size:14px;line-height:1.6">
              <p style="margin:0 0 12px 0;">${escapeHtml(greeting)}</p>
              <p style="margin:0 0 12px 0;">${introHtml}</p>
              <p style="margin:0 0 0 0;color:#475569">${escapeHtml(prepared)} <strong>${escapeHtml(senderName)}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 16px 24px">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background:#f1f5f9;text-align:left;">
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">Key</th>
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">Summary</th>
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">Type</th>
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">Status</th>
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">Priority</th>
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">Assignee</th>
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">Reporter</th>
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">Project</th>
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">Created</th>
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">Updated</th>
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">Due</th>
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">Labels</th>
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">Components</th>
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">Fix Versions</th>
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0;min-width:240px">Description</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows || `<tr><td colspan="15" style="padding:12px;color:#64748b;">No issues selected.</td></tr>`}
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;color:#475569;font-size:12px;border-top:1px solid #e2e8f0">
              <p style="margin:0 0 6px 0;">${escapeHtml(regardsLb)}</p>
              <p style="margin:0 0 0 0;"><strong>${escapeHtml(senderName)}</strong></p>
            </td>
          </tr>
        </table>
        <div style="height:24px;"></div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ---------- Issue table (mini + modal) ---------- */
function IssueTable({ issues = [], onKeyClick, spKey = STORY_POINTS_KEY_FALLBACK }) {
  return (
    <div className="overflow-auto border rounded">
      <table className="w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="text-left p-2 w-28">Key</th>
            <th className="text-left p-2">Summary</th>
            <th className="text-left p-2 w-28">Type</th>
            <th className="text-left p-2 w-28">Status</th>
            <th className="text-left p-2 w-28">Priority</th>
            <th className="text-left p-2 w-40">Assignee</th>
            <th className="text-left p-2 w-40">Reporter</th>
            <th className="text-left p-2 w-40">Created</th>
            <th className="text-left p-2 w-40">Due</th>
            <th className="text-left p-2 w-56">Labels</th>
            <th className="text-left p-2 w-56">Components</th>
            <th className="text-left p-2 w-56">Fix Versions</th>
            <th className="text-left p-2 w-28">Story Pts</th>
            <th className="text-left p-2 w-28">Parent</th>
            <th className="text-left p-2 w-44">Updated</th>
            <th className="text-left p-2 w-44">Description</th>
          </tr>
        </thead>
        <tbody>
          {issues.length === 0 ? (
            <tr><td colSpan={15} className="p-3 text-slate-500">No issues.</td></tr>
          ) : issues.map((i) => {
            const f = i.fields || {};
            const labels = Array.isArray(f.labels) ? f.labels.join(', ') : '—';
            const components = Array.isArray(f.components) ? f.components.map(c => c?.name).filter(Boolean).join(', ') : '—';
            const fixVersions = Array.isArray(f.fixVersions) ? f.fixVersions.map(v => v?.name).filter(Boolean).join(', ') : '—';
            const storyPoints = f?.[spKey] ?? f?.storyPoints ?? '—';
            const parentKey = f?.parent?.key || '—';

            return (
              <tr key={i.key} className="border-t">
                <td className="p-2">
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => onKeyClick?.(i.key)}
                    title={`Open ${i.key}`}
                  >
                    {i.key}
                  </button>
                </td>
                <td className="p-2">{f.summary || '—'}</td>
                <td className="p-2">{f.issuetype?.name || '—'}</td>
                <td className="p-2">{f.status?.name || '—'}</td>
                <td className="p-2">{f.priority?.name || '—'}</td>
                <td className="p-2">{f.assignee?.displayName || '—'}</td>
                <td className="p-2">{f.reporter?.displayName || '—'}</td>
                <td className="p-2">{f.created ? new Date(f.created).toLocaleString() : '—'}</td>
                <td className="p-2">{f.duedate ? new Date(f.duedate).toLocaleDateString() : '—'}</td>
                <td className="p-2">{labels || '—'}</td>
                <td className="p-2">{components || '—'}</td>
                <td className="p-2">{fixVersions || '—'}</td>
                <td className="p-2">{storyPoints ?? '—'}</td>
                <td className="p-2">{parentKey}</td>
                <td className="p-2">{f.updated ? new Date(f.updated).toLocaleString() : '—'}</td>
                <td className="p-2">{f.description ? truncate(adfToPlain(f.description), 100) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Small sub-components ---------- */
function PromptForm({ value, onChange, onSubmit, isLoading, limit, placeholder }) {
  return (
    <form className="justify-self-center" onSubmit={onSubmit}>
      <div className="flex items-center gap-2 w-[600px] border p-1 rounded-[5px] shadow-sm bg-white">
        <Input
          value={value}
          onChange={onChange}
          maxLength={limit}
          placeholder={placeholder}
          disabled={isLoading}
          className="h-11 border-none outline-none focus-visible:ring-0 focus:ring-0 flex-grow bg-transparent"
        />
        <Button type="submit" disabled={isLoading || !value.trim()} className="h-10 !px-2 !rounded-[3px]">
          {isLoading ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" strokeWidth="4" stroke="currentColor" opacity="0.2" />
              <path d="M4 12a8 8 0 0 1 8-8" fill="none" strokeWidth="4" stroke="currentColor" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12.25 18.5V6M12.25 6L18.25 12M12.25 6L6.25 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </Button>
      </div>
      <div id="char-counter" className="mt-1 text-xs text-slate-500 text-right">
        {value.length}/{limit}
      </div>
    </form>
  );
}

function BubbleHeader({ m, onDownloadPdf }) {
  const isUser = m.type === 'user';
  return (
    <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
          {isUser ? <UserIcon size={14} /> : <BotIcon size={14} />}
        </div>
        {m.timestamp && <span>{m.timestamp}</span>}
      </div>
      {m.type === 'bot' && String(m.content || '').length > 500 && (
        <Button size="sm" variant="outline" className="h-7 gap-1 px-2" onClick={onDownloadPdf}>
          <Download size={14} /> PDF
        </Button>
      )}
    </div>
  );
}

// --- Empty state shown when there are 0 issues ---
function NoResults({ jql, onEdit, suggestions = [] }) {
  return (
    <div className="mt-3 rounded border bg-white p-3 space-y-2">
      <div className="text-sm font-semibold">No issues found</div>

      {jql ? (
        <div className="text-xs text-slate-600">
          <div className="mb-1">JQL tried:</div>
          <pre className="whitespace-pre-wrap text-[11px] bg-slate-50 border rounded p-2">{jql}</pre>
        </div>
      ) : null}

      {suggestions.length > 0 && (
        <div className="text-xs text-slate-700">
          <div className="mb-1 font-medium">Try:</div>
          <ul className="list-disc ml-5 space-y-0.5">
            {suggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      <div className="pt-1">
        <Button size="sm" variant="outline" onClick={onEdit}>Edit prompt</Button>
      </div>
    </div>
  );
}


export default function ChatInterface({
  showChat,
  onBack,
  onOpenChat,
  content,
  locale
}) {
  const [messages, setMessages] = useState([]);
  const [lastPrompt, setLastPrompt] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cloudId, setCloudId] = useState(null);
  const [isMoreAppsOpen, setIsMoreAppsOpen] = useState(false);

  // whoami (for subject "by currentUser" and sender)
  const [me, setMe] = useState({ displayName: 'You' });

  // email composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [recipients, setRecipients] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  // plain text body (no HTML in the textbox)
  const [introText, setIntroText] = useState('');

  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [errors, setErrors] = useState({});

  // issues modal
  const [issuesModalOpen, setIssuesModalOpen] = useState(false);
  const [issuesForModal, setIssuesForModal] = useState([]);
  const [issuesSearch, setIssuesSearch] = useState('');
  const [issuesPage, setIssuesPage] = useState(1);
  const PAGE_SIZE = 20;

  // which message the composer is based on
  const [composerSource, setComposerSource] = useState(null);

  const messagesEndRef = useRef(null);
  const messageRefs = useRef({});
  const LIMIT = 400;

  const waitingMessages = (content?.chat?.waitingMessages?.length
    ? content.chat.waitingMessages
    : ["Composing…", "Applying redactions…", "Resolving filters…"]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    (async () => {
      try {
        const ctx = await forgeView.getContext();
        if (ctx?.cloudId) {
          setCloudId(ctx.cloudId);
          console.info('[AI Issue Share][UI] Forge context:', { cloudId: ctx.cloudId });
        }
        const who = await invoke('whoami');
        if (who?.success && who?.data?.displayName) {
          setMe({ displayName: who.data.displayName });
        }
      } catch (e) {
        console.error('[AI Issue Share][UI] init failed:', e);
      }
    })();
  }, []);

  function openIssuesModal(allIssues = []) {
    setIssuesForModal(sortIssuesAscByCreated(allIssues));
    setIssuesSearch('');
    setIssuesPage(1);
    setIssuesModalOpen(true);
  }

  const filteredIssues = useMemo(() => {
    const q = issuesSearch.trim().toLowerCase();
    if (!q) return issuesForModal;
    return (issuesForModal || []).filter(i => {
      const f = i?.fields || {};
      return (
        (i?.key || '').toLowerCase().includes(q) ||
        (f?.summary || '').toLowerCase().includes(q) ||
        (f?.assignee?.displayName || '').toLowerCase().includes(q) ||
        (f?.reporter?.displayName || '').toLowerCase().includes(q) ||
        (f?.status?.name || '').toLowerCase().includes(q)
      );
    });
  }, [issuesForModal, issuesSearch]);

  const totalPages = Math.max(1, Math.ceil((filteredIssues.length || 0) / PAGE_SIZE));
  const pageSlice = filteredIssues.slice((issuesPage - 1) * PAGE_SIZE, issuesPage * PAGE_SIZE);

  function goIssue(key) {
    if (!key) return;
    const abs = content?.jira?.siteUrl ? `${trimSite(content.jira.siteUrl)}/browse/${key}` : `/browse/${key}`;
    router.open(abs, '_blank', 'noopener,noreferrer');
  }


  // NEW: id of the latest bot message that has issues
  const latestIssuesMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m?.type === 'bot' && (m?.meta?.issues?.length || 0) > 0) return m.id;
    }
    return null;
  }, [messages]);

  // OPEN composer for a specific message (not always the last one)
  function openComposerForMessage(msg) {
    const issues = msg?.meta?.issues || [];
    if (!issues.length) return;

    const keys = issues.map(i => i?.key).filter(Boolean);
    const who = me?.displayName || 'You';
    const subj = `Issues - [ ${keys.join(', ')} ] by ${who}`;
    const defaultIntro = (content?.email?.defaultIntro ||
      'Please find the requested issues below. You can reply to this email for any changes or clarifications.');

    setSubject(subj);
    setIntroText(defaultIntro);
    setComposerSource(msg);
    setComposerOpen(true);
  }


  const submitPrompt = async (userText) => {
    setLastPrompt(userText);
    const timeString = new Date().toLocaleTimeString((locale || 'en').split('_')[0] || 'en');

    setMessages(prev => [...prev, { id: Date.now(), type: 'user', content: userText, timestamp: timeString }]);

    setIsLoading(true);
    let loadingMsgTimer = setTimeout(() => {
      const msg = waitingMessages[Math.floor(Math.random() * waitingMessages.length)];
      setMessages(prev => [...prev, { id: Date.now() + 1, type: 'hint', content: msg }]);
    }, 7000);

    setComposerOpen(false);
    setComposerSource(null);
    try {
      const ctx = await forgeView.getContext();
      const currentLocale = ctx?.locale || locale || 'en_US';
      const userId = ctx?.accountId;
      console.info('[AI Issue Share][UI] submitting prompt:', userText);

      const response = await invoke('query-issue-share', {
        prompt: userText,
        orgId: cloudId,
        locale: currentLocale,
        userId
      });

      console.info('[AI Issue Share][UI] backend response:', response);

      const data = response?.data || {};
      const answer = toMd(data?.answer) || content?.defaultRetry?.retryMessage;
      const followups = Array.isArray(data?.followups) ? data.followups : [];
      const jqlBlock = data?.jql ? `\n\n**JQL Parsed:**\n\n\`\`\`jql\n${data.jql}\n\`\`\`` : '';
      const counts = Array.isArray(data?.issues) ? data.issues.length : 0;
      const stats = counts ? `\n\n**Issues matched:** ${counts}` : '';
      const keys = (data?.issues || []).map(i => i?.key).filter(Boolean).slice(0, 10);
      const preview = keys.length ? `\n\n**Preview:** ${keys.join(', ')}${keys.length < counts ? '…' : ''}` : '';

      const noResultsMsg = content?.chat?.noResultsMessage || 'No issues matched that prompt.';

      const botMd = (counts === 0)
        ? `${noResultsMsg}${jqlBlock}${stats}`
        : `${answer}${jqlBlock}${stats}${preview}`;

      setMessages(prev => [
        ...prev.filter(m => m.type !== 'hint'),
        {
          id: Date.now() + 2,
          type: 'bot',
          content: botMd,
          followups,
          meta: {
            jql: data?.jql || null,
            recipients: data?.recipients || [],
            fields: data?.fields || [],
            issues: data?.issues || []
          },
          timestamp: timeString
        }
      ]);
    } catch (error) {
      console.error('query-issue-share failed:', error);
      setMessages(prev => [
        ...prev.filter(m => m.type !== 'hint'),
        { id: Date.now() + 3, type: 'error', content: content?.defaultRetry?.retryMessage, timestamp: new Date().toLocaleTimeString() }
      ]);
    } finally {
      setIsLoading(false);
      clearTimeout(loadingMsgTimer);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    submitPrompt(inputValue.trim());
    setInputValue('');
  };

  const setMessageRef = (id) => (el) => {
    if (el) messageRefs.current[id] = el;
    else delete messageRefs.current[id];
  };

  const handleDownloadPdf = async (messageId) => {
    const node = messageRefs.current[messageId];
    if (!node) return;
    const wrapper = document.createElement('div');
    wrapper.style.padding = '16px';
    wrapper.style.fontFamily = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
    wrapper.style.color = '#0f172a';
    const heading = document.createElement('div');
    heading.innerHTML = `
      <h2 style="margin:0 0 4px 0;">${content?.assistant?.title || 'Issue Share Assistant'}</h2>
      <div style="font-size:12px;color:#475569;margin-bottom:12px;">
        Transcript • ${new Date().toLocaleString((locale || 'en').split('_')[0] || 'en')}
      </div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:8px 0 16px 0;" />
    `;
    wrapper.appendChild(heading);
    wrapper.appendChild(node.cloneNode(true));
    await html2pdf().set({
      margin: [10, 10, 10, 10],
      filename: `issue-share-chat-${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    }).from(wrapper).save();
  };

  // ----- validation helpers -----
  function parseList(s = '') {
    return s.split(/[,\s;]+/).map(x => x.trim()).filter(Boolean);
  }
  function isEmail(x = '') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
  }
  function validateEmailLists({ to, cc, bcc }) {
    const e = {};
    if (!to.length) e.recipients = 'At least one recipient is required.';
    if (to.some(v => !isEmail(v))) e.recipients = 'Invalid email in To.';
    if (cc.length && cc.some(v => !isEmail(v))) e.cc = 'Invalid email in CC.';
    if (bcc.length && bcc.some(v => !isEmail(v))) e.bcc = 'Invalid email in BCC.';
    return e;
  }

  // SEND EMAIL via backend -> RAG email API
  const handleSendEmail = async () => {
    if (!composerSource?.meta?.jql) {
      console.warn('[AI Issue Share][UI] No JQL to send; aborting.');
      return;
    }
    if (!Array.isArray(composerSource?.meta?.issues) || composerSource.meta.issues.length === 0) {
      setErrors(prev => ({ ...prev, body: content?.email?.noIssuesError || 'No issues to send. Please adjust your prompt.' }));
      return;
    }

    const recips = parseList(recipients);
    const ccList = parseList(cc);
    const bccList = parseList(bcc);

    const v = validateEmailLists({ to: recips, cc: ccList, bcc: bccList });
    if (!subject.trim()) v.subject = 'Subject is required.';
    if (!introText.trim()) v.body = 'Message is required.';
    setErrors(v);
    if (Object.keys(v).length) return;

    const timeString = new Date().toLocaleTimeString((locale || 'en').split('_')[0] || 'en');
    setIsSendingEmail(true);
    try {
      const ctx = await forgeView.getContext();
      const currentLocale = ctx?.locale || locale || 'en_US';
      const userId = ctx?.accountId;
      const who = me?.displayName || 'You';

      // Build FINAL HTML from the plain text message (with expanded columns)
      const bodyHtml = buildEmailHtmlFromText({
        introText,
        issues: sortIssuesAscByCreated(composerSource.meta.issues || []),
        senderName: who,
        content,
        siteUrl: content?.jira?.siteUrl,
        dateLocale: (locale || 'en').replace('_', '-')
      });

      const payload = {
        orgId: cloudId,
        userId,
        locale: currentLocale,
        jql: composerSource.meta.jql,
        issues: composerSource.meta.issues,
        recipients: recips,
        cc: ccList,
        bcc: bccList,
        subject: subject || '',
        body: bodyHtml,
        sender: who
      };

      console.info('[AI Issue Share][UI] sending email (plain→HTML) payload meta:', {
        toCount: recips.length, ccCount: ccList.length, bccCount: bccList.length,
        subjectPreview: String(payload.subject).slice(0, 140),
        issueCount: Array.isArray(payload.issues) ? payload.issues.length : 0
      });

      const res = await invoke('send-issue-share', payload);
      console.info('[AI Issue Share][UI] send-issue-share response:', res);

      const ok = !!res?.success;
      const msg = ok ? '✅ Email request accepted.' : `❌ Email send failed: ${res?.error || 'Unknown error'}`;
      setMessages(prev => [...prev, { id: Date.now() + 4, type: ok ? 'bot' : 'error', content: msg, timestamp: timeString }]);
      if (ok) setComposerOpen(false);
    } catch (e) {
      console.error('[AI Issue Share][UI] send-issue-share error:', e);
      setMessages(prev => [...prev, { id: Date.now() + 5, type: 'error', content: 'Email send failed. Check console logs.', timestamp: timeString }]);
    } finally {
      setIsSendingEmail(false);
    }
  };

  /* ----------------- UI ----------------- */
  return (
    <div className="grid grid-rows-[40px_1fr_auto] h-[98dvh]">
      {/* MAIN */}
      <main className={`row-start-2 ${showChat && messages.length !== 0 ? "overflow-y-auto no-scrollbar" : "grid place-items-center"}`}>
        {/* LANDING */}
        {!showChat && (
          <div className="mx-auto pb-2">
            <h1 className="text-center text-[44px] font-semibold text-[#222] !font-sans">{content?.heroTitle}</h1>
            <p className="mt-2 text-center text-[28px] font-normal text-[#5B5B5B]">{content?.heroSubtitle}</p>

            <Card className="my-8 rounded-xl mx-auto max-w-5xl">
              <CardContent className="space-y-2 p-2 bg-[rgba(233,242,254,0.6)]">
                {(content?.specRows || []).map((row) => (
                  <div key={row.id} className="grid grid-cols-[270px_1fr] items-start gap-y-1 px-2 py-0.5">
                    <div className="flex items-center gap-3 font-semibold text-[16px]">
                      <span className="h-2 w-2 rounded-full bg-[#131927]" />
                      {row.label}
                    </div>
                    <div className="space-y-1 text-[16px]">
                      {(row.links || []).map((l, i) => <div key={i}><span>{l}</span></div>)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="mt-8 flex flex-col items-center gap-3">
              <Button onClick={onOpenChat}>{content?.ctas?.run || 'Open AI Issue Share'}</Button>
            </div>
          </div>
        )}

        {/* CHAT */}
        {showChat && (
          <div className="mx-auto w-full px-4 py-6">
            {messages.length === 0 && (
              <div className="my-2">
                <div className="flex flex-col items-center gap-2 px-6 py-4 text-center">
                  <h2 className="text-center text-[44px] font-semibold text-[#222] !font-sans">{content?.assistant?.title}</h2>
                  <p className="mt-2 text-center text-[28px] font-normal text-[#5B5B5B]">{content?.assistant?.subtitle}</p>

                  <div className="my-8 grid grid-cols-1 gap-5 sm:grid-cols-2 gap-x-[200px] pt-5">
                    {(content?.assistant?.quickActions || []).map((qa) => {
                      const Icon = qa?.icon && qaIconMap[qa.icon] ? qaIconMap[qa.icon] : null;
                      return (
                        <button
                          key={qa.id}
                          type="button"
                          onClick={() => setInputValue(qa.value || qa.label)}
                          className="inline-flex justify-start min-w-[240px] items-center gap-2 rounded-[5px] px-2.5 py-2 text-[15px] bg-[rgba(233,242,254,0.6)] hover:bg-blue-600 hover:text-white transition-colors"
                          title={qa.label}
                          aria-label={qa.label}
                        >
                          {Icon && <Icon className="h-4 w-4" />}
                          <span className="font-normal">{qa.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <PromptForm
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onSubmit={(e) => { e.preventDefault(); if (!inputValue.trim() || isLoading) return; submitPrompt(inputValue.trim()); setInputValue(''); }}
                    isLoading={isLoading}
                    limit={LIMIT}
                    placeholder={content?.assistant?.inputPlaceholder || "Describe what to share"}
                  />
                </div>
              </div>
            )}

            {messages.length > 0 && (
              <div className="mx-auto max-w-6xl">
                <div className="space-y-5 select-text">
                  {messages.map((m) => {
                    const isUser = m.type === 'user';
                    if (m.type === 'hint') {
                      return (
                        <div key={m.id} className="flex justify-start">
                          <div className="max-w-[680px] w-fit rounded-[3px] border px-4 py-1 shadow-sm text-sm">
                            {String(m.content)}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={m.id} className={`flex items-start ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={[
                            'max-w-[680px] w-fit break-words overflow-hidden',
                            'px-4 py-3 rounded-[3px] shadow-sm',
                            isUser ? 'bg-blue-600 text-white' : 'bg-muted border border-border text-foreground',
                          ].join(' ')}
                        >
                          <BubbleHeader m={m} onDownloadPdf={() => handleDownloadPdf(m.id)} />
                          <div ref={setMessageRef(m.id)}>
                            {m.type === 'bot'
                              ? <div className="prose prose-sm max-w-none font-sans prose-p:my-2 prose-pre:my-3" dangerouslySetInnerHTML={{ __html: renderMarkdownToSafeHtml(m.content) }} />
                              : <div className="whitespace-pre-wrap leading-relaxed">{String(m.content)}</div>
                            }
                          </div>

                          {/* Mini issue table + View more */}
                          {m.type === 'bot' && (
                            (m.meta?.issues?.length || 0) > 0 ? (
                              <div className="mt-3 space-y-2">
                                <IssueTable
                                  issues={(m.meta.issues || []).slice(0, 10)}
                                  onKeyClick={goIssue}
                                />
                                {(m.meta.issues || []).length > 10 && (
                                  <div className="text-right">
                                    <Button size="sm" variant="outline" onClick={() => openIssuesModal(m.meta.issues)}>
                                      View more
                                    </Button>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => openComposerForMessage(m)}
                                    disabled={latestIssuesMessageId !== m.id}
                                    title={latestIssuesMessageId !== m.id ? 'Superseded by a newer result' : undefined}
                                  >
                                    Confirm list
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => { setInputValue(lastPrompt || ''); }}>
                                    Edit prompt
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              // 0 issues → empty state
                              <NoResults
                                jql={m?.meta?.jql || ''}
                                onEdit={() => setInputValue(lastPrompt || '')}
                                suggestions={
                                  content?.chat?.noResultsSuggestions ||
                                  [
                                    'Check project key or assignee name',
                                    'Remove date filters (e.g., updated >= -7d)',
                                    'Try a simpler prompt like: "open bugs in PROJECT"',
                                  ]
                                }
                              />
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Email Composer (opens only after "Confirm list") */}
                  {composerOpen && composerSource?.meta?.jql && (
                    <div className="max-w-6xl">
                      <h3 className="text-lg font-semibold mt-6 mb-2">{content?.email?.composerTitle || 'Send email'}</h3>
                      <div className="grid gap-2 max-w-3xl">
                        <Input
                          value={recipients}
                          onChange={(e) => { setRecipients(e.target.value); if (errors.recipients) setErrors(prev => ({ ...prev, recipients: undefined })); }}
                          placeholder={content?.email?.toPlaceholder || "To (comma or space separated)"}
                        />
                        {errors.recipients && <div className="text-xs text-red-600">{errors.recipients}</div>}

                        <Input
                          value={cc}
                          onChange={(e) => { setCc(e.target.value); if (errors.cc) setErrors(prev => ({ ...prev, cc: undefined })); }}
                          placeholder={content?.email?.ccPlaceholder || "CC (optional)"}
                        />
                        {errors.cc && <div className="text-xs text-red-600">{errors.cc}</div>}

                        <Input
                          value={bcc}
                          onChange={(e) => { setBcc(e.target.value); if (errors.bcc) setErrors(prev => ({ ...prev, bcc: undefined })); }}
                          placeholder={content?.email?.bccPlaceholder || "BCC (optional)"}
                        />
                        {errors.bcc && <div className="text-xs text-red-600">{errors.bcc}</div>}

                        <Input
                          value={subject}
                          onChange={(e) => { setSubject(e.target.value); if (errors.subject) setErrors(prev => ({ ...prev, subject: undefined })); }}
                          placeholder={content?.email?.subjectPlaceholder || "Subject"}
                        />
                        {errors.subject && <div className="text-xs text-red-600">{errors.subject}</div>}

                        {/* PLAIN TEXT MESSAGE BOX */}
                        <label className="text-xs text-slate-600">{content?.email?.messageLabel || 'Message'}</label>
                        <textarea
                          value={introText}
                          onChange={(e) => { setIntroText(e.target.value); if (errors.body) setErrors(prev => ({ ...prev, body: undefined })); }}
                          rows={10}
                          className="w-full rounded-md border px-3 py-2 text-sm"
                          placeholder={content?.email?.messagePlaceholder || "Type your message (plain text). We'll format it nicely in the email."}
                        />
                        {errors.body && <div className="text-xs text-red-600">{errors.body}</div>}

                        {/* Optional lightweight preview */}
                        <details className="mt-1">
                          <summary className="text-xs cursor-pointer text-slate-600 hover:text-slate-800">
                            {content?.email?.previewToggle || 'Preview rendering'}
                          </summary>
                          <div className="mt-2 border rounded">
                            <iframe
                              title="email-preview"
                              sandbox=""
                              style={{ width: '100%', minHeight: 360, border: 0 }}
                              srcDoc={buildEmailHtmlFromText({
                                introText,
                                issues: sortIssuesAscByCreated(composerSource?.meta?.issues || []),
                                senderName: me?.displayName || 'You',
                                content,
                                siteUrl: content?.jira?.siteUrl,
                                dateLocale: (locale || 'en').replace('_', '-')
                              })}
                            />
                          </div>
                        </details>

                        <div className="flex gap-2">
                          <Button onClick={handleSendEmail} disabled={isSendingEmail}>
                            {isSendingEmail ? (
                              <span className="inline-flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                  <circle cx="12" cy="12" r="10" fill="none" strokeWidth="4" stroke="currentColor" opacity="0.2" />
                                  <path d="M4 12a8 8 0 0 1 8-8" fill="none" strokeWidth="4" stroke="currentColor" />
                                </svg>
                                {content?.email?.sendingLabel || 'Sending…'}
                              </span>
                            ) : (content?.email?.sendCta || 'Send Email')}
                          </Button>
                          <Button variant="outline" onClick={() => setComposerOpen(false)} disabled={isSendingEmail}>
                            {content?.email?.hideCta || 'Hide'}
                          </Button>
                        </div>
                        <div className="text-xs text-slate-500">
                          {content?.email?.footerHint || 'Your plain text will be formatted and the selected issues will be included as a table.'}
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="row-start-3">
        <div className={`mx-auto max-w-6xl w-full grid ${(!showChat || messages.length === 0) ? "grid-cols-[1fr_auto]" : "grid-cols-[1fr_auto_1fr]"} items-center gap-2 py-2 px-4`}>
          {/* Left: More apps */}
          <button
            onClick={() => setIsMoreAppsOpen(true)}
            className="pt-1 inline-flex items-center gap-2 text-[16px] font-medium text-[#9E9E9E] hover:text-blue-600 transition-all duration-200 active:scale-95 shadow-none justify-self-start"
            title={content?.moreApps?.title || 'Discover more apps from our company'}
          >
            <Store className="h-4 w-4" />
            {content?.ctas?.moreApps || 'More from Us'}
          </button>

          {/* Center prompt bar (when conversation already started) */}
          {showChat && messages.length !== 0 && (
            <PromptForm
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onSubmit={(e) => { e.preventDefault(); if (!inputValue.trim() || isLoading) return; submitPrompt(inputValue.trim()); setInputValue(''); }}
              isLoading={isLoading}
              limit={LIMIT}
              placeholder={content?.assistant?.inputPlaceholder || "Describe what to share"}
            />
          )}

          {/* Right: Contact */}
          <button
            onClick={() => router.open('https://clovity.com/contact', '_blank', 'noopener,noreferrer')}
            className="pt-1 inline-flex items-center gap-2 text:[16px] font-medium text-[#9E9E9E] hover:text-blue-600 transition-all duration-200 active:scale-95 shadow-none justify-self-end"
            title={content?.ctas?.contactUs || 'Get in touch with us'}
          >
            <UserIcon className="h-4 w-4" />
            {content?.ctas?.contactUs || 'Get in touch'}
          </button>
        </div>
      </footer>

      {/* More Apps Drawer */}
      <Drawer
        isOpen={isMoreAppsOpen}
        onClose={() => setIsMoreAppsOpen(false)}
        title={content?.moreApps?.drawerTitle || "More Apps from Us"}
      >
        <MoreAppsDrawer content={content} />
      </Drawer>

      {/* Issues Modal Drawer */}
      <Drawer
        isOpen={issuesModalOpen}
        onClose={() => setIssuesModalOpen(false)}
        title={content?.issuesModal?.title || "All issues"}
      >
        <div className="space-y-3">
          <Input
            value={issuesSearch}
            onChange={(e) => { setIssuesSearch(e.target.value); setIssuesPage(1); }}
            placeholder={content?.issuesModal?.searchPlaceholder || "Search by key, summary, assignee, reporter, status…"}
          />
          <IssueTable issues={pageSlice} onKeyClick={goIssue} spKey={content?.jira?.storyPointsField || STORY_POINTS_KEY_FALLBACK} />
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              {content?.issuesModal?.pageLabel
                ? content.issuesModal.pageLabel.replace('{page}', String(issuesPage)).replace('{total}', String(totalPages)).replace('{count}', String(filteredIssues.length))
                : `Page ${issuesPage} / ${totalPages} • ${filteredIssues.length} results`}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={issuesPage <= 1} onClick={() => setIssuesPage(p => Math.max(1, p - 1))}>
                {content?.issuesModal?.prev || 'Prev'}
              </Button>
              <Button size="sm" variant="outline" disabled={issuesPage >= totalPages} onClick={() => setIssuesPage(p => Math.min(totalPages, p + 1))}>
                {content?.issuesModal?.next || 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
}