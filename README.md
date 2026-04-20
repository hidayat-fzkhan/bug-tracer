# 🐛 BugTracer

An intelligent bug triage tool that analyzes Azure DevOps bugs and identifies suspect commits in GitHub using heuristic ranking and AI analysis.

## Features

✨ **Smart Bug Analysis**
- Pulls bugs from Azure DevOps/TFS with WIQL filtering
- Ranks recent GitHub commits by relevance to bug descriptions
- Token-based similarity matching with bug ID detection

🤖 **AI-Powered Insights**
- Uses Anthropic Claude with live GitHub branch context
- Reads relevant repository code from GitHub to identify root causes
- Provides actionable recommendations for fixing bugs

🎨 **Intuitive Web UI**
- Built with React + Material-UI
- Search bugs by ID
- Real-time loading with abort capability
- View AI analysis and suspect commits in one place

⚡ **Developer Friendly**
- Auto-reloading API server (`tsx watch`)
- TypeScript throughout
- Clean component architecture
- Comprehensive configuration

## Project Structure

```
bug-tracer/
├── backend/              # Node.js + Express API server
│   ├── src/
│   │   ├── server.ts     # Express API server
│   │   ├── ado.ts        # Azure DevOps integration
│   │   ├── github.ts     # GitHub API client
│   │   ├── ai.ts         # AI analysis (Anthropic Claude)
│   │   └── config.ts     # Configuration loader
│   └── package.json
│
├── frontend/             # Vite + React web UI
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API services
│   │   ├── utils/        # Utility functions
│   │   └── App.tsx       # Root component
│   └── package.json
│   └── package.json
│
├── .github/
│   └── copilot-instructions.md
│
└── README.md             # This file
```

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Azure DevOps/TFS account and PAT token
- GitHub repository access
- Anthropic API key

### 1. Environment Setup

Clone and navigate to the repo:

```bash
git clone <repo-url>
cd bug-tracer
```

Create `.env` files:

```bash
# Backend configuration
cp backend/.env.example backend/.env
```

Configure `backend/.env`:

```env
# Azure DevOps
ADO_ORG=your-org
ADO_PROJECT=your-project
ADO_PAT=***
ADO_AREA_PATH="Your\\Area\\Path"

# GitHub
GITHUB_REPO=https://github.com/owner/repo
GITHUB_REPO_BRANCH=main
GITHUB_TOKEN=ghp_***

# Anthropic AI
ANTHROPIC_KEY=sk-ant-...
```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 3. Run Development Servers

**Terminal 1 - API Server** (with auto-reload):
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend UI** (with auto-reload):
```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser! 🚀

## Usage

### Web UI
1. Open http://localhost:5173
2. Search for a bug by ID (e.g., 2689652)
3. Click Search to fetch bug details and AI analysis
4. Click the STOP button to abort ongoing requests

### API Server
The backend API runs on `http://localhost:4000`:

```bash
# Get recent bugs
curl http://localhost:4000/api/bugs

# Get specific bug with AI analysis
curl http://localhost:4000/api/bugs?bugId=12345
```

## Configuration

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `ADO_ORG` | Azure DevOps organization (e.g., `myorg` for `dev.azure.com/myorg`) |
| `ADO_PROJECT` | Azure DevOps project name |
| `ADO_PAT` | PAT token with Work Items read access |
| `GITHUB_REPO` | GitHub repository URL or `owner/repo` |
| `GITHUB_REPO_BRANCH` | Branch to read live code from |
| `ANTHROPIC_KEY` | Anthropic Claude API key |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADO_DAYS` | 7 | How many days back to look for bugs |
| `ADO_TOP` | 10 | Number of bugs to fetch |
| `ADO_STATES` | `New,Active` | Bug states to fetch |
| `ADO_AREA_PATH` | - | Filter bugs by area path |
| `GITHUB_TOKEN` | - | Optional GitHub token for private repos or higher rate limits |
| `GITHUB_COMMITS` | 50 | Number of recent commits to pass into AI alongside repo code context |
| `API_PORT` | 4000 | Port for API server |

## AI Analysis

BugTracer uses Anthropic Claude for AI-driven investigation.

Configure `.env`:

```env
ANTHROPIC_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-7-sonnet-latest
GITHUB_REPO=https://github.com/owner/repo
GITHUB_REPO_BRANCH=main
```

How AI gets code access:
- The backend reads the live GitHub repository tree from `GITHUB_REPO`
- It fetches relevant files from `GITHUB_REPO_BRANCH`
- It extracts bounded code snippets related to the bug text
- Those snippets are sent to Anthropic together with bug details and recent commits

## Development

### Backend Development

Auto-reload API server on file changes:
```bash
cd backend
npm run dev
```

TypeScript compilation:
```bash
npm run build
```

### Frontend Development

Auto-reload UI on file changes:
```bash
cd frontend
npm run dev
```

See [frontend/ARCHITECTURE.md](frontend/ARCHITECTURE.md) for component structure details.

## How It Works

### Data Flow Overview

BugTracer connects to both Azure DevOps and GitHub to correlate bugs with code changes:

```
┌─────────────────┐         ┌──────────────────┐
│ Azure DevOps    │         │    GitHub        │
│   Work Items    │         │   Commits API    │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         │ WIQL Query                │ REST API
         │                           │
         ▼                           ▼
    ┌────────────────────────────────────┐
    │       BugTracer Backend API        │
    │                                    │
    │  1. Fetch Bugs                     │
    │  2. Fetch Commits                  │
    │  3. AI Analysis (Anthropic)        │
    └──────────────┬─────────────────────┘
                   │
                   │ JSON API
                   ▼
         ┌─────────────────┐
         │  React Web UI   │
         │  (localhost:5173)│
         └─────────────────┘
