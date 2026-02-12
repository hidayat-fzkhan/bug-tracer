import { Octokit } from "@octokit/rest";
import type { GitCommit } from "./types.js";

export function parseRepo(repo: string): { owner: string; repo: string } {
  const trimmed = repo.trim();
  const [owner, name] = trimmed.split("/");
  if (!owner || !name) {
    throw new Error(`Invalid --gh-repo. Expected 'owner/repo', got: ${repo}`);
  }
  return { owner, repo: name };
}

export async function fetchRecentCommits(params: {
  repo: string;
  token: string;
  count: number;
}): Promise<GitCommit[]> {
  const { owner, repo } = parseRepo(params.repo);
  const octokit = new Octokit({ auth: params.token });

  const listResp = await octokit.repos.listCommits({
    owner,
    repo,
    per_page: Math.min(100, Math.max(1, params.count))
  });

  const shas = listResp.data.slice(0, Math.max(0, params.count)).map((c) => c.sha);

  const commits: GitCommit[] = [];
  for (const sha of shas) {
    const commitResp = await octokit.repos.getCommit({ owner, repo, ref: sha });
    const message = commitResp.data.commit.message ?? "";

    commits.push({
      sha,
      htmlUrl: commitResp.data.html_url,
      message,
      authorName: commitResp.data.commit.author?.name,
      date: commitResp.data.commit.author?.date,
      files:
        (commitResp.data.files ?? []).map((f) => ({
          filename: f.filename,
          status: f.status
        })) ?? []
    });
  }

  return commits;
}
