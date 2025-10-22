// src/components/ChatInterface.jsx
import { useState, useRef, useEffect, useMemo } from 'react';
import { invoke, view as forgeView, router } from '@forge/bridge';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import html2pdf from 'html2pdf.js';

import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Drawer } from './ui/drawer';
import { MoreAppsDrawer } from './MoreAppsDrawer';

import {
  Bot as BotIcon, User as UserIcon, Download, ArrowLeft,
  Search, Users, Calculator, Activity, Calendar, Store
} from 'lucide-react';

import "../index.css";

/* ---------- Markdown helpers ---------- */
marked.setOptions({ gfm: true, breaks: true });
const safeJson = (v) => { try { return JSON.stringify(v, null, 2); } catch { return String(v); } };
const toMd = (v) => v == null ? "" : (typeof v === "string" ? v : Array.isArray(v) ? v.map(x => typeof x === "string" ? x : safeJson(x)).join("\n") : safeJson(v));
const stripDebugSuffix = (md) => String(md).replace(/\s*⚠️\s*\(\d+\)\s*\[[\s\S]*\]\s*$/m, "").trim();
const renderMarkdownToSafeHtml = (content) => {
  const md = stripDebugSuffix(toMd(content)).replace(/\r\n/g, "\n");
  const html = marked.parse(md);
  return DOMPurify.sanitize(html);
};

/* ---------- Quick Actions icons ---------- */
const qaIconMap = { search: Search, users: Users, calculator: Calculator, activity: Activity, calendar: Calendar };

/* ---------- Small helpers ---------- */
const fmt = (d) => {
  try { return new Date(d).toLocaleString(); } catch { return String(d || ''); }
};
const escapeHtml = (s = '') => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Build a Markdown preview table (for chat) */
function buildIssueTableMarkdown(issues = []) {
  if (!issues?.length) return '';
  const head = `| Key | Summary | Status | Priority | Assignee | Updated |\n|---|---|---|---|---|---|`;
  const rows = issues.slice(0, 10).map(it => {
    const f = it.fields || {};
    const key = it.key || '';
    const summary = (f.summary || '').replace(/\|/g, '\\|');
    const status = f.status?.name || '';
    const priority = f.priority?.name || '';
    const assignee = f.assignee?.displayName || '';
    const updated = fmt(f.updated);
    return `| ${key} | ${summary} | ${status} | ${priority} | ${assignee} | ${updated} |`;
  });
  const more = issues.length > 10 ? `\n\n> …and **${issues.length - 10}** more.` : '';
  return `\n\n**Preview (first ${Math.min(issues.length, 10)}):**\n\n${head}\n${rows.join('\n')}${more}`;
}

