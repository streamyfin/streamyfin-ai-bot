import { Octokit } from "@octokit/rest";

let octokit: Octokit | null = null;

function getOctokit(): Octokit {
  if (!octokit) {
    octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
  }
  return octokit;
}

export interface GitHubFile {
  path: string;
  content: string;
  sha: string;
  size: number;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

const SUPPORTED_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".md",
  ".json",
  ".sql",
  ".yaml",
  ".yml",
];

const IGNORE_PATTERNS = [
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "coverage",
  ".DS_Store",
  "package-lock.json",
  "yarn.lock",
  "bun.lockb",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".svg",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
];

function shouldIgnoreFile(path: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => path.includes(pattern));
}

function isSupportedFile(path: string): boolean {
  return SUPPORTED_EXTENSIONS.some((ext) => path.endsWith(ext));
}

export async function listRepositoryFiles(
  owner: string,
  repo: string,
  branch: string = "develop"
): Promise<GitHubTreeItem[]> {
  const client = getOctokit();

  console.log(`Fetching file tree for ${owner}/${repo}@${branch}...`);

  // Get the commit SHA for the branch
  const { data: ref } = await client.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });

  const commitSha = ref.object.sha;

  // Get the tree recursively
  const { data: tree } = await client.git.getTree({
    owner,
    repo,
    tree_sha: commitSha,
    recursive: "true",
  });

  // Filter to only files we care about
  const files = (tree.tree as GitHubTreeItem[]).filter(
    (item) =>
      item.type === "blob" &&
      isSupportedFile(item.path) &&
      !shouldIgnoreFile(item.path)
  );

  console.log(`Found ${files.length} supported files`);
  return files;
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string = "develop"
): Promise<GitHubFile | null> {
  const client = getOctokit();

  try {
    const { data } = await client.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if ("content" in data && data.type === "file") {
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      return {
        path: data.path,
        content,
        sha: data.sha,
        size: data.size,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching ${path}:`, error);
    return null;
  }
}

export async function getMultipleFiles(
  owner: string,
  repo: string,
  paths: string[],
  branch: string = "develop"
): Promise<GitHubFile[]> {
  const files: GitHubFile[] = [];

  // Process in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((path) => getFileContent(owner, repo, path, branch))
    );

    files.push(...results.filter((f): f is GitHubFile => f !== null));

    // Small delay between batches
    if (i + batchSize < paths.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return files;
}
