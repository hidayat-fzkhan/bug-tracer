import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages.js";

export type AIAnalysisParams = {
  bugTitle: string;
  bugDescription?: string;
  reproSteps?: string;
  recentCommits: Array<{
    sha: string;
    message: string;
    files: string[];
  }>;
  apiKey?: string;
  useOllama?: boolean;
  ollamaModel?: string;
  ollamaBaseUrl?: string;
};

export type AIAnalysisResult = {
  summary: string;
  likelyCause?: string;
  suspectCommits: string[];
  recommendations: string[];
};

async function analyzeWithOllama(params: AIAnalysisParams, prompt: string): Promise<AIAnalysisResult> {
  const baseUrl = params.ollamaBaseUrl || "http://localhost:11434";
  const model = params.ollamaModel || "llama3";

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.status}`);
  }

  const data = (await response.json()) as { response?: string };
  const text = data.response || "";

  // Try to parse JSON response
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]) as AIAnalysisResult;
      return result;
    }
  } catch {
    // Fallback if JSON parsing fails
  }

  return {
    summary: text,
    suspectCommits: [],
    recommendations: []
  };
}

export async function analyzeWithAI(params: AIAnalysisParams): Promise<AIAnalysisResult> {
  const commitsText = params.recentCommits
    .slice(0, 30)
    .map((c) => `${c.sha.slice(0, 8)}: ${c.message}\nFiles: ${c.files.slice(0, 5).join(", ")}`)
    .join("\n\n");

  const prompt = `You are a senior software engineer analyzing a bug report and recent code changes.

Bug Report:
Title: ${params.bugTitle}
${params.bugDescription ? `Description: ${params.bugDescription}` : ""}
${params.reproSteps ? `Repro Steps: ${params.reproSteps}` : ""}

Recent Commits (last 30):
${commitsText}

Based on this information:
1. Provide a brief summary of what likely caused this bug
2. Identify the most suspect commits (by SHA prefix)
3. Give specific recommendations for investigation

Format your response as JSON:
{
  "summary": "One paragraph analysis",
  "likelyCause": "Most likely root cause",
  "suspectCommits": ["sha1", "sha2"],
  "recommendations": ["rec1", "rec2"]
}`;

  // Use Ollama if configured
  if (params.useOllama) {
    return analyzeWithOllama(params, prompt);
  }

  // Use Anthropic Claude
  if (!params.apiKey) {
    throw new Error("AI_API_KEY required for Anthropic analysis");
  }

  const anthropic = new Anthropic({ apiKey: params.apiKey });
  const messages: MessageParam[] = [
    {
      role: "user",
      content: prompt
    }
  ];

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 2000,
    messages
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  try {
    const result = JSON.parse(content.text) as AIAnalysisResult;
    return result;
  } catch {
    // Fallback if JSON parsing fails
    return {
      summary: content.text,
      suspectCommits: [],
      recommendations: []
    };
  }
}
