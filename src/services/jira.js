// src/services/jira.js
import api, { route } from '@forge/api';
import { logger } from '../utils/logger.js';

export async function fetchIssuesByJql(jql, fields = []) {
  const maxResults = 100;
  let issues = [];
  let nextPageToken;

  logger.info('jira:search:start', { jqlPreview: String(jql).slice(0, 200), fields });
  console.info('[AI Issue Share][Jira] search start', { fields, jql });

  while (true) {
    const body = { jql, fields, maxResults, ...(nextPageToken ? { nextPageToken } : {}) };
    const res = await api.asUser().requestJira(route`/rest/api/3/search/jql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('[AI Issue Share][Jira] search error', res.status, txt);
      throw new Error(`JQL search failed: ${res.status} ${txt}`);
    }

    const data = await res.json();
    const page = data.issues || [];
    issues = issues.concat(page);

    if (data.isLast || !data.nextPageToken) break;
    nextPageToken = data.nextPageToken;
  }

  const sampleKeys = issues.slice(0, 3).map(i => i?.key).filter(Boolean);
  logger.info('jira:search:done', { count: issues.length, sampleKeys });
  console.info('[AI Issue Share][Jira] search done', { count: issues.length, sampleKeys });
  return issues;
}

export async function fetchCurrentUser() {
  try {
    const res = await api.asUser().requestJira(route`/rest/api/3/myself`);
    if (!res.ok) {
      const txt = await res.text();
      console.error('[AI Issue Share][Jira] myself error', res.status, txt);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error('[AI Issue Share][Jira] myself exception', e?.message || e);
    return null;
  }
}
