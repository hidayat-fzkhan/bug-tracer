# BugTracer Architecture

## Overview

BugTracer is a two-tier web application that pulls work items from Azure DevOps (ADO/TFS), enriches them with recent GitHub commit history, and runs AI triage via the Anthropic Claude API. It supports two work item categories: **bugs** and **user stories**.

---

## System Diagram

```
┌──────────────────────────────────────────────────────────┐
│                     Browser (React SPA)                  │
│  ┌──────────┐  ┌────────────┐  ┌───────────────────────┐ │
│  │ SearchBar│  │  BugList   │  │  AIAnalysis /         │ │
│  └──────────┘  │  BugCard   │  │  ImplementationPrompt │ │
│                └────────────┘  └───────────────────────┘ │
│                     ↕ /api/* (proxied by Vite dev server) │
└──────────────────────────────────────────────────────────┘
                          ↕ HTTP :4000
┌──────────────────────────────────────────────────────────┐
│              Express API Server (Node/TS)                 │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │  ado.ts  │  │ github.ts  │  │       ai.ts          │  │
│  │  (WIQL)  │  │ (Octokit)  │  │  (Anthropic SDK)     │  │
│  └──────────┘  └────────────┘  └──────────────────────┘  │
│         ↕              ↕                   ↕              │
└─────────┼──────────────┼───────────────────┼─────────────┘
          ↓              ↓                   ↓
   Azure DevOps      GitHub REST         Anthropic
   REST API          API                 Claude API
```

---

## Repository Layout

```
bugs_agent/
├── backend/
│   └── src/
│       ├── server.ts     — Express routes, in-memory cache, analysis orchestrator
│       ├── ado.ts        — Azure DevOps integration (WIQL queries, PAT auth)
│       ├── github.ts     — GitHub integration (commits, repo context via Octokit)
│       ├── ai.ts         — Claude API prompting and response parsing
│       ├── rank.ts       — Commit relevance scoring
│       ├── text.ts       — HTML stripping and text normalization
│       ├── http.ts       — Fetch wrapper with error chain extraction
│       ├── config.ts     — Single source of truth for env var reads
│       └── types.ts      — Shared TypeScript types
└── frontend/
    └── src/
        ├── App.tsx                        — Root component with custom SPA routing
        ├── hooks/useBugs.ts               — Central state: tickets, analysis, abort
        ├── services/api.ts                — Typed fetch wrapper for all backend calls
        ├── types/index.ts                 — Frontend API types
        ├── utils/formatters.ts            — Date/text formatting
        └── components/
            ├── layout/                    — Layout, Header
            ├── bug/                       — BugList, BugCard, BugDetails, AIAnalysis,
            │                                ImplementationPrompt
            ├── search/                    — SearchBar
            └── common/                    — EmptyState, ErrorMessage
```

---

## Backend Modules

### `server.ts` — Orchestrator

- Registers Express routes dynamically for both `bugs` and `user-stories` via `registerCategoryRoutes()`.
- Runs the **two-stage AI analysis** pipeline (see below).
- Maintains an in-memory cache with a 15-minute TTL. Cache keys are composite: `[category, ticketId, branchHeadSHA, model, ticketFingerprint]`.

### `ado.ts` — Azure DevOps

- Builds and executes WIQL queries against the ADO REST API using Basic auth (PAT).
- Supports both cloud (`dev.azure.com`) and on-premise TFS via full base URL.
- Maps ADO fields to the internal `AdoWorkItem` type, including `TCM.ReproSteps` and `Microsoft.VSTS.Common.AcceptanceCriteria`.
- Work item type mapping: `Bug`/`Defect` → `"bugs"`, `User Story` → `"user-stories"`.

### `github.ts` — GitHub

- Fetches recent commits on a branch (message, author, changed files) via Octokit.
- For deep-pass analysis, scores and fetches relevant repo files by matching ticket keywords against the git tree. Up to 8 concurrent blob fetches, capped at 4 files and 6 KB each.

### `ai.ts` — Claude

- Builds category-specific prompts (bugs vs. user stories) including work item text, commits, and optional repo snippets.
- Parses structured JSON from Claude's response, with a regex fallback for partial parses.
- Enforces a sparse-data guard for user stories: fewer than 80 characters or 12 words across description + acceptance criteria returns `status: "not-enough-data"` without calling the API.
- Max output tokens: 900 (bugs), 1 400 (user stories), 1 800 (implementation prompt).

### `rank.ts` — Commit Scoring

- Tokenizes bug/story text and scores commits by keyword overlap, filename matches, bug ID references in commit messages, and merge-commit penalties.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/bugs` | List recent bugs. Optional `?ticketId=` to filter to one. |
| GET | `/api/bugs/:id/analysis` | AI analysis for a specific bug. |
| GET | `/api/user-stories` | List recent user stories. Optional `?ticketId=`. |
| GET | `/api/user-stories/:id/analysis` | AI analysis for a specific user story. |
| GET | `/api/user-stories/:id/implementation-prompt` | Generate implementation prompt. Optional `?additionalGuidance=`. |

---

## Two-Stage AI Analysis

Every `/analysis` request runs:

```
1. Fast pass
   └─ 8 recent commits, no repo file context
   └─ If Claude confidence is high → return result (cache + respond)

