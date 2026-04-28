# Copilot Instructions

Project summary:
- This repo is "DevLens" (code name: devlens, version: 1.0.0) - an AI-powered work item analysis tool for Azure DevOps bugs and user stories
- It has two main apps:
  - backend/: Node.js + TypeScript API server that pulls Azure DevOps (TFS) work items and analyzes them with AI
  - frontend/: Vite + React UI that calls the backend API and shows bugs, user stories, suspect commits, and implementation guidance

Key workflows:
- Backend API: `cd backend && npm run dev`
- Frontend UI: `cd frontend && npm run dev`

Important config (backend/.env):
- ADO_ORG, ADO_PROJECT, ADO_PAT
- GITHUB_REPO, GITHUB_REPO_BRANCH, ANTHROPIC_KEY
- Optional: GITHUB_TOKEN, ADO_AREA_PATH, ADO_DAYS, ADO_TOP, GITHUB_COMMITS

Core behavior:
- Fetch Azure DevOps bugs using WIQL.
- Fetch recent GitHub commits with file changes.
- Read live code from the configured GitHub repository branch and analyze bugs using Anthropic Claude.
- UI calls `/api/bugs` with optional `bugId` query.

When editing:
- Keep backend code in backend/src and frontend code in frontend/src.
- Prefer small, focused changes and update README if commands or structure change.
