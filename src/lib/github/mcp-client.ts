import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

let mcpClient: Client | null = null;

export async function getMCPClient(): Promise<Client> {
  if (!mcpClient) {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN is not set. GitHub MCP features will be disabled.');
    }

    const transport = new StdioClientTransport({
      command: 'npx',
      args: [
        '-y',
        '@modelcontextprotocol/server-github',
      ],
      env: {
        ...process.env,
        GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN,
      },
    });

    mcpClient = new Client({
      name: 'streamyfin-ai-bot',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    await mcpClient.connect(transport);
    console.log('✓ GitHub MCP client connected');
  }

  return mcpClient;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  body?: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  body?: string;
  merged_at?: string;
}

export async function listIssues(
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'open'
): Promise<GitHubIssue[]> {
  const client = await getMCPClient();
  
  try {
    const result = await client.callTool({
      name: 'list_issues',
      arguments: {
        owner,
        repo,
        state,
      },
    });

    return JSON.parse(result.content[0].text);
  } catch (error) {
    console.error('Error listing issues:', error);
    return [];
  }
}

export async function getIssue(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubIssue | null> {
  const client = await getMCPClient();
  
  try {
    const result = await client.callTool({
      name: 'get_issue',
      arguments: {
        owner,
        repo,
        issue_number: issueNumber,
      },
    });

    return JSON.parse(result.content[0].text);
  } catch (error) {
    console.error('Error getting issue:', error);
    return null;
  }
}

export async function listPullRequests(
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'open'
): Promise<GitHubPullRequest[]> {
  const client = await getMCPClient();
  
  try {
    const result = await client.callTool({
      name: 'list_pull_requests',
      arguments: {
        owner,
        repo,
        state,
      },
    });

    return JSON.parse(result.content[0].text);
  } catch (error) {
    console.error('Error listing pull requests:', error);
    return [];
  }
}

export async function getPullRequest(
  owner: string,
  repo: string,
  prNumber: number
): Promise<GitHubPullRequest | null> {
  const client = await getMCPClient();
  
  try {
    const result = await client.callTool({
      name: 'get_pull_request',
      arguments: {
        owner,
        repo,
        pull_number: prNumber,
      },
    });

    return JSON.parse(result.content[0].text);
  } catch (error) {
    console.error('Error getting pull request:', error);
    return null;
  }
}

export async function closeMCPClient(): Promise<void> {
  if (mcpClient) {
    await mcpClient.close();
    mcpClient = null;
  }
}

