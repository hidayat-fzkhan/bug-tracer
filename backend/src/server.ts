import cors from "cors";
import express from "express";
import { fetchNewWorkItems, fetchWorkItemById } from "./ado.js";
import {
  analyzeWithAI,
  generateImplementationPrompt,
  hasEnoughDataForUserStoryAnalysis,
  type AIAnalysisResult,
} from "./ai.js";
import { loadConfig } from "./config.js";
import { fetchGitHubRepoContext, fetchRecentCommits } from "./github.js";
import { stripHtmlToText, truncate } from "./text.js";
import type {
  AdoWorkItem,
  WorkItemAnalysisType,
  WorkItemCategory,
} from "./types.js";

const app = express();
app.use(cors());

const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);

const CATEGORY_LABELS: Record<WorkItemCategory, string> = {
  bugs: "Bug",
  "user-stories": "User story",
};

const ANALYSIS_CACHE_TTL_MS = 15 * 60 * 1000;

type CachedAnalysisEntry = {
  expiresAt: number;
  value: ReturnType<typeof enrichSuspectCommits> extends Promise<infer TResult>
    ? TResult
    : never;
};

const analysisCache = new Map<string, CachedAnalysisEntry>();

type CachedPromptEntry = {
  expiresAt: number;
  value: string;
};

const implementationPromptCache = new Map<string, CachedPromptEntry>();

function getCachedPrompt(cacheKey: string): string | undefined {
  const cached = implementationPromptCache.get(cacheKey);
  if (!cached) {
    return undefined;
  }
  if (cached.expiresAt <= Date.now()) {
    implementationPromptCache.delete(cacheKey);
    return undefined;
  }
  return cached.value;
}

function setCachedPrompt(cacheKey: string, value: string) {
  implementationPromptCache.set(cacheKey, {
    expiresAt: Date.now() + ANALYSIS_CACHE_TTL_MS,
    value,
  });
}

function elapsedMs(startTime: number): number {
  return Math.round(performance.now() - startTime);
}

function buildWorkItemFingerprint(workItem: AdoWorkItem): string {
  return [
    workItem.title,
    workItem.state,
    workItem.description,
    workItem.reproSteps,
    workItem.acceptanceCriteria,
  ]
    .filter(Boolean)
    .join("|")
    .slice(0, 2000);
}

function buildCacheKey(params: {
  workItem: AdoWorkItem;
  branchHeadSha: string;
  model: string;
}): string {
  return [
    params.workItem.category,
    params.workItem.id,
    params.branchHeadSha,
    params.model,
    buildWorkItemFingerprint(params.workItem),
  ].join("::");
}

function serializeError(err: unknown): string {
  if (!(err instanceof Error)) return "Unknown error";
  const cause = (err as NodeJS.ErrnoException & { cause?: unknown }).cause;
  if (cause instanceof Error) {
    return `${err.message}: ${cause.message}`;
  }
  return err.message;
}

function getCachedAnalysis(cacheKey: string) {
  const cached = analysisCache.get(cacheKey);
  if (!cached) {
    return undefined;
  }

  if (cached.expiresAt <= Date.now()) {
    analysisCache.delete(cacheKey);
    return undefined;
  }

  return cached.value;
}

function setCachedAnalysis(
  cacheKey: string,
  value: CachedAnalysisEntry["value"],
) {
  analysisCache.set(cacheKey, {
    expiresAt: Date.now() + ANALYSIS_CACHE_TTL_MS,
    value,
  });
}

function shouldFetchRepoContext(params: {
  analysisType: WorkItemAnalysisType;
  aiResult: AIAnalysisResult;
}): boolean {
  if (params.aiResult.status !== "ready") {
    return false;
  }

  if (params.analysisType === "bug") {
    return (
      !params.aiResult.likelyCause ||
      params.aiResult.recommendations.length === 0
    );
  }

  return (
    !params.aiResult.implementationApproach ||
    params.aiResult.recommendations.length === 0 ||
    (params.aiResult.impactedAreas?.length ?? 0) === 0
  );
}

function buildWorkItemText(workItem: {
  category: WorkItemCategory;
  description?: string;
  reproSteps?: string;
  acceptanceCriteria?: string;
}): {
  summary?: string;
  description?: string;
  reproSteps?: string;
  acceptanceCriteria?: string;
} {
  const description = workItem.description
    ? stripHtmlToText(workItem.description)
    : undefined;
  const repro = workItem.reproSteps
    ? stripHtmlToText(workItem.reproSteps)
    : undefined;
  const acceptanceCriteria = workItem.acceptanceCriteria
    ? stripHtmlToText(workItem.acceptanceCriteria)
    : undefined;
  const summarySource =
    workItem.category === "bugs"
      ? repro || description
      : acceptanceCriteria || description;

  return {
    description,
    reproSteps: repro,
    acceptanceCriteria,
    summary: summarySource ? truncate(summarySource, 600) : undefined,
  };
}