```

### Step-by-Step Process

#### 1. **Fetching Bugs from Azure DevOps**

**What happens:**
- Backend uses Azure DevOps REST API with Basic authentication (PAT token)
- Constructs a WIQL (Work Item Query Language) query
- Filters by: State, Area Path, Creation Date

**Example WIQL Query:**
```sql
SELECT [System.Id], [System.Title], [System.State]
FROM WorkItems
WHERE [System.WorkItemType] = 'Bug'
  AND [System.AreaPath] UNDER 'YourProject\\Area'
  AND [System.CreatedDate] > @Today - 30
ORDER BY [System.CreatedDate] DESC
```

**API Call:**
```typescript
// backend/src/ado.ts
POST https://dev.azure.com/{organization}/{project}/_apis/wit/wiql?api-version=7.0
Authorization: Basic {base64(username:PAT)}

// Returns bug IDs, then fetch full details:
GET https://dev.azure.com/{organization}/{project}/_apis/wit/workitems/{id}
```

**Retrieved Data:**
- Bug ID (e.g., 2689652)
- Title, Description, Repro Steps
- State (New, Active, Resolved)
- Assigned To, Area Path, Tags
- Created Date, Web URL

#### 2. **Fetching Commits from GitHub**

**What happens:**
- Backend uses GitHub REST API via Octokit client
- Fetches recent commits from the configured branch
- Includes file changes for each commit

**API Call:**
```typescript
// backend/src/github.ts
GET https://api.github.com/repos/{owner}/{repo}/commits
Authorization: Bearer {GITHUB_TOKEN}
?per_page=50&sha=main

// For each commit, fetch files:
GET https://api.github.com/repos/{owner}/{repo}/commits/{sha}
```

**Retrieved Data:**
- Commit SHA (e.g., a1b2c3d4)
- Commit message
- Author name and date
- List of changed files with paths
- GitHub web URL

#### 3. **AI Analysis Process**

**When triggered:** User searches for a specific bug ID in the UI

**What happens:**

```typescript
// 1. Send context to Anthropic Claude
const aiInput = {
  bugTitle: "Application crashes on login",
  bugDescription: "Steps to reproduce: 1. Open app 2. Enter credentials...",
  reproSteps: "User reports crash when...",
  repoBranch: "main",
  repoContext: "File: src/auth/login.ts\n...",
  recentCommits: [
    {
      sha: "a1b2c3d4",
      message: "Fix auth validation",
      files: ["src/auth/login.ts", "src/utils/validator.ts"]
    },
    // ... last 30 commits
  ]
}