/** Build the HTML email body (professional + clean, NO raw JQL/JSON) */
function buildEmailHtml({ title, subtitle, issues = [], footerNote }) {
  const rows = issues.map(it => {
    const f = it.fields || {};
    return `
      <tr>
        <td>${escapeHtml(it.key || '')}</td>
        <td>${escapeHtml(f.summary || '')}</td>
        <td>${escapeHtml(f.status?.name || '')}</td>
        <td>${escapeHtml(f.priority?.name || '')}</td>
        <td>${escapeHtml(f.assignee?.displayName || '')}</td>
        <td>${escapeHtml(f.duedate || '')}</td>
        <td>${escapeHtml(fmt(f.updated))}</td>
      </tr>`;
  }).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width"/>
  <title>${escapeHtml(title || 'Jira Issues')}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background: #f6f8fa; margin: 0; padding: 24px; color: #0f172a; }
    .container { max-width: 880px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
    .header { padding: 20px 24px; background: #0b5cff; color: #fff; }
    .header h1 { margin: 0 0 4px 0; font-size: 20px; }
    .header p { margin: 0; opacity: 0.95; font-size: 13px; }
    .content { padding: 20px 24px; }
    .kpis { display: flex; gap: 12px; flex-wrap: wrap; margin: 0 0 12px 0; }
    .chip { background: #f1f5ff; border: 1px solid #e5edff; padding: 6px 10px; border-radius: 999px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #eef2f7; vertical-align: top; }
    th { background: #f8fafc; font-weight: 600; border-top: 1px solid #eef2f7; }
    tr:nth-child(even) td { background: #fbfdff; }
    .footer { padding: 16px 24px; color: #64748b; font-size: 12px; border-top: 1px solid #eef2f7; background: #fafbfc; }
    a { color: #0b5cff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(title || 'Shared Jira Issues')}</h1>
      <p>${escapeHtml(subtitle || '')}</p>
    </div>
    <div class="content">
      <div class="kpis">
        <span class="chip">Total: ${issues.length}</span>
        <span class="chip">Generated: ${escapeHtml(fmt(new Date().toISOString()))}</span>
      </div>
      <table role="table" aria-label="Issues">
        <thead>
          <tr>
            <th>Key</th>
            <th>Summary</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Assignee</th>
            <th>Due</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="footer">
      ${escapeHtml(footerNote || 'This email was generated by AI Issue Share.')}
    </div>
  </div>
</body>
</html>`;
}

export default function ChatInterface({
  showChat,
  onBack,
  onOpenChat,
  content,
  locale
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [lastPrompt, setLastPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cloudId, setCloudId] = useState(null);
  const [isMoreAppsOpen, setIsMoreAppsOpen] = useState(false);

  // email composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState(''); // HTML
  const [currentUserName, setCurrentUserName] = useState('You');

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
        if (ctx?.cloudId) setCloudId(ctx.cloudId);
        // try backend whoami for displayName
        const me = await invoke('whoami');
        if (me?.success && me?.data?.displayName) {
          setCurrentUserName(me.data.displayName);
        }
        console.info('[AI Issue Share][UI] Context loaded:', { cloudId: ctx?.cloudId, locale: ctx?.locale });
      } catch (e) {
        console.error('[AI Issue Share][UI] load context/whoami failed:', e);
      }
    })();
  }, []);

  const lastBot = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.type === 'bot' && messages[i]?.meta?.jql) return messages[i];
    }
    return null;
  }, [messages]);

  const handleInputChange = (e) => setInputValue(e.target.value.slice(0, LIMIT));

  const submitPrompt = async (userText) => {
    const timeString = new Date().toLocaleTimeString((locale || 'en').split('_')[0] || 'en');
    setLastPrompt(userText);

    // push user msg
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', content: userText, timestamp: timeString }]);

    setIsLoading(true);
    let loadingMsgTimer = setTimeout(() => {
      const msg = waitingMessages[Math.floor(Math.random() * waitingMessages.length)];
      setMessages(prev => [...prev, { id: Date.now() + 1, type: 'hint', content: msg }]);
    }, 7000);

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
      const counts = Array.isArray(data?.issues) ? data.issues.length : 0;

      // Compose bot message with issue preview table + Confirm/Edit
      const previewTableMd = buildIssueTableMarkdown(data?.issues || []);
      const jqlBlock = data?.jql ? `\n\n**JQL Parsed**\n\`\`\`jql\n${data.jql}\n\`\`\`` : '';
      const stats = counts ? `\n\n**Issues matched:** ${counts}` : '';
      const botMd = `${answer}${jqlBlock}${stats}${previewTableMd}`;

      console.info('[AI Issue Share][UI] parsed payload:', {
        hasJql: !!data?.jql,
        issuesCount: counts,
        recipients: data?.recipients
      });

      setMessages(prev => [
        ...prev.filter(m => m.type !== 'hint'),
        {
          id: Date.now() + 2,
          type: 'bot',
          content: botMd,
          followups,
          meta: { // used by Confirm step
            jql: data?.jql || null,
            recipients: data?.recipients || [],
            fields: data?.fields || [],
            issues: data?.issues || [],
            suggestConfirm: true
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

  /** Confirm issues → open composer with HTML template (subject/body prefilled) */
  const handleConfirmIssues = () => {
    if (!lastBot?.meta?.issues?.length) return;
    const issues = lastBot.meta.issues;

    // Subject: Issues - [ <keys> ] by currentUser
    const keys = issues.map(i => i?.key).filter(Boolean);
    const keysStr = keys.length <= 8 ? keys.join(', ') : `${keys.slice(0, 8).join(', ')}, +${keys.length - 8} more`;
    const subj = `Issues - [ ${keysStr} ] by ${currentUserName}`;

    const html = buildEmailHtml({
      title: 'Issue list for your review',
      subtitle: `Shared by ${currentUserName}`,
      issues,
      footerNote: 'Please reply to this email for any clarification.'
    });

    setSubject(subj);
    setBody(html);
    setComposerOpen(true);
  };

  /** Edit prompt → put last prompt back in the input */
  const handleEditPrompt = () => {
    if (lastPrompt) setInputValue(lastPrompt);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
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

  // SEND EMAIL with HTML body
  const handleSendEmail = async () => {
    if (!lastBot?.meta?.jql) {
      console.warn('[AI Issue Share][UI] No JQL to send; aborting.');
      return;
    }
    const recips = recipients.split(/[,\s;]+/).map(x => x.trim()).filter(Boolean);
    if (recips.length === 0) {
      alert('Please enter at least one recipient email.');
      return;
    }
    const timeString = new Date().toLocaleTimeString((locale || 'en').split('_')[0] || 'en');
    try {
      const ctx = await forgeView.getContext();
      const currentLocale = ctx?.locale || locale || 'en_US';
      const userId = ctx?.accountId;

      const payload = {
        orgId: cloudId,
        userId,
        locale: currentLocale,
        jql: lastBot.meta.jql,
        issues: lastBot.meta.issues,
        recipients: recips,
        subject: subject || `Issues - [ ${lastBot.meta.issues.map(i => i?.key).filter(Boolean).join(', ')} ] by ${currentUserName}`,
        body // HTML
      };

      console.info('[AI Issue Share][UI] sending email with payload:', {
        recipients: recips,
        subjectPreview: String(payload.subject).slice(0, 140),
        jqlPreview: String(payload.jql).slice(0, 160),
        count: Array.isArray(payload.issues) ? payload.issues.length : 0
      });

      const res = await invoke('send-issue-share', payload);
      console.info('[AI Issue Share][UI] send-issue-share response:', res);

      const ok = !!res?.success;
      const msg = ok ? '✅ Email request accepted by backend.' : `❌ Email send failed: ${res?.error || 'Unknown error'}`;
      setMessages(prev => [...prev, { id: Date.now() + 4, type: ok ? 'bot' : 'error', content: msg, timestamp: timeString }]);
    } catch (e) {
      console.error('[AI Issue Share][UI] send-issue-share error:', e);
      setMessages(prev => [...prev, { id: Date.now() + 5, type: 'error', content: 'Email send failed. Check console logs.', timestamp: timeString }]);
    }
  };

  /* ----------------- UI ----------------- */
  return (
    <div className="grid grid-rows-[40px_1fr_auto] h-[98dvh]">
      {/* HEADER */}
      <header className="row-start-1 bg-white">
        {showChat ? (
          <div className="mx-auto flex h-[40px] border-b border-[#222] w-full items-center justify-between px-4">
            <ArrowLeft onClick={onBack} className="h-5 w-5 cursor-pointer text-slate-700 hover:text-blue-600 transition-colors" aria-label="Back" title="Back" />
          </div>
        ) : <div className="h-[40px]" />}
      </header>

      {/* MAIN */}
      <main className={`row-start-2 ${showChat && messages.length !== 0 ? "overflow-y-auto no-scrollbar" : "grid place-items-center"}`}>
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

        {showChat && (
          <div className="mx-auto w-full px-4 py-6">
            {/* First screen in chat */}
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
                    onChange={handleInputChange}
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    limit={LIMIT}
                    placeholder={content?.assistant?.inputPlaceholder || "Describe what to share"}
                  />
                </div>
              </div>
            )}

            {/* Conversation */}
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
                              ? <div className="prose prose-sm max-w-none font-sans prose-p:my-2 prose-pre:my-3"
                                dangerouslySetInnerHTML={{ __html: renderMarkdownToSafeHtml(m.content) }} />
                              : <div className="whitespace-pre-wrap leading-relaxed">{String(m.content)}</div>
                            }
                          </div>

                          {/* Confirm / Edit actions appear when we have issues */}
                          {m.type === 'bot' && m.meta?.suggestConfirm && Array.isArray(m.meta?.issues) && m.meta.issues.length > 0 && (
                            <div className="mt-3 flex gap-2">
                              <Button onClick={handleConfirmIssues}>Confirm List</Button>
                              <Button variant="outline" onClick={handleEditPrompt}>Edit Prompt</Button>
                            </div>
                          )}

                          {/* Followups (optional) */}
                          {m.followups?.length > 0 && (
                            <div className="mt-3">
                              <div className="mb-2 text-xs font-medium text-blue-600">
                                {content?.chat?.suggestionsTitle}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {m.followups.map((f, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setInputValue(f?.question || '')}
                                    className="rounded-md border !text-left border-border p-2 text-xs hover:text-white hover:bg-blue-600 transition-colors"
                                  >
                                    {f?.question || 'Ask more'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Email Composer (HTML) */}
                  {composerOpen && lastBot?.meta?.jql && (
                    <div className="max-w-6xl">
                      <h3 className="text-lg font-semibold mt-6 mb-2">Send email</h3>
                      <div className="grid gap-2 max-w-3xl">
                        <Input
                          value={recipients}
                          onChange={(e) => setRecipients(e.target.value)}
                          placeholder="Recipients (comma or space separated)"
                        />
                        <Input
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder='Subject (e.g., "Issues - [ BC-78, BC-77 ] by Alice Doe")'
                        />
                        <label className="text-xs text-slate-500">Email HTML</label>
                        <textarea
                          value={body}
                          onChange={(e) => setBody(e.target.value)}
                          rows={16}
                          className="w-full rounded-md border px-3 py-2 font-mono text-xs"
                          placeholder="HTML body"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleSendEmail}>Send Email</Button>
                          <Button variant="outline" onClick={() => setComposerOpen(false)}>Hide</Button>
                        </div>
                        <div className="text-xs text-slate-500">
                          The email body is sent as <strong>HTML</strong>. JQL / raw JSON is not included.
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
          <button
            onClick={() => setIsMoreAppsOpen(true)}
            className="pt-1 inline-flex items-center gap-2 text-[16px] font-medium text-[#9E9E9E] hover:text-blue-600 transition-all duration-200 active:scale-95 shadow-none justify-self-start"
            title={content?.moreApps?.title || 'Discover more apps from our company'}
          >
            <Store className="h-4 w-4" />
            {content?.ctas?.moreApps || 'More from Us'}
          </button>

          {showChat && messages.length !== 0 && (
            <PromptForm
              value={inputValue}
              onChange={handleInputChange}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              limit={LIMIT}
              placeholder={content?.assistant?.inputPlaceholder || "Describe what to share"}
            />
          )}

          <button
            onClick={() => router.open('https://clovity.com/contact', '_blank', 'noopener,noreferrer')}
            className="pt-1 inline-flex items-center gap-2 text-[16px] font-medium text-[#9E9E9E] hover:text-blue-600 transition-all duration-200 active:scale-95 shadow-none justify-self-end"
            title={content?.ctas?.contactUs || 'Get in touch with us'}
          >
            <UserIcon className="h-4 w-4" />
            {content?.ctas?.contactUs || 'Get in touch'}
          </button>
        </div>
      </footer>

      <Drawer
        isOpen={isMoreAppsOpen}
        onClose={() => setIsMoreAppsOpen(false)}
        title={content?.moreApps?.drawerTitle || "More Apps from Us"}
      >
        <MoreAppsDrawer content={content} />
      </Drawer>
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
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12.25 18.5V6M12.25 6L18.25 12M12.25 6L6.25 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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
