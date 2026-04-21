# BugTracer

BugTracer is an Azure DevOps and GitHub analysis tool that helps teams inspect newly logged Bugs, Defects, and User Stories with AI-assisted reasoning.

The current product supports two main workflows:
- Bugs page: fetches Azure DevOps work items of type `Bug` and `Defect`, then analyzes likely causes and related recent commits.
- User Stories page: fetches Azure DevOps work items of type `User Story`, then analyzes likely implementation approach, impacted areas, and dependencies.

## Current Highlights

- Separate UI flows for Bugs and User Stories
- Welcome page with direct navigation to each category
- Route-based deep links:
  - `/`
  - `/bugs`
  - `/bugs/analyze/:id`
  - `/user-stories`
  - `/user-stories/analyze/:id`
- Azure DevOps filtering driven by config values in `backend/.env`
- Anthropic-powered AI analysis using live GitHub repository context
- Fast-first analysis flow with deep repository context only when needed
- In-memory analysis caching keyed by ticket content, branch head, and model
- Timing logs for commit fetch, repo-context fetch, model calls, and total analysis time

## Features

### Azure DevOps Work Item Support
- Fetches `Bug` and `Defect` items for the Bugs page
- Fetches `User Story` items for the User Stories page
- Uses WIQL filters based on the configured area path, states, days, and top count

### AI-Powered Analysis
- Bug analysis focuses on likely cause, suspect commits, and next investigation steps
- User Story analysis focuses on implementation approach, impacted areas, and dependencies
- If a user story does not have enough description or acceptance-criteria data, the API returns `not-enough-data` instead of forcing an AI call

### Performance-Oriented Backend
- Separate list endpoints and analysis endpoints
- Two-stage analysis pipeline:
  - fast pass without repo snippets
  - deep pass with GitHub repo context only when the fast result is weak
- Reduced GitHub repo-context scanning scope
- Concurrency-limited GitHub blob fetching
- In-memory cache for repeated ticket analysis

### Frontend UX
- Welcome page with category navigation
- Search by ticket ID within each category page
- Independent loading and error states for list fetches and AI analysis
- Deep-link support for ticket analysis pages

## Project Structure

```text
bug-tracer/
├── backend/
│   ├── package.json
│   └── src/
│       ├── ado.ts          # Azure DevOps WIQL queries and work item mapping
│       ├── ai.ts           # Anthropic prompt building and AI result normalization
│       ├── config.ts       # Environment/config loader
│       ├── github.ts       # GitHub commit fetching and repo-context extraction
│       ├── http.ts         # Shared HTTP helpers
│       ├── rank.ts         # Legacy heuristic ranking helper
│       ├── server.ts       # Express API routes and analysis orchestration
│       ├── text.ts         # Text cleanup and truncation helpers
│       └── types.ts        # Backend domain types
├── frontend/
│   ├── ARCHITECTURE.md
│   ├── package.json
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── styles.css
│       ├── components/
│       │   ├── bug/
│       │   │   ├── AIAnalysis.tsx
│       │   │   ├── BugCard.tsx
│       │   │   ├── BugDetails.tsx
│       │   │   └── BugList.tsx
│       │   ├── common/
│       │   │   ├── EmptyState.tsx
│       │   │   └── ErrorMessage.tsx
│       │   ├── layout/
│       │   │   ├── Header.tsx
│       │   │   └── Layout.tsx
│       │   └── search/
│       │       └── SearchBar.tsx
│       ├── hooks/
│       │   └── useBugs.ts  # Category-aware ticket loading hook
│       ├── services/
│       │   └── api.ts
│       ├── types/
│       │   └── index.ts
│       └── utils/
│           └── formatters.ts
├── .github/
│   └── copilot-instructions.md
├── CONTRIBUTING.md
├── DEVELOPMENT.md
└── README.md
```

## Architecture Chart

```mermaid
flowchart LR
    UI[Browser UI] --> FE[React + Vite Frontend]
    FE -->|List and analysis requests| API[Express Backend API]

    API -->|WIQL + work item fetch| ADO[Azure DevOps / TFS]
    API -->|Recent commits| GHCommits[GitHub Commits API]
    API --> Cache[(In-memory Analysis Cache)]
    API -->|Deep pass only when needed| GHContext[GitHub Tree and Blob APIs]
    API --> AI[Anthropic Claude]

    ADO --> API
    GHCommits --> API
    GHContext --> API
    Cache --> API
    AI --> API

    FE -->|Routes| Routes[/, /bugs, /bugs/analyze/:id, /user-stories, /user-stories/analyze/:id]
```

## How It Works

### 1. Ticket List Fetch

The frontend loads one of two list endpoints:
- `GET /api/bugs`
- `GET /api/user-stories`

Both endpoints use the same configured Azure DevOps filters from `backend/.env`:
- `ADO_DAYS`
- `ADO_TOP`
- `ADO_STATES`
- `ADO_AREA_PATH`

Only the Azure DevOps work item type changes by category:
- Bugs page: `Bug`, `Defect`
- User Stories page: `User Story`

### 2. Ticket Analysis Fetch

When the user opens a ticket detail page, the frontend calls one of:
- `GET /api/bugs/:ticketId/analysis`
- `GET /api/user-stories/:ticketId/analysis`

The backend then:
1. Reads the current Azure DevOps work item
2. Normalizes description, repro steps, and acceptance criteria
3. Fetches recent commits from the configured GitHub branch
4. Runs a fast AI pass without deep repo snippets
5. Fetches GitHub repo context only if the fast result needs more signal
6. Runs a deep AI pass only when necessary
7. Caches the final result in memory

### 3. Cache Behavior

Analysis cache keys include:
- work item category
- ticket id
- GitHub branch head SHA
- selected Anthropic model
- a fingerprint of the current work item content