function buildWorkItemResponse(workItem: AdoWorkItem) {
  const { summary, description, reproSteps, acceptanceCriteria } =
    buildWorkItemText(workItem);

  return {
    id: workItem.id,
    category: workItem.category,
    workItemType: workItem.workItemType,
    title: workItem.title,
    state: workItem.state,
    createdDate: workItem.createdDate,
    assignedTo: workItem.assignedTo,
    areaPath: workItem.areaPath,
    iterationPath: workItem.iterationPath,
    tags: workItem.tags,
    webUrl: workItem.webUrl,
    summary,
    description,
    reproSteps,
    acceptanceCriteria,
    aiAnalysis: undefined as any,
  };
}

function getAnalysisType(category: WorkItemCategory): WorkItemAnalysisType {
  return category === "bugs" ? "bug" : "user-story";
}

function buildNotEnoughDataAnalysis(): AIAnalysisResult {
  return {
    analysisType: "user-story",
    status: "not-enough-data",
    summary: "Not enough data for AI analysis.",
    suspectCommits: [],
    recommendations: [],
    importantPoints: [],
    impactedAreas: [],
    dependencies: [],
  };
}

async function enrichSuspectCommits(params: {
  aiResult: AIAnalysisResult;
  commits: Awaited<ReturnType<typeof fetchRecentCommits>>;
}) {
  const enrichedSuspects = params.aiResult.suspectCommits
    .filter((shaPrefix) => shaPrefix && shaPrefix.trim().length > 0)
    .map((shaPrefix) => {
      const commit = params.commits.find((c) =>
        c.sha.toLowerCase().startsWith(shaPrefix.toLowerCase().trim()),
      );
      return {
        sha: shaPrefix.trim(),
        url: commit?.htmlUrl,
      };
    })
    .filter((c) => c.sha.length >= 7);

  return {
    ...params.aiResult,
    suspectCommits: enrichedSuspects,
  };
}

