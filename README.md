# 🐛 BugTracer

An intelligent bug triage tool that analyzes Azure DevOps bugs and identifies suspect commits in GitHub using heuristic ranking and AI analysis.

## Features

✨ **Smart Bug Analysis**
- Pulls bugs from Azure DevOps/TFS with WIQL filtering
- Ranks recent GitHub commits by relevance to bug descriptions
- Token-based similarity matching with bug ID detection

🤖 **AI-Powered Insights**
- Integrates with Ollama (local, free) or Claude API (cloud, paid)
- Performs deep repository analysis to identify root causes
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
│   │   ├── index.ts      # CLI entry point
│   │   ├── server.ts     # Express API server
│   │   ├── ado.ts        # Azure DevOps integration
│   │   ├── github.ts     # GitHub API client
│   │   ├── rank.ts       # Commit ranking algorithm
│   │   ├── ai.ts         # AI analysis (Claude/Ollama)
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
├── MCP_README.md         # AI integration guide
└── README.md             # This file
```

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Azure DevOps/TFS account and PAT token
- GitHub account and PAT token
- (Optional) Docker with Ollama for local AI

### 1. Environment Setup

Clone and navigate to the repo:

```bash
git clone <repo-url>
cd bugs-agent
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
GITHUB_REPO=owner/repo
GITHUB_TOKEN=ghp_***

# Optional: AI Configuration
USE_OLLAMA=true
OLLAMA_MODEL=llama3
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
npm run dev:api
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

### CLI
```bash
cd backend
npm run dev -- --ado-org "myorg" --ado-project "myproject" --gh-repo "owner/repo"
```

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
| `GITHUB_REPO` | Repository in format `owner/repo` |
| `GITHUB_TOKEN` | GitHub PAT with repo read access |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADO_DAYS` | 30 | How many days back to look for bugs |
| `ADO_TOP` | 5 | Number of bugs to fetch |
| `ADO_AREA_PATH` | - | Filter bugs by area path |
| `GITHUB_COMMITS` | 50 | Number of recent commits to analyze |
| `RANK_MIN_SCORE` | 0.08 | Minimum score to show commits |
| `API_PORT` | 4000 | Port for API server |
| `USE_OLLAMA` | false | Use local Ollama instead of Claude |
| `OLLAMA_MODEL` | llama3 | Ollama model name |
| `OLLAMA_BASE_URL` | http://localhost:11434 | Ollama server URL |
| `AI_API_KEY` | - | Anthropic Claude API key |

## AI Analysis

### Option 1: Local AI with Ollama (Free, Recommended)

Install and run Ollama:

```bash
# macOS
brew install ollama

# Or download from https://ollama.ai
```

Configure `.env`:
```env
USE_OLLAMA=true
OLLAMA_MODEL=llama3
```

Pull a model:
```bash
ollama pull llama3
ollama serve
```

### Option 2: Claude API (Cloud, Paid)

Get an API key from https://console.anthropic.com/ and configure:

```env
AI_API_KEY=sk-ant-...
USE_OLLAMA=false
```

## Development

### Backend Development

Auto-reload API server on file changes:
```bash
cd backend
npm run dev:api
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

### Bug Analysis Pipeline

1. **Fetch Bugs**: Query Azure DevOps using WIQL with optional area path filtering
2. **Fetch Commits**: Get recent GitHub commits with file changes
3. **Ranking**: Score commits based on:
   - Token overlap with bug description (TF-IDF style)
   - Bug ID references (#12345, AB#12345)
   - Modified filenames relevance
   - Merge commit penalty
4. **AI Analysis** (optional): For single-bug queries, use AI to:
   - Read full repository context
   - Identify likely root causes
   - Suggest fixes
   - Highlight most relevant commits

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
- **AI**: Anthropic Claude SDK + Ollama HTTP API
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
Make sure you're using `npm run dev:api` (not `npm start`). The `tsx watch` command provides hot-reload.

### "Request cancelled" error
This is normal - it means you clicked the STOP button. Just search again.

### Ollama connection refused
Make sure Ollama is running:
```bash
ollama serve
```

### AI analysis not running
Check that:
1. `USE_OLLAMA=true` is set in `.env`, OR
2. `AI_API_KEY` is set in `.env`
3. API logs show which AI provider is active

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
- [MCP Protocol](https://modelcontextprotocol.io)
- [Ollama](https://ollama.ai)
- [Claude API](https://anthropic.com/docs)
