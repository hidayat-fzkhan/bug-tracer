import cors from "cors";
import express from "express";
import { fetchBugById, fetchNewBugs } from "./ado.js";
import { analyzeWithAI } from "./ai.js";
import { loadConfig } from "./config.js";
import { fetchGitHubRepoContext, fetchRecentCommits } from "./github.js";
import { stripHtmlToText, truncate } from "./text.js";

const app = express();
app.use(cors());

const port = Number(process.env.API_PORT ?? 4000);

function buildBugText(bug: {
  title: string;
  description?: string;
  reproSteps?: string;
  tags?: string;
}): { summary?: string; description?: string; reproSteps?: string } {
  const description = bug.description
    ? stripHtmlToText(bug.description)
    : undefined;
  const repro = bug.reproSteps ? stripHtmlToText(bug.reproSteps) : undefined;
  const summarySource = repro || description;
  return {
    description,
    reproSteps: repro,
    summary: summarySource ? truncate(summarySource, 600) : undefined,
  };
}

function buildBugResponse(bug: {
  id: number;
  title: string;
  state?: string;
  createdDate?: string;
  assignedTo?: string;
  areaPath?: string;
  iterationPath?: string;
  tags?: string;
  webUrl?: string;
  description?: string;
  reproSteps?: string;
}) {
  const { summary, description, reproSteps } = buildBugText(bug);

  return {
    id: bug.id,
    title: bug.title,
    state: bug.state,
    createdDate: bug.createdDate,
    assignedTo: bug.assignedTo,
    areaPath: bug.areaPath,
    iterationPath: bug.iterationPath,
    tags: bug.tags,
    webUrl: bug.webUrl,
    summary,
    description,
    reproSteps,
    aiAnalysis: undefined as any,
  };
}

async function buildAiAnalysisForBug(params: {
  bug: {
    id: number;
    title: string;
    description?: string;
    reproSteps?: string;
  };
  cfg: ReturnType<typeof loadConfig>;
}) {
  const bugDescription = params.bug.description
    ? stripHtmlToText(params.bug.description)
    : undefined;
  const reproSteps = params.bug.reproSteps
    ? stripHtmlToText(params.bug.reproSteps)
    : undefined;
  const bugContextText = [params.bug.title, bugDescription, reproSteps]
    .filter(Boolean)
    .join("\n\n");

  const [commits, repoContext] = await Promise.all([
    fetchRecentCommits({
      repo: params.cfg.githubRepo,
      token: params.cfg.githubToken,
      branch: params.cfg.githubRepoBranch,
      count: Math.min(params.cfg.githubCommits, 12),
    }),
    fetchGitHubRepoContext({
      repo: params.cfg.githubRepo,
      token: params.cfg.githubToken,
      branch: params.cfg.githubRepoBranch,
      bugText: bugContextText,
      maxFiles: 4,
      maxChars: 6000,
    }),
  ]);

  const fileSections = repoContext
    ? (repoContext.match(/(^|\n)File:\s/g) ?? []).length
    : 0;
  const chars = repoContext?.length ?? 0;
  console.log(
    `[AI][github-context] repo=${params.cfg.githubRepo} branch=${params.cfg.githubRepoBranch} files=${fileSections} chars=${chars}`,
  );

  const aiResult = await analyzeWithAI({
    bugTitle: params.bug.title,
    bugDescription,
    reproSteps,
    repoContext,
    repoBranch: params.cfg.githubRepoBranch,
    recentCommits: commits.slice(0, 12).map((c) => ({
      sha: c.sha,
      message: c.message,
      files: c.files.map((f) => f.filename),
    })),
    anthropicKey: params.cfg.anthropicKey,
    anthropicModel: params.cfg.anthropicModel,
  });

  const enrichedSuspects = aiResult.suspectCommits
    .filter((shaPrefix) => shaPrefix && shaPrefix.trim().length > 0)
    .map((shaPrefix) => {
      const commit = commits.find((c) =>
        c.sha.toLowerCase().startsWith(shaPrefix.toLowerCase().trim()),
      );
      return {
        sha: shaPrefix.trim(),
        url: commit?.htmlUrl,
      };
    })
    .filter((c) => c.sha.length >= 7);

  return {
    ...aiResult,
    suspectCommits: enrichedSuspects,
  };
}

app.get("/api/bugs", async (req, res) => {
  try {
    const cfg = loadConfig();
    const bugIdParam =
      typeof req.query.bugId === "string" ? req.query.bugId : undefined;
    const bugId = bugIdParam ? Number(bugIdParam) : undefined;

    const bugs = Number.isFinite(bugId)
      ? await fetchBugById({
          adoOrg: cfg.adoOrg,
          project: cfg.adoProject,
          pat: cfg.adoPat,
          id: bugId as number,
        }).then((bug) => (bug ? [bug] : []))
      : await fetchNewBugs({
          adoOrg: cfg.adoOrg,
          project: cfg.adoProject,
          pat: cfg.adoPat,
          top: cfg.adoTop,
          createdInLastDays: cfg.adoDays,
          states: cfg.adoStates,
          areaPath: cfg.adoAreaPath,
        });

    const response = bugs.map(buildBugResponse);

    res.json({
      generatedAt: new Date().toISOString(),
      bugs: response,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.get("/api/bugs/:bugId/analysis", async (req, res) => {
  try {
    const cfg = loadConfig();
    const bugId = Number(req.params.bugId);

    if (!Number.isFinite(bugId)) {
      res.status(400).json({ error: "Invalid bug id" });
      return;
    }

    const bug = await fetchBugById({
      adoOrg: cfg.adoOrg,
      project: cfg.adoProject,
      pat: cfg.adoPat,
      id: bugId,
    });

    if (!bug) {
      res.status(404).json({ error: `Bug ${bugId} not found` });
      return;
    }

    const aiAnalysis = await buildAiAnalysisForBug({ bug, cfg });

    res.json({
      generatedAt: new Date().toISOString(),
      bugId,
      aiAnalysis,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`Bugs Agent API running on http://localhost:${port}`);
});
