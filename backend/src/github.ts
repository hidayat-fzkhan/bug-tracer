import { Octokit } from "@octokit/rest";
import type { GitCommit } from "./types.js";

const MAX_CONTEXT_BLOB_CANDIDATES = 48;
const MAX_CONTEXT_BLOB_SIZE = 120_000;
const BLOB_FETCH_CONCURRENCY = 8;

export function parseRepo(repo: string): { owner: string; repo: string } {
  const trimmed = repo.trim().replace(/\.git$/, "");
  const normalized = trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed.replace(/^https?:\/\/github\.com\//, "")
    : trimmed;
  const [owner, name] = normalized.split("/");
  if (!owner || !name) {
    throw new Error(`Invalid GITHUB_REPO. Expected 'owner/repo' or GitHub URL, got: ${repo}`);
  }
  return { owner, repo: name };
}

function createOctokit(token?: string): Octokit {
  return token ? new Octokit({ auth: token }) : new Octokit();
}

const FILE_EXT_ALLOW = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".css",
  ".scss",
  ".html",
  ".sql",
  ".py",
  ".java",
  ".go",
  ".cs"
]);

const STOP_WORDS = new Set([
  "this",
  "that",
  "with",
  "from",
  "have",
  "been",
  "were",
  "will",
  "would",
  "could",
  "should",
  "into",
  "when",
  "where",
  "what",
  "which",
  "your",
  "about",
  "after",
  "before",
  "while",
  "there",
  "their",
  "error",
  "issue",
  "bug"
]);

function extractKeywords(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
  return [...new Set(tokens)].slice(0, 30);
}

function extractPathHints(text: string): string[] {
  const pathMatches = text.match(/[A-Za-z0-9_./-]+\.(ts|tsx|js|jsx|json|md|yml|yaml|css|scss|html|sql|py|java|go|cs)/g) ?? [];
  return [...new Set(pathMatches.map((match) => match.toLowerCase()))].slice(0, 20);
}

function scorePath(filePath: string, keywords: string[], pathHints: string[]): number {
  const lower = filePath.toLowerCase();
  let score = 0;

  for (const hint of pathHints) {
    if (lower.includes(hint)) {
      score += 8;
    }
  }

  for (const keyword of keywords) {
    if (lower.includes(keyword)) score += 2;
  }
  return score;
}

function scoreContent(content: string, keywords: string[]): number {
  const lower = content.toLowerCase();
  let score = 0;
  for (const keyword of keywords) {
    if (lower.includes(keyword)) score += 1;
  }
  return score;
}

function buildSnippet(content: string, keywords: string[], maxChars: number): string {
  const lines = content.split("\n");
  const hitIndexes: number[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].toLowerCase();
    if (keywords.some((keyword) => line.includes(keyword))) {
      hitIndexes.push(index);
      if (hitIndexes.length >= 4) break;
    }
  }

  if (hitIndexes.length === 0) {
    return content.slice(0, maxChars);
  }

  const blocks = hitIndexes.map((index) => {
    const start = Math.max(0, index - 2);
    const end = Math.min(lines.length, index + 3);
    return lines.slice(start, end).join("\n");
  });

  return blocks.join("\n...\n").slice(0, maxChars);
}

async function mapWithConcurrency<TInput, TOutput>(params: {
  items: TInput[];
  concurrency: number;
  mapper: (item: TInput) => Promise<TOutput>;
}): Promise<TOutput[]> {
  const results: TOutput[] = [];
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < params.items.length) {
      const index = currentIndex;
      currentIndex += 1;
      results[index] = await params.mapper(params.items[index]);
    }
  }

  const workerCount = Math.max(1, Math.min(params.concurrency, params.items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export async function fetchRecentCommits(params: {
  repo: string;
  token?: string;
  branch: string;
  count: number;
}): Promise<GitCommit[]> {
  const { owner, repo } = parseRepo(params.repo);
  const octokit = createOctokit(params.token);

  const listResp = await octokit.repos.listCommits({
    owner,
    repo,
    sha: params.branch,
    per_page: Math.min(100, Math.max(1, params.count))
  });

  const shas = listResp.data.slice(0, Math.max(0, params.count)).map((c) => c.sha);

  return Promise.all(
    shas.map(async (sha) => {
      const commitResp = await octokit.repos.getCommit({ owner, repo, ref: sha });
      const message = commitResp.data.commit.message ?? "";

      return {
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
      };
    }),
  );
}

export async function fetchGitHubRepoContext(params: {
  repo: string;
  token?: string;
  branch: string;
  bugText: string;
  maxFiles?: number;
  maxChars?: number;
}): Promise<string | undefined> {
  const { owner, repo } = parseRepo(params.repo);
  const octokit = createOctokit(params.token);
  const keywords = extractKeywords(params.bugText);
  const pathHints = extractPathHints(params.bugText);
  if (keywords.length === 0) return undefined;

  const branchResp = await octokit.repos.getBranch({
    owner,
    repo,
    branch: params.branch
  });

  const treeResp = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: branchResp.data.commit.commit.tree.sha,
    recursive: "true"
  });

  const blobs = (treeResp.data.tree ?? [])
    .filter((entry) => entry.type === "blob" && !!entry.path && !!entry.sha)
    .filter((entry) => {
      const ext = entry.path ? entry.path.slice(entry.path.lastIndexOf(".")).toLowerCase() : "";
      return FILE_EXT_ALLOW.has(ext) && (entry.size ?? 0) <= MAX_CONTEXT_BLOB_SIZE;
    })
    .sort(
      (left, right) => scorePath(right.path ?? "", keywords, pathHints) - scorePath(left.path ?? "", keywords, pathHints),
    )
    .slice(0, MAX_CONTEXT_BLOB_CANDIDATES);

  const scored = (
    await mapWithConcurrency({
      items: blobs,
      concurrency: BLOB_FETCH_CONCURRENCY,
      mapper: async (blob) => {
        try {
          const blobResp = await octokit.git.getBlob({
            owner,
            repo,
            file_sha: blob.sha as string,
          });

          const content = Buffer.from(blobResp.data.content, "base64").toString("utf8");
          const score = scorePath(blob.path ?? "", keywords, pathHints) + scoreContent(content, keywords);
          if (score <= 0) {
            return undefined;
          }

          return {
            path: blob.path as string,
            score,
            content,
          };
        } catch {
          return undefined;
        }
      },
    })
  ).filter((item): item is { path: string; score: number; content: string } => Boolean(item));

  if (scored.length === 0) return undefined;

  scored.sort((left, right) => right.score - left.score);
  const maxFiles = Math.max(1, params.maxFiles ?? 8);
  const maxChars = Math.max(1000, params.maxChars ?? 12000);
  const sections: string[] = [];
  let totalChars = 0;

  for (const item of scored.slice(0, maxFiles)) {
    const snippet = buildSnippet(item.content, keywords, 1800);
    const section = `File: ${item.path}\n\n${snippet}`;
    if (totalChars + section.length > maxChars) break;
    sections.push(section);
    totalChars += section.length;
  }

  return sections.length > 0 ? sections.join("\n\n---\n\n") : undefined;
}
