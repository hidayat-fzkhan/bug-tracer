import cors from "cors";
import express from "express";
import { fetchBugById, fetchNewBugs } from "./ado.js";
import { analyzeWithAI } from "./ai.js";
import { loadConfig } from "./config.js";
import { fetchRecentCommits } from "./github.js";
import { stripHtmlToText, truncate } from "./text.js";

const app = express();
app.use(cors());

const port = Number(process.env.API_PORT ?? 4000);

function buildBugText(bug: {
  title: string;
  description?: string;
  reproSteps?: string;
  tags?: string;
}): { summary?: string } {
  const description = bug.description
    ? stripHtmlToText(bug.description)
    : undefined;
  const repro = bug.reproSteps ? stripHtmlToText(bug.reproSteps) : undefined;
  const summarySource = repro || description;
  return {
    summary: summarySource ? truncate(summarySource, 600) : undefined,
  };
}

app.get("/api/bugs", async (req, res) => {
  try {
    const cfg = loadConfig();
    const bugIdParam =
      typeof req.query.bugId === "string" ? req.query.bugId : undefined;
    const bugId = bugIdParam ? Number(bugIdParam) : undefined;

    const commits = await fetchRecentCommits({
      repo: cfg.githubRepo,
      token: cfg.githubToken,
      count: cfg.githubCommits,
    });

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

    const response = bugs.map((bug) => {
      const { summary } = buildBugText(bug);

      return {
        id: bug.id,
        title: bug.title,
        state: bug.state,
        createdDate: bug.createdDate,
        assignedTo: bug.assignedTo,
        areaPath: bug.areaPath,
        tags: bug.tags,
        webUrl: bug.webUrl,
        summary,
        aiAnalysis: undefined as any,
      };
    });

    // If AI is enabled and we have a single bug query, run AI analysis
    if (cfg.aiEnabled && bugs.length === 1) {
      try {
        const bug = bugs[0];
        const aiResult = await analyzeWithAI({
          bugTitle: bug.title,
          bugDescription: bug.description
            ? stripHtmlToText(bug.description)
            : undefined,
          reproSteps: bug.reproSteps
            ? stripHtmlToText(bug.reproSteps)
            : undefined,
          recentCommits: commits.slice(0, 30).map((c) => ({
            sha: c.sha,
            message: c.message,
            files: c.files.map((f) => f.filename),
          })),
          apiKey: cfg.aiApiKey,
          useOllama: cfg.useOllama,
          ollamaModel: cfg.ollamaModel,
          ollamaBaseUrl: cfg.ollamaBaseUrl,
        });

        console.log("🚀 ~ aiResult:", aiResult);

        // Enrich AI suspect commits with URLs
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

        response[0].aiAnalysis = {
          ...aiResult,
          suspectCommits: enrichedSuspects,
        };
      } catch (err) {
        console.error("AI analysis failed:", err);
      }
    }

    res.json({
      generatedAt: new Date().toISOString(),
      bugs: response,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`Bugs Agent API running on http://localhost:${port}`);
});
