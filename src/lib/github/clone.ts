import { exec } from "child_process";
import { promisify } from "util";
import { existsSync, rmSync } from "fs";
import { join } from "path";

const execAsync = promisify(exec);

export interface CloneOptions {
  owner: string;
  repo: string;
  branch?: string;
  targetPath: string;
}

export async function cloneRepository(options: CloneOptions): Promise<string> {
  const { owner, repo, branch = "main", targetPath } = options;
  const repoUrl = `https://github.com/${owner}/${repo}.git`;
  const fullPath = join(targetPath, repo);

  console.log(`Cloning ${owner}/${repo}...`);

  // Remove existing directory if it exists
  if (existsSync(fullPath)) {
    console.log(`Removing existing directory: ${fullPath}`);
    rmSync(fullPath, { recursive: true, force: true });
  }

  try {
    // Clone the repository
    const cloneCmd = `git clone --depth 1 --branch ${branch} ${repoUrl} ${fullPath}`;
    await execAsync(cloneCmd);

    console.log(`✓ Successfully cloned ${owner}/${repo}`);
    return fullPath;
  } catch (error) {
    console.error(`Failed to clone ${owner}/${repo}:`, error);
    throw new Error(`Failed to clone repository: ${error}`);
  }
}

export async function updateRepository(repoPath: string): Promise<void> {
  console.log(`Updating repository at: ${repoPath}`);

  try {
    await execAsync("git pull", { cwd: repoPath });
    console.log(`✓ Successfully updated repository`);
  } catch (error) {
    console.error("Failed to update repository:", error);
    throw new Error(`Failed to update repository: ${error}`);
  }
}


