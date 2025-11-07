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

export async function generateMetadataDocument(
  owner: string,
  repo: string
): Promise<string> {
  const client = getOctokit();

  console.log(`Fetching repository metadata for ${owner}/${repo}...`);

  // Fetch repository info
  const { data: repoData } = await client.repos.get({ owner, repo });

  // Fetch contributors
  const { data: contributors } = await client.repos.listContributors({
    owner,
    repo,
    per_page: 100,
  });

  console.log(`Found ${contributors.length} contributors`);

  // Create searchable metadata document
  const metadataDoc = `# Repository Metadata for ${owner}/${repo}

## Repository Information
- Owner: ${owner}
- Repository: ${repo}
- Full Name: ${repoData.full_name}
- Description: ${repoData.description || "No description"}
- Homepage: ${repoData.homepage || "None"}
- Created: ${repoData.created_at}
- Last Updated: ${repoData.updated_at}
- Primary Language: ${repoData.language}
- Stars: ${repoData.stargazers_count}
- Forks: ${repoData.forks_count}
- Open Issues: ${repoData.open_issues_count}
- License: ${repoData.license?.name || "None"}
- Default Branch: ${repoData.default_branch}

## Contributors

This repository has ${contributors.length} contributors. Below is the list of all contributors:

${contributors
  .map(
    (c, i) =>
      `### ${i + 1}. ${c.login}
- **GitHub Username**: ${c.login}
- **Profile URL**: https://github.com/${c.login}
- **Contributions**: ${c.contributions} commits
- **Account Type**: ${c.type}
${i === 0 ? "- **Role**: Primary Developer/Maintainer" : ""}`
  )
  .join("\n\n")}

## Primary Developer

The primary developer and maintainer of this repository is **${contributors[0]?.login || "Unknown"}** with ${contributors[0]?.contributions || 0} contributions.

## Top Contributors

The top 10 contributors to this project are:

${contributors
  .slice(0, 10)
  .map((c, i) => `${i + 1}. **${c.login}**: ${c.contributions} contributions`)
  .join("\n")}

## Project Statistics

- Total Contributors: ${contributors.length}
- Total Contributions: ${contributors.reduce((sum, c) => sum + c.contributions, 0)}
- Repository Size: ${repoData.size} KB
- Has Wiki: ${repoData.has_wiki ? "Yes" : "No"}
- Has Issues: ${repoData.has_issues ? "Yes" : "No"}
- Has Projects: ${repoData.has_projects ? "Yes" : "No"}

## Topics/Tags

${repoData.topics && repoData.topics.length > 0 ? repoData.topics.map((t) => `- ${t}`).join("\n") : "No topics"}

---

This metadata document helps identify contributors, maintainers, and key people involved in the ${repo} project.
Key contributors include: ${contributors.slice(0, 5).map((c) => c.login).join(", ")}.
`;

  return metadataDoc;
}

