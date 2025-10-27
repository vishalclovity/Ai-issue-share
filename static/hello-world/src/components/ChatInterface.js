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
  Bot as BotIcon, User as UserIcon, Download, ArrowLeft,
  Search, Users, Calculator, Activity, Calendar, Store
} from 'lucide-react';

import "../index.css";

/* ---------- Markdown helpers ---------- */
marked.setOptions({ gfm: true, breaks: true });
function safeJson(v) { try { return JSON.stringify(v, null, 2); } catch { return String(v); } }
function toMd(v) { if (v == null) return ""; if (typeof v === "string") return v; if (Array.isArray(v)) return v.map(x => typeof x === "string" ? x : safeJson(x)).join("\n"); return safeJson(v); }
function stripDebugSuffix(md) { return String(md).replace(/\s*⚠️\s*\(\d+\)\s*\[[\s\S]*\]\s*$/m, "").trim(); }
function renderMarkdownToSafeHtml(content) { const md = stripDebugSuffix(toMd(content)).replace(/\r\n/g, "\n"); const html = marked.parse(md); return DOMPurify.sanitize(html); }

/* ---------- Quick Actions icons ---------- */
const qaIconMap = { search: Search, users: Users, calculator: Calculator, activity: Activity, calendar: Calendar };

/* ---------- Email HTML template ---------- */
function buildEmailHtml(issues = [], senderName = 'You') {
  const rows = (issues || []).map((i) => {
    const k   = i?.key || '';
    const f   = i?.fields || {};
    const sum = (f?.summary || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const st  = f?.status?.name || '';
    const pr  = f?.priority?.name || '';
    const asg = f?.assignee?.displayName || '—';
    const upd = f?.updated ? new Date(f.updated).toLocaleString() : '—';
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-weight:600">${k}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7">${sum}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7">${st}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7">${pr}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7">${asg}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7">${upd}</td>
      </tr>
    `;
  }).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Issues</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="720" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#0f172a;color:#fff;padding:18px 24px;font-size:18px;font-weight:600;">
              Issue Share – Summary
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;color:#0f172a;font-size:14px;line-height:1.6">
              <p style="margin:0 0 12px 0;">Hello,</p>
              <p style="margin:0 0 12px 0;">
                Please find the requested issues below. You can reply to this email for any changes or clarifications.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 16px 24px">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background:#f1f5f9;text-align:left;">
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">Key</th>
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">Summary</th>
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">Status</th>
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">Priority</th>
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">Assignee</th>
                    <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows || `<tr><td colspan="6" style="padding:12px;color:#64748b;">No issues selected.</td></tr>`}
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;color:#475569;font-size:12px;border-top:1px solid #e2e8f0">
              <p style="margin:0 0 6px 0;">Regards,</p>
              <p style="margin:0 0 0 0;"><strong>${senderName}</strong></p>
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
  const [body, setBody] = useState('');

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

  const lastBot = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.type === 'bot' && messages[i]?.meta?.jql) return messages[i];
    }
    return null;
  }, [messages]);

  const handleInputChange = (e) => setInputValue(e.target.value.slice(0, LIMIT));

  const openComposerFromLastBot = () => {
    if (!lastBot?.meta?.jql) return;
    const keys = (lastBot.meta.issues || []).map(i => i?.key).filter(Boolean);
    const who  = me?.displayName || 'You';
    const subj = `Issues - [ ${keys.join(', ')} ] by ${who}`;
    const html = buildEmailHtml(lastBot.meta.issues || [], who);
    setSubject(subj);
    setBody(html);
    setComposerOpen(true);
    console.info('[AI Issue Share][UI] Composer opened with subject & HTML body.');
  };

  const submitPrompt = async (userText) => {
    setLastPrompt(userText);
    const timeString = new Date().toLocaleTimeString((locale || 'en').split('_')[0] || 'en');

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
      const jqlBlock = data?.jql ? `\n\n**JQL Parsed:**\n\n\`\`\`jql\n${data.jql}\n\`\`\`` : '';
      const counts = Array.isArray(data?.issues) ? data.issues.length : 0;
      const stats = counts ? `\n\n**Issues matched:** ${counts}` : '';
      const keys = (data?.issues || []).map(i => i?.key).filter(Boolean).slice(0, 10);
      const preview = keys.length ? `\n\n**Preview:** ${keys.join(', ')}${keys.length < counts ? '…' : ''}` : '';

      const botMd = `${answer}${jqlBlock}${stats}${preview}`;

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

  // SEND EMAIL via backend -> RAG email API
  const handleSendEmail = async () => {
    if (!lastBot?.meta?.jql) {
      console.warn('[AI Issue Share][UI] No JQL to send; aborting.');
      return;
    }
    const recips = recipients.split(/[,\s;]+/).map(x => x.trim()).filter(Boolean);
    const ccList   = cc.split(/[,\s;]+/).map(x => x.trim()).filter(Boolean);    
    const bccList  = bcc.split(/[,\s;]+/).map(x => x.trim()).filter(Boolean); 
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
        recipients: recips,          // backend will map first→to, rest→cc
        cc: ccList,       
        bcc: bccList, 
        subject: subject || '',
        body: body || '',            // HTML body
        sender: me?.displayName || 'You'
      };

      console.info('[AI Issue Share][UI] sending email with payload:', {
        recipients: recips,
        subjectPreview: String(payload.subject).slice(0, 140),
        count: Array.isArray(payload.issues) ? payload.issues.length : 0
      });

      const res = await invoke('send-issue-share', payload);
      console.info('[AI Issue Share][UI] send-issue-share response:', res);

      const ok = !!res?.success;
      const msg = ok ? '✅ Email request accepted.' : `❌ Email send failed: ${res?.error || 'Unknown error'}`;
      setMessages(prev => [...prev, { id: Date.now() + 4, type: ok ? 'bot' : 'error', content: msg, timestamp: timeString }]);
      setComposerOpen(false);
    } catch (e) {
      console.error('[AI Issue Share][UI] send-issue-share error:', e);
      setMessages(prev => [...prev, { id: Date.now() + 5, type: 'error', content: 'Email send failed. Check console logs.', timestamp: timeString }]);
    }
  };

  /* ----------------- UI ----------------- */
  return (
    <div className="grid grid-rows-[40px_1fr_auto] h-[98dvh]">
      {/* HEADER */}
      {/* <header className="row-start-1 bg-white">
        {showChat ? (
          <div className="mx-auto flex h-[40px] border-b border-[#222] w-full items-center justify-between px-4">
            <ArrowLeft
              onClick={onBack}
              className="h-5 w-5 cursor-pointer text-slate-700 hover:text-blue-600 transition-colors"
              aria-label="Back"
              title="Back"
            />
          </div>
        ) : <div className="h-[40px]" />}
      </header> */}

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
                    onChange={handleInputChange}
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

                          {/* Confirm / Edit controls for bot messages that contain issues */}
                          {m.type === 'bot' && (m.meta?.issues?.length || 0) > 0 && (
                            <div className="mt-3 flex gap-2">
                              <Button size="sm" onClick={openComposerFromLastBot}>Confirm list</Button>
                              <Button size="sm" variant="outline" onClick={() => { setInputValue(lastPrompt || ''); }}>
                                Edit prompt
                              </Button>
                            </div>
                          )}

                          {/* {m.followups?.length > 0 && (
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
                          )} */}
                        </div>
                      </div>
                    );
                  })}

                  {/* Email Composer (opens only after "Confirm list") */}
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
                          value={cc}
                          onChange={(e) => setCc(e.target.value)}
                          placeholder="CC (comma or space separated)"
                        />
                        <Input
                          value={bcc}
                          onChange={(e) => setBcc(e.target.value)}
                          placeholder="BCC (comma or space separated)"
                        />
                        <Input
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="Subject"
                        />
                        {/* <textarea
                          value={body}
                          onChange={(e) => setBody(e.target.value)}
                          rows={14}
                          className="w-full rounded-md border px-3 py-2 font-mono text-xs"
                          placeholder="Email HTML body"
                        /> */}
                        <div
                          className="w-full rounded-md border px-3 py-2 min-h-[360px] bg-white overflow-auto"
                          contentEditable
                          suppressContentEditableWarning
                          // Render sanitized HTML so tags are not visible:
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body || '') }}
                          // Capture edits as HTML:
                          onInput={(e) => setBody(e.currentTarget.innerHTML)}
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleSendEmail}>Send Email</Button>
                          <Button variant="outline" onClick={() => setComposerOpen(false)}>Hide</Button>
                        </div>
                        <div className="text-xs text-slate-500">
                          The email body is HTML. The table of issues will be sent as part of this template.
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
              onChange={handleInputChange}
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
