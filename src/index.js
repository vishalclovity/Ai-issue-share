import Resolver from '@forge/resolver';
import { logger } from './utils/logger.js';
import { fetchIssuesByJql, fetchCurrentUser } from './services/jira.js';
import { parsePromptWithRag, sendIssueShareEmail } from './services/rag.js';

const resolver = new Resolver();

/**
 * Prompt → OpenAI (event=jqlgeneration) → JQL → Jira issues → UI
 */
resolver.define('query-issue-share', async ({ payload }) => {
  const { prompt, orgId, locale, userId } = payload || {};
  if (!prompt) return { success: false, error: 'prompt is required' };

  const jqlMatch = /^jql\s*:\s*(.+)$/is.exec(prompt?.trim() || '');
  const isDryRun = !!jqlMatch;

  logger.info('query-issue-share:received', {
    orgId, userId, locale, isDryRun, promptPreview: String(prompt).slice(0, 140)
  });
  console.info('[AI Issue Share] resolver: query-issue-share', { isDryRun, orgId, locale });

  try {
    let jql, parsed = {}, answer = '', followups = [];

    if (isDryRun) {
      jql = jqlMatch[1].trim();
      answer = 'Running developer JQL override.';
      followups = [{ question: 'Confirm this list or edit the prompt?' }];
      console.info('[AI Issue Share] using JQL (dry-run):', jql);
    } else {
      parsed = await parsePromptWithRag({ prompt, orgId, locale, userId });
      jql = parsed?.answer || null;
      answer = parsed?.answer || '';
      followups = Array.isArray(parsed?.followups) ? parsed.followups : [{ question: 'Confirm this list or edit the prompt?' }];
      console.info('[AI Issue Share] RAG parse → hasJql?', !!jql, parsed);
    }

    if (!jql) {
      console.warn('[AI Issue Share] no JQL returned; sending guidance to UI');
      return {
        success: true,
        data: {
          jql: null,
          fields: [],
          issues: [],
          recipients: parsed?.recipients || [],
          answer: answer || 'I could not produce a JQL for that prompt.',
          followups
        }
      };
    }

    // richer default fields
    const baseFields = [
      'summary','status','priority','labels','issuetype','assignee',
      'reporter','project','created','updated','duedate','fixVersions',
      'components','description'
    ];
    const ragFields = Array.isArray(parsed?.fields) ? parsed.fields : [];
    const fields = Array.from(new Set([...baseFields, ...ragFields]));

    console.info('[AI Issue Share] fetching Jira issues with fields:', fields);
    const issues = await fetchIssuesByJql(jql, fields);
    console.info('[AI Issue Share] Jira issues fetched:', { count: issues?.length || 0 });

    return {
      success: true,
      data: {
        jql,
        fields,
        issues,
        recipients: parsed?.recipients || [],
        answer: answer || 'Here are the results. Please confirm the list or edit your prompt.',
        followups
      }
    };
  } catch (error) {
    logger.error('query-issue-share failed', { error: error?.message || String(error) });
    console.error('[AI Issue Share] resolver error:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
});

/** Minimal mailer handoff — subject/body are HTML-ready */
resolver.define('send-issue-share', async ({ payload }) => {
  const { orgId, userId, locale, jql, issues, recipients, cc, bcc, subject, body, sender } = payload || {};
  console.info('[AI Issue Share] send-issue-share called', {
    orgId,
    recipientsCount: Array.isArray(recipients) ? recipients.length : 0,
    issuesCount: Array.isArray(issues) ? issues.length : 0,
    hasSubject: !!subject,
    hasBody: !!body,
    hasSender: !!sender
  });

  if (!jql || !Array.isArray(recipients) || recipients.length === 0) {
    return { success: false, error: 'jql and recipients are required' };
  }
  try {
    const result = await sendIssueShareEmail({
      orgId, userId, locale, jql, issues, recipients, cc, bcc, subject, body, sender
    });
    console.info('[AI Issue Share] send-issue-share success:', result);
    return { success: true, data: result };
  } catch (error) {
    logger.error('send-issue-share failed', { error: error?.message || String(error) });
    console.error('[AI Issue Share] send error:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
});

/** Who am I (for “by currentUser” subject prefill) */
resolver.define('whoami', async () => {
  const me = await fetchCurrentUser();
  if (!me) return { success: false };
  return {
    success: true,
    data: {
      accountId: me.accountId,
      displayName: me.displayName || 'You',
      emailAddress: me.emailAddress || null
    }
  };
});

export const handler = resolver.getDefinitions();
