import { tool } from 'ai';
import { z } from 'zod';
import { searchEmbeddings, searchByFilePath } from '../embeddings/search';
import {
  listIssues,
  getIssue,
  listPullRequests,
  getPullRequest,
} from '../github/mcp-client';

export const searchCodebaseTool = tool({
  description: 'Search the codebase for relevant code snippets using semantic search. Use this to find code related to a specific topic or functionality.',
  parameters: z.object({
    query: z.string().describe('The search query describing what code to find'),
    limit: z.number().optional().describe('Maximum number of results to return (default: 5)'),
  }),
  execute: async ({ query, limit = 5 }) => {
    const results = await searchEmbeddings(query, limit);
    return {
      results: results.map(r => ({
        filePath: r.filePath,
        content: r.content,
        similarity: r.similarity,
        lines: `${r.metadata.startLine}-${r.metadata.endLine}`,
        language: r.metadata.language,
      })),
    };
  },
});

export const getFileContentTool = tool({
  description: 'Get content from a specific file in the codebase by file path.',
  parameters: z.object({
    filePath: z.string().describe('The file path to retrieve'),
    limit: z.number().optional().describe('Maximum number of chunks to return (default: 10)'),
  }),
  execute: async ({ filePath, limit = 10 }) => {
    const results = await searchByFilePath(filePath, limit);
    return {
      results: results.map(r => ({
        filePath: r.filePath,
        content: r.content,
        lines: `${r.metadata.startLine}-${r.metadata.endLine}`,
        language: r.metadata.language,
      })),
    };
  },
});

export const listGitHubIssuesTool = tool({
  description: 'List GitHub issues for the repository. Use this to find open or closed issues.',
  parameters: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    state: z.enum(['open', 'closed', 'all']).optional().describe('Issue state (default: open)'),
  }),
  execute: async ({ owner, repo, state = 'open' }) => {
    const issues = await listIssues(owner, repo, state);
    return {
      issues: issues.slice(0, 10).map(i => ({
        number: i.number,
        title: i.title,
        state: i.state,
        url: i.html_url,
        created: i.created_at,
        updated: i.updated_at,
      })),
    };
  },
});

export const getGitHubIssueTool = tool({
  description: 'Get details about a specific GitHub issue by its number.',
  parameters: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    issueNumber: z.number().describe('Issue number'),
  }),
  execute: async ({ owner, repo, issueNumber }) => {
    const issue = await getIssue(owner, repo, issueNumber);
    if (!issue) {
      return { error: 'Issue not found' };
    }
    return {
      number: issue.number,
      title: issue.title,
      state: issue.state,
      url: issue.html_url,
      body: issue.body,
      created: issue.created_at,
      updated: issue.updated_at,
    };
  },
});

export const listGitHubPullRequestsTool = tool({
  description: 'List GitHub pull requests for the repository.',
  parameters: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    state: z.enum(['open', 'closed', 'all']).optional().describe('PR state (default: open)'),
  }),
  execute: async ({ owner, repo, state = 'open' }) => {
    const prs = await listPullRequests(owner, repo, state);
    return {
      pullRequests: prs.slice(0, 10).map(pr => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        url: pr.html_url,
        created: pr.created_at,
        updated: pr.updated_at,
        merged: pr.merged_at,
      })),
    };
  },
});

export const getGitHubPullRequestTool = tool({
  description: 'Get details about a specific GitHub pull request by its number.',
  parameters: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    prNumber: z.number().describe('Pull request number'),
  }),
  execute: async ({ owner, repo, prNumber }) => {
    const pr = await getPullRequest(owner, repo, prNumber);
    if (!pr) {
      return { error: 'Pull request not found' };
    }
    return {
      number: pr.number,
      title: pr.title,
      state: pr.state,
      url: pr.html_url,
      body: pr.body,
      created: pr.created_at,
      updated: pr.updated_at,
      merged: pr.merged_at,
    };
  },
});

export const allTools = {
  search_codebase: searchCodebaseTool,
  get_file_content: getFileContentTool,
  list_github_issues: listGitHubIssuesTool,
  get_github_issue: getGitHubIssueTool,
  list_github_pull_requests: listGitHubPullRequestsTool,
  get_github_pull_request: getGitHubPullRequestTool,
};