async function buildAiAnalysisForWorkItem(params: {
  workItem: AdoWorkItem;
  cfg: ReturnType<typeof loadConfig>;
}) {
  const description = params.workItem.description
    ? stripHtmlToText(params.workItem.description)
    : undefined;
  const reproSteps = params.workItem.reproSteps
    ? stripHtmlToText(params.workItem.reproSteps)
    : undefined;
  const acceptanceCriteria = params.workItem.acceptanceCriteria
    ? stripHtmlToText(params.workItem.acceptanceCriteria)
    : undefined;

  if (
    params.workItem.category === "user-stories" &&
    !hasEnoughDataForUserStoryAnalysis({
      ticketDescription: description,
      acceptanceCriteria,
    })
  ) {
    return buildNotEnoughDataAnalysis();
  }

  const workItemContextText = [
    params.workItem.title,
    description,
    reproSteps,
    acceptanceCriteria,
  ]
    .filter(Boolean)
    .join("\n\n");

  const commitsStart = performance.now();
  const commits = await fetchRecentCommits({
    repo: params.cfg.githubRepo,
    token: params.cfg.githubToken,
    branch: params.cfg.githubRepoBranch,
    count: Math.min(params.cfg.githubCommits, 12),
  });
  console.log(
    `[AI][commits] repo=${params.cfg.githubRepo} branch=${params.cfg.githubRepoBranch} count=${commits.length} elapsedMs=${elapsedMs(commitsStart)}`,
  );

  const branchHeadSha = commits[0]?.sha ?? params.cfg.githubRepoBranch;
  const cacheKey = buildCacheKey({
    workItem: params.workItem,
    branchHeadSha,
    model: params.cfg.anthropicModel,
  });
  const cached = getCachedAnalysis(cacheKey);
  if (cached) {
    console.log(
      `[AI][cache] category=${params.workItem.category} ticketId=${params.workItem.id} branchHead=${branchHeadSha.slice(0, 8)} hit=true`,
    );
    return cached;
  }

  console.log(
    `[AI][cache] category=${params.workItem.category} ticketId=${params.workItem.id} branchHead=${branchHeadSha.slice(0, 8)} hit=false`,
  );

  const aiStart = performance.now();
  const analysisType = getAnalysisType(params.workItem.category);
  const baseAiResult = await analyzeWithAI({
    analysisType,
    ticketTitle: params.workItem.title,
    ticketDescription: description,
    reproSteps,
    acceptanceCriteria,
    repoContext: undefined,
    repoBranch: params.cfg.githubRepoBranch,
    recentCommits: commits.slice(0, 8).map((c) => ({
      sha: c.sha,
      message: c.message,
      files: c.files.map((f) => f.filename),
    })),
    anthropicKey: params.cfg.anthropicKey,
    anthropicModel: params.cfg.anthropicModel,
  });
  const fastPassElapsed = elapsedMs(aiStart);
  console.log(
    `[AI][model-fast] category=${params.workItem.category} ticketId=${params.workItem.id} model=${params.cfg.anthropicModel} elapsedMs=${fastPassElapsed}`,
  );

  let finalAiResult = baseAiResult;

  if (shouldFetchRepoContext({ analysisType, aiResult: baseAiResult })) {
    const githubContextStart = performance.now();
    const repoContext = await fetchGitHubRepoContext({
      repo: params.cfg.githubRepo,
      token: params.cfg.githubToken,
      branch: params.cfg.githubRepoBranch,
      bugText: workItemContextText,
      maxFiles: 4,
      maxChars: 6000,
    });
    const githubElapsed = elapsedMs(githubContextStart);
    const fileSections = repoContext
      ? (repoContext.match(/(^|\n)File:\s/g) ?? []).length
      : 0;
    const chars = repoContext?.length ?? 0;
    console.log(
      `[AI][github-context] repo=${params.cfg.githubRepo} branch=${params.cfg.githubRepoBranch} files=${fileSections} chars=${chars} elapsedMs=${githubElapsed}`,
    );

    if (repoContext) {
      const deepAiStart = performance.now();
      finalAiResult = await analyzeWithAI({
        analysisType,
        ticketTitle: params.workItem.title,
        ticketDescription: description,
        reproSteps,
        acceptanceCriteria,
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
      console.log(
        `[AI][model-deep] category=${params.workItem.category} ticketId=${params.workItem.id} model=${params.cfg.anthropicModel} elapsedMs=${elapsedMs(deepAiStart)}`,
      );
    }
  } else {
    console.log(
      `[AI][github-context] repo=${params.cfg.githubRepo} branch=${params.cfg.githubRepoBranch} skipped=true`,
    );
  }

  const enrichedResult = await enrichSuspectCommits({
    aiResult: finalAiResult,
    commits,
  });
  setCachedAnalysis(cacheKey, enrichedResult);
  return enrichedResult;
}

function getQueryTicketId(query: Record<string, unknown>) {
  const candidates = [query.ticketId, query.bugId, query.storyId];
  const raw = candidates.find((value) => typeof value === "string");

  if (typeof raw !== "string") {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function registerCategoryRoutes(params: {
  route: string;
  category: WorkItemCategory;
  listKey: "bugs" | "userStories";
}) {
  app.get(`/api/${params.route}`, async (req, res) => {
    try {
      const cfg = loadConfig();
      const ticketId = getQueryTicketId(req.query as Record<string, unknown>);

      const workItems = Number.isFinite(ticketId)
        ? await fetchWorkItemById({
            adoOrg: cfg.adoOrg,
            project: cfg.adoProject,
            pat: cfg.adoPat,
            id: ticketId as number,
            category: params.category,
          }).then((workItem) => (workItem ? [workItem] : []))
        : await fetchNewWorkItems({
            adoOrg: cfg.adoOrg,
            project: cfg.adoProject,
            pat: cfg.adoPat,
            category: params.category,
            top: cfg.adoTop,
            createdInLastDays: cfg.adoDays,
            states: cfg.adoStates,
            areaPath: cfg.adoAreaPath,
          });

      const response = workItems.map(buildWorkItemResponse);

      res.json({
        generatedAt: new Date().toISOString(),
        tickets: response,
        [params.listKey]: response,
      });
    } catch (err) {
      console.error(`[error] route=/api/${params.route}`, err);
      const message = serializeError(err);
      res.status(500).json({ error: message });
    }
  });

  app.get(`/api/${params.route}/:ticketId/analysis`, async (req, res) => {
    try {
      const requestStart = performance.now();
      const cfg = loadConfig();
      const ticketId = Number(req.params.ticketId);

      if (!Number.isFinite(ticketId)) {
        res.status(400).json({
          error: `Invalid ${CATEGORY_LABELS[params.category].toLowerCase()} id`,
        });
        return;
      }

      const workItem = await fetchWorkItemById({
        adoOrg: cfg.adoOrg,
        project: cfg.adoProject,
        pat: cfg.adoPat,
        id: ticketId,
        category: params.category,
      });

      if (!workItem) {
        res.status(404).json({
          error: `${CATEGORY_LABELS[params.category]} ${ticketId} not found`,
        });
        return;
      }

      const aiAnalysis = await buildAiAnalysisForWorkItem({ workItem, cfg });
      console.log(
        `[AI][analysis] category=${params.category} ticketId=${ticketId} model=${cfg.anthropicModel} elapsedMs=${elapsedMs(requestStart)}`,
      );

      res.json({
        generatedAt: new Date().toISOString(),
        ticketId,
        aiAnalysis,
      });
    } catch (err) {
      console.error(`[error] route=/api/${params.route}/:ticketId/analysis`, err);
      const message = serializeError(err);
      res.status(500).json({ error: message });
    }
  });
}

registerCategoryRoutes({
  route: "bugs",
  category: "bugs",
  listKey: "bugs",
});

registerCategoryRoutes({
  route: "user-stories",
  category: "user-stories",
  listKey: "userStories",
});

app.get(
  "/api/user-stories/:ticketId/implementation-prompt",
  async (req, res) => {
    try {
      const requestStart = performance.now();
      const cfg = loadConfig();
      const ticketId = Number(req.params.ticketId);
      const additionalGuidance =
        typeof req.query.additionalGuidance === "string" &&
        req.query.additionalGuidance.trim()
          ? req.query.additionalGuidance.trim()
          : undefined;

      if (!Number.isFinite(ticketId)) {
        res.status(400).json({ error: "Invalid user story id" });
        return;
      }

      const workItem = await fetchWorkItemById({
        adoOrg: cfg.adoOrg,
        project: cfg.adoProject,
        pat: cfg.adoPat,
        id: ticketId,
        category: "user-stories",
      });

      if (!workItem) {
        res.status(404).json({ error: `User story ${ticketId} not found` });
        return;
      }

      const description = workItem.description
        ? stripHtmlToText(workItem.description)
        : undefined;
      const acceptanceCriteria = workItem.acceptanceCriteria
        ? stripHtmlToText(workItem.acceptanceCriteria)
        : undefined;

      const commits = await fetchRecentCommits({
        repo: cfg.githubRepo,
        token: cfg.githubToken,
        branch: cfg.githubRepoBranch,
        count: Math.min(cfg.githubCommits, 8),
      });

      const branchHeadSha = commits[0]?.sha ?? cfg.githubRepoBranch;
      const analysisCacheKey = buildCacheKey({
        workItem,
        branchHeadSha,
        model: cfg.anthropicModel,
      });
      const promptCacheKey = `impl_prompt::${analysisCacheKey}`;
      const cached = additionalGuidance
        ? null
        : getCachedPrompt(promptCacheKey);

      if (cached) {
        console.log(`[AI][impl-prompt][cache] ticketId=${ticketId} hit=true`);
        res.json({
          generatedAt: new Date().toISOString(),
          ticketId,
          implementationPrompt: cached,
        });
        return;
      }

      const cachedAnalysis = getCachedAnalysis(analysisCacheKey);
      let repoContext: string | null | undefined = null;

      if (cachedAnalysis) {
        console.log(
          `[AI][impl-prompt] ticketId=${ticketId} reusing cached analysis, skipping GitHub context fetch`,
        );
      } else {
        const workItemContextText = [
          workItem.title,
          description,
          acceptanceCriteria,
        ]
          .filter(Boolean)
          .join("\n\n");
        repoContext = await fetchGitHubRepoContext({
          repo: cfg.githubRepo,
          token: cfg.githubToken,
          branch: cfg.githubRepoBranch,
          bugText: workItemContextText,
          maxFiles: 4,
          maxChars: 6000,
        });
      }

      const implementationPrompt = await generateImplementationPrompt({
        ticketTitle: workItem.title,
        ticketDescription: description,
        acceptanceCriteria,
        repoContext: repoContext ?? undefined,
        cachedAnalysis: cachedAnalysis ?? undefined,
        repoBranch: cfg.githubRepoBranch,
        anthropicKey: cfg.anthropicKey,
        anthropicModel: cfg.anthropicModel,
        additionalGuidance,
      });

      setCachedPrompt(promptCacheKey, implementationPrompt);
      console.log(
        `[AI][impl-prompt] ticketId=${ticketId} model=${cfg.anthropicModel} elapsedMs=${elapsedMs(requestStart)}`,
      );

      res.json({
        generatedAt: new Date().toISOString(),
        ticketId,
        implementationPrompt,
      });
    } catch (err) {
      console.log("ERR -> ", err);
      const message = serializeError(err);
      res.status(500).json({ error: message });
    }
  },
);

app.listen(port, () => {
  console.log(`BugTracer API running on http://localhost:${port}`);
});