2. Deep pass  (only when fast pass is weak)
   └─ 12 commits + up to 4 scored repo files (max 6 KB each)
   └─ Result cached and returned
```

The fast pass avoids the latency of repo-context fetching for straightforward tickets. The deep pass is reserved for ambiguous ones.

---

## AI Analysis Result Schema

```typescript
type AIAnalysisResult = {
  analysisType: "bug" | "user-story";
  status: "ready" | "not-enough-data";
  summary: string;
  likelyCause?: string;          // bugs only
  implementationApproach?: string; // user stories only
  suspectCommits: string[];      // up to 3 SHA prefixes
  recommendations: string[];     // 3–4 items
  importantPoints?: string[];    // up to 3 items
  impactedAreas?: string[];      // up to 4 (user stories)
  dependencies?: string[];       // up to 4 (user stories)
};
```

---

## Frontend Architecture

### Routing

No router library is used. `App.tsx` parses `window.location.pathname` on each navigation event and renders one of three views:

| URL Pattern | View |
|-------------|------|
| `/` | Home — category selection cards |
| `/{bugs\|user-stories}` | List view — search bar + ticket cards |
| `/{bugs\|user-stories}/analyze/:id` | Detail view — full analysis |

### State Management

All network state lives in the `useBugs` hook:
- Ticket list, selected ticket, analysis result, implementation prompt.
- An `AbortController` per in-flight request; cancellation is exposed via a stop button in `SearchBar`.
- Auto-triggers analysis when a single ticket is returned from a by-ID search.

### Component Tree

```
<App>
  └─ <Layout>
       ├─ <Header>
       └─ [Page Content]
            ├─ Home: category cards
            ├─ List: <SearchBar> + <BugList> → <BugCard>
            └─ Detail: <BugCard> (expanded)
                         ├─ <BugDetails>
                         ├─ <AIAnalysis>
                         └─ <ImplementationPrompt>  (user stories only)
```

### Key Libraries

| Library | Role |
|---------|------|
| React 18 | UI rendering |
| Vite | Dev server, build bundler (proxies `/api` → `:4000`) |
| Material UI v5 | Component library |
| Emotion | CSS-in-JS for MUI styling |

---

## Caching

| What | Key | TTL |
|------|-----|-----|
| Analysis result | `category + ticketId + branchHeadSHA + model + ticketFingerprint` | 15 min |
| Implementation prompt | same composite key | 15 min |
| Ticket list | `category` | 15 min |

Cache is in-process (JavaScript `Map`). There is no distributed cache layer; restarting the server clears all entries.

---

## Configuration

All env vars are read in `config.ts`. Nothing else in the codebase reads `process.env` directly.

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `ADO_ORG` | Yes | — | Org name or full TFS base URL |
| `ADO_PROJECT` | Yes | — | Project name |
| `ADO_PAT` | Yes | — | Personal Access Token |
| `GITHUB_REPO` | Yes | — | `owner/repo` or full GitHub URL |
| `GITHUB_REPO_BRANCH` | Yes | — | Branch for commits and context |
| `ANTHROPIC_KEY` | Yes | — | Anthropic API key |
| `GITHUB_TOKEN` | No | — | Recommended for private repos |
| `ADO_DAYS` | No | `7` | Look-back window |
| `ADO_TOP` | No | `10` | Max tickets returned |
| `ADO_STATES` | No | `New,Active` | Comma-separated ADO states |
| `ADO_AREA_PATH` | No | — | ADO area path filter |
| `API_PORT` | No | `4000` | Backend listen port |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-6` | Claude model ID |

---

## Data Flow: Bug Analysis

```
User types ticket ID
       ↓
useBugs.load(ticketId)
       ↓
GET /api/bugs?ticketId=X        → ado.ts fetches + maps work item
       ↓
Single result → auto-trigger
GET /api/bugs/:id/analysis
       ↓
server.ts: check cache
       ↓ (miss)
github.ts: fetch 8 recent commits
ai.ts: fast pass prompt → Claude
       ↓
Confidence high?
  Yes → cache + return
  No  → github.ts: fetch 12 commits + repo context
         ai.ts: deep pass prompt → Claude
                cache + return
       ↓
Frontend: AIAnalysis component renders result
```

## Data Flow: User Story Implementation Prompt

```
User clicks "Generate Implementation Prompt"
       ↓
GET /api/user-stories/:id/implementation-prompt
       ↓
server.ts: check prompt cache
       ↓ (miss)
Check analysis cache (reuse if available, else run analysis)
       ↓
ai.ts: build implementation prompt with analysis context
       → Claude (max 1 800 tokens)
       ↓
Cache prompt + return to frontend
       ↓
ImplementationPrompt component: display + copy button
```

---

## Security Notes

- ADO auth uses HTTP Basic with a PAT (Base64-encoded in `Authorization` header). The PAT is never forwarded to the frontend.
- GitHub requests are optionally authenticated via `GITHUB_TOKEN`; unauthenticated requests are subject to GitHub rate limits (60 req/hr).
- The Anthropic API key is backend-only and never exposed to the client.
- CORS is enabled on the Express server for local development; tighten for production.