// 2. AI analyzes and returns structured response
const aiResponse = {
  summary: "The bug is caused by null pointer in authentication...",
  likelyCause: "Missing validation in login.ts line 42",
  suspectCommits: ["a1b2c3d4", "e5f6g7h8"],  // SHAs of likely culprits
  recommendations: [
    "Add null check in validateCredentials()",
    "Update unit tests for edge cases"
  ]
}
```

Anthropic reviews:
- The Azure DevOps bug title, description, and repro steps
- Recent GitHub commits from the configured branch
- Relevant code snippets fetched live from the repository branch

#### 4. **Data Enrichment & Response**

**Backend enriches AI commits with GitHub URLs:**
```typescript
// Match AI-returned SHA prefixes to full commit objects
const enrichedCommits = aiResult.suspectCommits.map(shaPrefix => {
  const commit = commits.find(c => c.sha.startsWith(shaPrefix));
  return {
    sha: shaPrefix,
    url: commit?.htmlUrl  // https://github.com/owner/repo/commit/{sha}
  }
});
```

**API Response to Frontend:**
```json
{
  "generatedAt": "2026-02-12T10:30:00Z",
  "bugs": [
    {
      "id": 2689652,
      "title": "Application crashes on login",
      "state": "Active",
      "webUrl": "https://dev.azure.com/org/project/_workitems/edit/2689652",
      "summary": "User reports crash when entering invalid credentials...",
      "aiAnalysis": {
        "summary": "Null pointer exception in auth validation",
        "likelyCause": "Missing null check in login.ts",
        "suspectCommits": [
          {
            "sha": "a1b2c3d4",
            "url": "https://github.com/owner/repo/commit/a1b2c3d4..."
          }
        ],
        "recommendations": ["Add null check", "Update tests"]
      }
    }
  ]
}
```

### Authentication & Tokens

**Azure DevOps PAT (Personal Access Token):**
- Created in: Azure DevOps → User Settings → Personal Access Tokens
- Permissions needed: **Work Items (Read)**
- Used as: `Authorization: Basic {base64(":PAT")}`

**GitHub PAT (Personal Access Token):**
- Created in: GitHub → Settings → Developer Settings → Personal Access Tokens
- Permissions needed: **repo (read)** for private repositories
- Optional for public repositories, but recommended to avoid low rate limits
- Used as: `Authorization: Bearer {TOKEN}`

**Anthropic API Key:**
- Created in: Anthropic Console
- Used to call Claude for bug analysis
- Stored in: `ANTHROPIC_KEY`

### Configuration Flow

```
.env file
    ↓
config.ts (loadConfig)
    ↓
├── ado.ts (fetchBugs)
├── github.ts (fetchCommits)
└── ai.ts (analyzeWithAI)
    ↓
server.ts (Express API)
    ↓
Frontend (React UI)
```

### Rate Limits & Performance

**Azure DevOps:**
- Standard: No published rate limits for authenticated requests
- Typical response: 200-500ms per request

**GitHub API:**
- Authenticated: 5,000 requests/hour
- Fetching commits and repository snippets increases API usage
- Typical response: 100-300ms per request

**AI Analysis:**
- Claude API: 3-8 seconds depending on prompt size
- Only runs for single-bug queries to avoid slowdowns

### Ranking Algorithm

```typescript
score = tokenOverlap + bugIdBoost + filenameScore - mergePenalty
```

- Token overlap: Similarity between bug text and commit message
- Bug ID boost: +0.6 if commit message references the bug number
- Filename score: +0.08 for each matching file
- Merge penalty: 0.6x multiplier for merge commits

## Architecture

### Backend Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **APIs**: Azure DevOps REST, GitHub REST via Octokit
- **AI**: Anthropic Claude SDK
- **Type Safety**: TypeScript with strict mode

### Frontend Stack
- **Framework**: React 18.3
- **Build Tool**: Vite
- **UI**: Material-UI (MUI)
- **HTTP**: Fetch API with AbortController
- **Architecture**: Component-based with custom hooks

See [frontend/ARCHITECTURE.md](frontend/ARCHITECTURE.md) for fine-grained details.

## Troubleshooting

### API server not reloading on changes
Make sure you're using `npm run dev` (not `npm start`). The `tsx watch` command provides hot-reload.

### "Request cancelled" error
This is normal - it means you clicked the STOP button. Just search again.

### AI analysis not running
Check that:
1. `ANTHROPIC_KEY` is set in `.env`
2. `GITHUB_REPO` and `GITHUB_REPO_BRANCH` are set correctly
3. API logs show the `[AI][github-context]` line

### Empty bugs list
1. Verify Azure DevOps credentials and bug visibility
2. Check that `ADO_AREA_PATH` (if set) is correct
3. Increase `ADO_DAYS` to look further back

## Performance Notes

- **Commits analyzed**: Default 50, configurable via `GITHUB_COMMITS`
- **AI analysis timeout**: Runs only for single-bug queries to avoid slowdowns
- **Ranking**: Usually instant (< 100ms)
- **UI responsiveness**: Use STOP button to cancel long-running requests

## Contributing

This is a personal side project. Feel free to fork and customize!

Suggestions for improvement:
- Add support for more issue trackers (Jira, Linear, etc.)
- Implement ranking refinement UI
- Add bug assignment workflows
- Export reports as PDF

## License

Personal project - adjust as needed.

## Resources

- [Azure DevOps REST API](https://learn.microsoft.com/en-us/rest/api/azure/devops)
- [GitHub REST API](https://docs.github.com/en/rest)
- [Claude API](https://anthropic.com/docs)