That means the cache invalidates naturally when:
- the ticket description changes
- acceptance criteria change
- repro steps change
- title or state changes
- the branch head changes
- the selected model changes

## API Endpoints

### Bugs

```bash
# List recent bugs and defects
curl http://localhost:4000/api/bugs

# Load a specific bug/defect by ID
curl "http://localhost:4000/api/bugs?ticketId=12345"

# Run AI analysis for a specific bug/defect
curl http://localhost:4000/api/bugs/12345/analysis
```

### User Stories

```bash
# List recent user stories
curl http://localhost:4000/api/user-stories

# Load a specific user story by ID
curl "http://localhost:4000/api/user-stories?ticketId=12345"

# Run AI analysis for a specific user story
curl http://localhost:4000/api/user-stories/12345/analysis
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- Azure DevOps / TFS PAT with Work Item read access
- GitHub repository access
- Anthropic API key

### 1. Clone the Repository

```bash
git clone <repo-url>
cd bug-tracer
```

### 2. Configure the Backend

```bash
cp backend/.env.example backend/.env
```

Example configuration:

```env
# Azure DevOps (TFS)
ADO_ORG=my-org
ADO_PROJECT=my-project
ADO_PAT=***

# GitHub
GITHUB_REPO=https://github.com/owner/repo
GITHUB_REPO_BRANCH=main
GITHUB_TOKEN=ghp_***

# Optional Azure filters
ADO_DAYS=7
ADO_TOP=10
ADO_STATES=New,Active
ADO_AREA_PATH=My Project\\Area\\Path
GITHUB_COMMITS=50

# API server
API_PORT=4000

# Anthropic AI
ANTHROPIC_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

### 3. Install Dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 4. Start Development Servers

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`.

## Frontend Routes

- `/` - welcome page
- `/bugs` - list of Bugs and Defects
- `/bugs/analyze/:id` - bug analysis page
- `/user-stories` - list of User Stories
- `/user-stories/analyze/:id` - user story analysis page

## Configuration

### Required Environment Variables

| Variable | Description |
| --- | --- |
| `ADO_ORG` | Azure DevOps organization or full base URL |
| `ADO_PROJECT` | Azure DevOps project name |
| `ADO_PAT` | Azure DevOps PAT token |
| `GITHUB_REPO` | GitHub repo as `owner/repo` or full URL |
| `GITHUB_REPO_BRANCH` | Branch used for commit and repo-context reads |
| `ANTHROPIC_KEY` | Anthropic API key |

### Optional Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `ADO_DAYS` | `7` | Number of days of Azure DevOps tickets to query |
| `ADO_TOP` | `10` | Maximum number of list results |
| `ADO_STATES` | `New,Active` | Azure DevOps states to include |
| `ADO_AREA_PATH` | unset | Optional Azure area-path filter |
| `GITHUB_TOKEN` | unset | Recommended for private repos and higher GitHub API limits |
| `GITHUB_COMMITS` | `50` | Max recent commits to inspect before analysis narrowing |
| `API_PORT` | `4000` | Backend port |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` | Default model for interactive analysis |

## AI Analysis Design

### Bug Analysis Output

Bug analysis emphasizes:
- why the bug is happening
- likely issue or root cause
- related recent commits
- next investigation or fix steps

### User Story Analysis Output

User story analysis emphasizes:
- what the story is asking for
- suggested implementation approach
- likely impacted areas
- dependencies or preconditions
- implementation recommendations

### Sparse User Story Handling

If a user story does not contain enough useful description or acceptance criteria, the backend returns:

```json
{
  "analysisType": "user-story",
  "status": "not-enough-data",
  "summary": "Not enough data for AI analysis."
}
```

## Performance Notes

The current backend includes several latency optimizations:

- `claude-sonnet-4-6` as the default interactive model
- reduced repo-context candidate file count
- concurrency-limited GitHub blob fetches
- fast-pass analysis before deep repo-context collection
- in-memory result caching
- stage timing logs for easier profiling

Useful backend log lines:
- `[AI][cache]`
- `[AI][commits]`
- `[AI][model-fast]`
- `[AI][github-context]`
- `[AI][model-deep]`
- `[AI][analysis]`

## Development Commands

Backend:

```bash
cd backend
npm run dev
npm run build
npm start
```

Frontend:

```bash
cd frontend
npm run dev
npm run build
npm run preview
```

## Troubleshooting

### AI analysis is slow

Check the backend logs for:
- cache hit or miss
- commit fetch time
- repo-context fetch time
- fast-pass model time
- deep-pass model time

If deep repo context is running for most tickets, refine ticket descriptions and acceptance criteria so the fast pass has better signal.

### GitHub API issues

If the repo is private or protected by SSO/SAML, make sure `GITHUB_TOKEN` has valid access to the target repo.

### Azure DevOps list is empty

Check:
- PAT validity
- `ADO_AREA_PATH`
- `ADO_STATES`
- `ADO_DAYS`

### User story returns `not-enough-data`

That means the work item did not contain enough description or acceptance-criteria content for useful analysis. Update the Azure DevOps ticket and rerun analysis.

## Additional Docs

- [DEVELOPMENT.md](DEVELOPMENT.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [frontend/ARCHITECTURE.md](frontend/ARCHITECTURE.md)

## Tech Stack

Backend:
- Node.js
- TypeScript
- Express
- Octokit
- Anthropic SDK

Frontend:
- React 18
- Vite
- Material UI

## Resources

- [Azure DevOps REST API](https://learn.microsoft.com/en-us/rest/api/azure/devops)
- [GitHub REST API](https://docs.github.com/en/rest)
- [Anthropic API Docs](https://docs.anthropic.com/)