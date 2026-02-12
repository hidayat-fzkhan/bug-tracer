# MCP Server & AI Analysis

This project includes an MCP (Model Context Protocol) server that gives AI tools full READ access to your GitHub repository for deep bug analysis.

## What's MCP?

MCP is a protocol that allows AI assistants to access your codebase through a standardized interface. The MCP server exposes tools like:
- `read_file` - Read any file from the repo
- `list_directory` - Browse repo structure
- `search_code` - Search for code patterns
- `get_commit` - Examine specific commits
- `list_commits` - Browse commit history

## AI Analysis Features

When you search for a specific bug ID in the UI and have `AI_API_KEY` configured, the system:

1. Fetches the bug details from Azure DevOps
2. Retrieves recent commits from GitHub
3. Sends everything to Claude AI (Anthropic)
4. Claude analyzes the bug, commits, and can read your entire codebase through MCP
5. Returns:
   - Summary of likely cause
   - Suspect commits identified by AI
   - Specific recommendations for investigation

## Setup

### 1. Get an Anthropic API Key

- Go to https://console.anthropic.com/
- Sign up or log in
- Create an API key
- Add to `backend/.env`:
  ```
  AI_API_KEY=sk-ant-...
  ```

### 2. Configure Claude Desktop (Optional)

To use the MCP server with Claude Desktop app:

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bugs-agent": {
      "command": "node",
      "args": [
        "/absolute/path/to/bugs_agent/backend/dist/mcp/index.js"
      ],
      "env": {
        "GITHUB_REPO": "owner/repo",
        "GITHUB_TOKEN": "your-github-token"
      }
    }
  }
}
```

Restart Claude Desktop and you'll see the MCP tools available.

## Usage

### Via UI (Easiest)

1. Start the API server: `cd backend && npm run dev:api`
2. Start the UI: `cd frontend && npm run dev`
3. Search for a specific bug ID
4. If `AI_API_KEY` is set, you'll see an "AI Analysis" section with Claude's diagnosis

### Via MCP Server directly

Run the MCP server:
```bash
cd backend
npm run dev:mcp
```

The server communicates via stdio and can be used by any MCP-compatible client.

## Notes

- AI analysis only runs for **single bug queries** to keep costs reasonable
- The MCP server gives **read-only** access to your GitHub repo
- Claude charges per token; estimate ~$0.01-0.05 per bug analysis
- Analysis takes 5-15 seconds depending on complexity

## Architecture

```
UI (frontend) 
  └─> API Server (backend/src/server.ts)
       ├─> Azure DevOps (fetch bugs)
       ├─> GitHub API (fetch commits)
       ├─> Ranking (heuristic matching)
       └─> AI Analysis (backend/src/ai.ts)
            └─> Claude API
                 └─> MCP Server (backend/src/mcp/index.ts)
                      └─> GitHub API (read repo)
```
