import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";
import { Octokit } from "@octokit/rest";
import { loadConfig } from "../config.js";

const config = loadConfig();
const octokit = new Octokit({ auth: config.githubToken });

function parseRepo(repo: string): { owner: string; repo: string } {
  const [owner, name] = repo.split("/");
  if (!owner || !name) throw new Error(`Invalid repo format: ${repo}`);
  return { owner, repo: name };
}

const tools: Tool[] = [
  {
    name: "read_file",
    description: "Read the contents of a file from the GitHub repository",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the file in the repository"
        },
        ref: {
          type: "string",
          description: "Git ref (branch, tag, or commit SHA). Defaults to default branch"
        }
      },
      required: ["path"]
    }
  },
  {
    name: "list_directory",
    description: "List contents of a directory in the GitHub repository",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the directory (empty for root)"
        },
        ref: {
          type: "string",
          description: "Git ref (branch, tag, or commit SHA). Defaults to default branch"
        }
      },
      required: []
    }
  },
  {
    name: "search_code",
    description: "Search for code in the repository",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "get_commit",
    description: "Get details of a specific commit",
    inputSchema: {
      type: "object",
      properties: {
        sha: {
          type: "string",
          description: "Commit SHA"
        }
      },
      required: ["sha"]
    }
  },
  {
    name: "list_commits",
    description: "List recent commits in the repository",
    inputSchema: {
      type: "object",
      properties: {
        count: {
          type: "number",
          description: "Number of commits to retrieve (max 100)"
        },
        path: {
          type: "string",
          description: "Only commits containing this file path"
        }
      },
      required: []
    }
  }
];

const server = new Server(
  {
    name: "bugs-agent-mcp",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { owner, repo } = parseRepo(config.githubRepo);

  try {
    switch (request.params.name) {
      case "read_file": {
        const { path, ref } = request.params.arguments as { path: string; ref?: string };
        const response = await octokit.repos.getContent({
          owner,
          repo,
          path,
          ref
        });

        if (Array.isArray(response.data) || response.data.type !== "file") {
          throw new Error(`Path ${path} is not a file`);
        }

        const content = Buffer.from(response.data.content, "base64").toString("utf-8");
        return {
          content: [
            {
              type: "text",
              text: content
            }
          ]
        };
      }

      case "list_directory": {
        const { path = "", ref } = request.params.arguments as { path?: string; ref?: string };
        const response = await octokit.repos.getContent({
          owner,
          repo,
          path,
          ref
        });

        const items = Array.isArray(response.data) ? response.data : [response.data];
        const listing = items.map((item) => `${item.type === "dir" ? "📁" : "📄"} ${item.name}`).join("\n");

        return {
          content: [
            {
              type: "text",
              text: listing
            }
          ]
        };
      }

      case "search_code": {
        const { query } = request.params.arguments as { query: string };
        const response = await octokit.search.code({
          q: `${query} repo:${owner}/${repo}`
        });

        const results = response.data.items
          .slice(0, 20)
          .map((item) => `${item.path} (${item.score})`)
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: results || "No results found"
            }
          ]
        };
      }

      case "get_commit": {
        const { sha } = request.params.arguments as { sha: string };
        const response = await octokit.repos.getCommit({
          owner,
          repo,
          ref: sha
        });

        const commit = response.data;
        const files = commit.files?.map((f) => `${f.status}: ${f.filename}`).join("\n") || "";

        return {
          content: [
            {
              type: "text",
              text: `Commit: ${commit.sha}\nAuthor: ${commit.commit.author?.name}\nDate: ${commit.commit.author?.date}\nMessage: ${commit.commit.message}\n\nFiles:\n${files}`
            }
          ]
        };
      }

      case "list_commits": {
        const { count = 20, path } = request.params.arguments as { count?: number; path?: string };
        const response = await octokit.repos.listCommits({
          owner,
          repo,
          per_page: Math.min(100, count),
          path
        });

        const commits = response.data
          .map((c) => `${c.sha.slice(0, 8)} - ${c.commit.message.split("\n")[0]}`)
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: commits
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        {
          type: "text",
          text: `Error: ${message}`
        }
      ],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Bugs Agent MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
