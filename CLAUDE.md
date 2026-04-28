# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BugTracer is a two-tier web app that pulls work items from Azure DevOps (TFS), enriches them with recent GitHub commits, and runs AI triage via the Anthropic Claude API. It supports two work item categories: **bugs** and **user stories**.

## Commands

### Backend

```bash
cd backend
npm install
npm run dev       # TypeScript watch mode via tsx
npm run build     # Compile to dist/
npm start         # Run compiled output
```

### Frontend

```bash
cd frontend
npm install
npm run dev       # Vite dev server (proxies /api → localhost:4000)
npm run build     # TypeScript check + Vite production build
npm run preview   # Serve production build locally
```

### Running the full stack

Start backend first (`npm run dev` in `backend/`), then frontend (`npm run dev` in `frontend/`). The Vite dev server proxies `/api` requests to port 4000.

## Environment Setup

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Required | Notes |
|---|---|---|
| `ADO_ORG` | Yes | Azure org name or full base URL (for on-prem TFS use full URL) |
| `ADO_PROJECT` | Yes | Azure DevOps project name |
| `ADO_PAT` | Yes | Azure DevOps Personal Access Token |
| `GITHUB_REPO` | Yes | `owner/repo` or full GitHub URL |
| `GITHUB_REPO_BRANCH` | Yes | Branch for commit/context reads |
| `ANTHROPIC_KEY` | Yes | Anthropic API key |
| `GITHUB_TOKEN` | No | Recommended for private repos |
| `ADO_DAYS` | No | Days back to query (default: 7) |
| `ADO_TOP` | No | Max tickets returned (default: 10) |
| `ADO_STATES` | No | Comma-separated states (default: `New,Active`) |
| `ADO_AREA_PATH` | No | Azure area path filter |
| `API_PORT` | No | Backend port (default: 4000) |
| `ANTHROPIC_MODEL` | No | Claude model (default: `claude-sonnet-4-6`) |

## Architecture

### Data Flow

```
Frontend (React/Vite) → Express API (port 4000) → Azure DevOps REST API
                                                  → GitHub REST API (Octokit)
                                                  → Anthropic Claude API
```

### Backend (`backend/src/`)

- **`server.ts`** — Express routes, in-memory cache (15-min TTL), and the two-stage analysis orchestrator. All business logic coordination lives here.
- **`ado.ts`** — Azure DevOps integration. Uses WIQL queries with Basic auth (PAT). Supports both cloud (`dev.azure.com`) and on-premise TFS via full base URL. Maps ADO fields → internal `Ticket` type (including `TCM.ReproSteps` and `Microsoft.VSTS.Common.AcceptanceCriteria`).
- **`github.ts`** — GitHub integration via Octokit. Fetches recent commits and, for deep-pass analysis, scores and fetches relevant repo files by matching ticket keywords/path hints against the git tree. Concurrency-limited to 8 parallel blob fetches.
- **`ai.ts`** — Anthropic SDK integration. Builds category-specific prompts (bugs vs. user stories), parses JSON responses with regex fallback. Returns structured `AIAnalysis` objects. Also exposes `generateImplementationPrompt()` for user story prompt generation (max 1 800 output tokens).
- **`config.ts`** — Single source of truth for all env var reads. Always import config from here, never read `process.env` directly elsewhere.
- **`types.ts`** — Shared TypeScript types for `Ticket`, `AIAnalysis`, `AnalysisResult`, etc.
- **`rank.ts`** — Commit relevance scoring. Tokenizes ticket text and scores commits by keyword overlap, filename matches, bug ID references, and merge-commit penalties.
- **`text.ts`** — HTML stripping (`stripHtmlToText`), whitespace normalization, and truncation helpers used when mapping ADO fields.
- **`http.ts`** — Fetch wrapper (`httpJson`) with structured error chain extraction; also provides `basicPatAuthHeader` for Azure PAT encoding.

### Two-Stage AI Analysis

Every `/api/{category}/:id/analysis` request runs:
1. **Fast pass** — 8 recent commits, no repo file context. If Claude's confidence is high, return immediately.
2. **Deep pass** (only if fast pass is weak) — 12 commits + up to 4 scored repo files (max 6KB each). Results are cached under a composite key: `[category, ticketId, branchHeadSHA, model, ticketFingerprint]`.

### API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/bugs` | List recent bugs. Optional `?ticketId=123` to filter to one. |
| GET | `/api/bugs/:id/analysis` | AI analysis for a specific bug. |
| GET | `/api/user-stories` | List recent user stories. Optional `?ticketId=123`. |
| GET | `/api/user-stories/:id/analysis` | AI analysis for a specific user story. |
| GET | `/api/user-stories/:id/implementation-prompt` | Generate an AI coding-assistant prompt for a user story. Optional `?additionalGuidance=`. |

### Frontend (`frontend/src/`)

- **`App.tsx`** — Root component with manual client-side routing (no router library). Routes: `/` (home), `/bugs`, `/bugs/analyze/:id`, `/user-stories`, `/user-stories/analyze/:id`.
- **`hooks/useBugs.ts`** — Central state hook. Manages ticket list, analysis state, implementation prompt state, abort controllers, and auto-triggers analysis when a single ticket is fetched by ID.
- **`services/api.ts`** — Typed fetch wrapper for all backend calls.
- **`components/bug/`** — `BugList → BugCard → (BugDetails + AIAnalysis + ImplementationPrompt)` component tree. `AIAnalysis` renders the nested JSON analysis result; `ImplementationPrompt` shows a generate/copy UI for user stories.
- **`components/search/SearchBar.tsx`** — Accepts a ticket ID or leaves blank to list recent tickets; has a stop/cancel button for in-flight requests.
- **`components/layout/`** — `Layout` wrapper and `Header` navigation component.
- **`components/common/`** — `EmptyState` and `ErrorMessage` shared display components.
- **`types/index.ts`** — Frontend API types mirroring backend response shapes.
- **`utils/formatters.ts`** — Date and text formatting helpers.

### Work Item Type Mapping

The backend category `"bugs"` queries ADO for types `Bug` and `Defect`. The category `"user-stories"` queries for type `User Story`. This mapping is in `server.ts`.

### Implementation Prompt Generation

`GET /api/user-stories/:id/implementation-prompt` (optional `?additionalGuidance=`) reuses a cached analysis if available — otherwise runs the full two-stage analysis first — then calls Claude to produce a structured prompt (max 1 800 tokens) ready to paste into an AI coding assistant. The result is cached under the same composite key as analysis.

### Sparse Ticket Guard

In `ai.ts`, user stories with fewer than 80 combined characters or fewer than 12 words in their description + acceptance criteria return `status: "not-enough-data"` without calling the Claude API.
