import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages.js";

const MAX_BUG_FIELD_CHARS = 600;
const MAX_REPO_CONTEXT_CHARS = 6000;
const MAX_COMMITS = 12;
const MAX_FILES_PER_COMMIT = 3;
const MAX_COMMIT_MESSAGE_CHARS = 140;

function truncate(input: string, maxChars: number): string {
  if (input.length <= maxChars) {
    return input;
  }

  return `${input.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function compactText(input: string | undefined, maxChars: number): string | undefined {
  if (!input) {
    return undefined;
  }

  const compact = input.replaceAll(/\s+/g, " ").trim();
  return compact ? truncate(compact, maxChars) : undefined;
}

function compactRepoContext(input: string | undefined): string | undefined {
  if (!input) {
    return undefined;
  }

  const sections = input
    .split(/\n\n---\n\n/g)
    .slice(0, 4)
    .map((section) => section.trim())
    .filter(Boolean);

  if (sections.length === 0) {
    return undefined;
  }

  return truncate(sections.join("\n\n---\n\n"), MAX_REPO_CONTEXT_CHARS);
}

export type AIAnalysisParams = {
  bugTitle: string;
  bugDescription?: string;
  reproSteps?: string;
  repoContext?: string;
  repoBranch: string;
  recentCommits: Array<{
    sha: string;
    message: string;
    files: string[];
  }>;
  anthropicKey: string;
  anthropicModel: string;
};

export type AIAnalysisResult = {
  summary: string;
  likelyCause?: string;
  suspectCommits: string[];
  recommendations: string[];
  importantPoints?: string[];
};

export async function analyzeWithAI(
  params: AIAnalysisParams,
): Promise<AIAnalysisResult> {
  const commitsText = params.recentCommits
    .slice(0, MAX_COMMITS)
    .map(
      (c) =>
        `${c.sha.slice(0, 8)} | ${truncate(c.message.replaceAll(/\s+/g, " ").trim(), MAX_COMMIT_MESSAGE_CHARS)} | ${c.files.slice(0, MAX_FILES_PER_COMMIT).join(", ")}`,
    )
    .join("\n\n");

  const bugDescription = compactText(params.bugDescription, MAX_BUG_FIELD_CHARS);
  const reproSteps = compactText(params.reproSteps, MAX_BUG_FIELD_CHARS);
  const repoContext = compactRepoContext(params.repoContext);

  const systemPrompt = [
    "You analyze production bugs using only the supplied bug details, recent commits, and repo snippets.",
    "Return concise JSON only.",
    "Prefer concrete evidence from the provided commits and snippets.",
    "Do not speculate beyond the supplied context.",
  ].join(" ");

  const prompt = [
    `Bug title: ${params.bugTitle}`,
    bugDescription ? `Bug description: ${bugDescription}` : undefined,
    reproSteps ? `Repro steps: ${reproSteps}` : undefined,
    `Branch: ${params.repoBranch}`,
    `Recent commits:\n${commitsText || "None provided"}`,
    repoContext ? `Relevant repo snippets:\n${repoContext}` : "Relevant repo snippets: None provided",
    [
      "Return valid JSON with this exact shape:",
      '{"summary":"","likelyCause":"","suspectCommits":["sha-prefix"],"recommendations":["action"],"importantPoints":["point"]}',
      "Rules:",
      "- Keep summary to 2 sentences max.",
      "- suspectCommits must contain at most 3 SHA prefixes from the provided commit list.",
      "- recommendations must contain at most 3 short, concrete actions.",
      "- importantPoints must contain at most 3 short bullets.",
    ].join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  const anthropic = new Anthropic({ apiKey: params.anthropicKey });
  const messages: MessageParam[] = [
    {
      role: "user",
      content: prompt,
    },
  ];
  console.log("🚀 ~ analyzeWithAI ~ messages:", messages)

  const response = await anthropic.messages.create({
    model: params.anthropicModel,
    system: systemPrompt,
    max_tokens: 900,
    messages,
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  try {
    return JSON.parse(content.text) as AIAnalysisResult;
  } catch {
    // Fallback if JSON parsing fails
    return {
      summary: content.text,
      suspectCommits: [],
      recommendations: [],
      importantPoints: [],
    };
  }
}
