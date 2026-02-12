# Copilot Instructions

Project summary:
- This repo is "BugTracer" (code name: bug_tracer, version: 1.0.0) - an intelligent bug triage tool
- It has two main apps:
  - backend/: Node.js + TypeScript CLI and API server that pulls Azure DevOps (TFS) bugs and ranks GitHub commits with AI analysis
  - frontend/: Vite + React UI that calls the backend API and shows bugs + suspect commits

Key workflows:
- Backend CLI: `cd backend && npm run dev`
- Backend API: `cd backend && npm run dev:api`
- Frontend UI: `cd frontend && npm run dev`

Important config (backend/.env):
- ADO_ORG, ADO_PROJECT, ADO_PAT
- GITHUB_REPO, GITHUB_TOKEN
- Optional: ADO_AREA_PATH, ADO_DAYS, ADO_TOP, GITHUB_COMMITS, RANK_MIN_SCORE
- Optional: AI_API_KEY (Anthropic Claude for deep analysis)

Core behavior:
- Fetch Azure DevOps bugs using WIQL.
- Fetch recent GitHub commits and rank by textual similarity and bug ID references.
- When AI_API_KEY is set: analyze bugs using Claude AI with full repo context.
- UI calls `/api/bugs` with optional `bugId` query.
- MCP server (Model Context Protocol) provides GitHub repo read access for AI agents.

When editing:
- Keep backend code in backend/src and frontend code in frontend/src.
- Prefer small, focused changes and update README if commands or structure change.
