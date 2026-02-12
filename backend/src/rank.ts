import type { GitCommit, RankedCommit } from "./types.js";

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "has",
  "have",
  "i",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "were",
  "will",
  "with"
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_./-]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .filter((t) => !STOPWORDS.has(t));
}

function scoreOverlap(queryTokens: Set<string>, docTokens: Set<string>): { score: number; matched: string[] } {
  const matched: string[] = [];
  for (const t of queryTokens) {
    if (docTokens.has(t)) matched.push(t);
  }
  const score = matched.length / Math.max(8, queryTokens.size);
  return { score, matched };
}

export function rankCommits(params: {
  bugText: string;
  commits: GitCommit[];
  bugId?: number;
  minScore?: number;
}): RankedCommit[] {
  const qTokens = new Set(tokenize(params.bugText));
  const minScore = params.minScore ?? 0;

  const ranked = params.commits.map((c) => {
    const docText = [
      c.message,
      ...c.files.map((f) => f.filename)
    ].join("\n");

    const dTokens = new Set(tokenize(docText));
    const { score, matched } = scoreOverlap(qTokens, dTokens);

    // Add a small bias for matching filenames (often very indicative).
    const filenameTokens = new Set(tokenize(c.files.map((f) => f.filename).join("\n")));
    let filenameMatches = 0;
    for (const t of qTokens) {
      if (filenameTokens.has(t)) filenameMatches += 1;
    }

    let boostedScore = score + filenameMatches * 0.08;

    // Boost when commit references the exact bug/ADO work item id.
    if (params.bugId && params.bugId > 0) {
      const bugId = String(params.bugId);
      const messageLower = c.message.toLowerCase();
      if (
        messageLower.includes(bugId) ||
        messageLower.includes(`ab#${bugId}`) ||
        messageLower.includes(`ab #${bugId}`) ||
        messageLower.includes(`#${bugId}`)
      ) {
        boostedScore += 0.6;
      }
    }

    // Penalize merge commits to reduce noise.
    if (/^merge\b/i.test(c.message.trim())) {
      boostedScore *= 0.6;
    }

    return {
      ...c,
      score: boostedScore,
      matchedTokens: matched.slice(0, 25)
    };
  });

  return ranked
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score);
}
