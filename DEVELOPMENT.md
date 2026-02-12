# Development Guide

## Getting Started

This is a personal side project for bug triage automation. This guide covers development setup and common tasks.

## Development Workflow

### 1. Initial Setup

```bash
# Clone the repo
git clone <repo-url>
cd bug-tracer

# Install all dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Create environment file
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials
```

### 2. Running Development Servers

Keep these running in separate terminals:

**Terminal 1 - Backend API** (auto-reloads on changes):
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend UI** (auto-reloads on changes):
```bash
cd frontend
npm run dev
```

Open http://localhost:5173

### 3. Making Code Changes

Both backend and frontend have hot-reload enabled:
- Backend: `tsx watch` watches TypeScript files
- Frontend: Vite's dev server handles hot module replacement

Just save your changes and the servers will automatically reload!

## Architecture Overview

### Backend (`/backend`)

**Key Files:**
- `src/server.ts` - Express API server
- `src/ado.ts` - Azure DevOps integration
- `src/github.ts` - GitHub API client
- `src/ai.ts` - AI analysis (Claude/Ollama)
- `src/config.ts` - Configuration from env vars

**Key Dependencies:**
- `express` - Web framework
- `@octokit/rest` - GitHub API client
- `tsx` - TypeScript execution with watch mode
- `@anthropic-ai/sdk` - Claude API client

### Frontend (`/frontend`)

**Component Structure:**
```
src/
├── components/
│   ├── bug/              # Bug display components
│   ├── common/           # Reusable components
│   ├── layout/           # Layout structure
│   ├── search/           # Search interface
├── hooks/
│   └── useBugs.ts        # State management hook
├── services/
│   └── api.ts            # API client
├── types/
│   └── index.ts          # TypeScript types
├── utils/
│   └── formatters.ts     # Utility functions
└── App.tsx               # Root component
```

For detailed component architecture, see [frontend/ARCHITECTURE.md](frontend/ARCHITECTURE.md).

**Key Dependencies:**
- `react` - UI framework
- `vite` - Build tool
- `@mui/material` - Component library
- `typescript` - Type safety

## Common Development Tasks

### Adding a New Feature

1. **Backend Feature:**
   ```bash
   cd backend
   # Edit src/ files
   npm run build  # Check TypeScript compilation
   ```

2. **Frontend Feature:**
   ```bash
   cd frontend
   # Edit src/ files
   # Changes auto-reload in browser
   npm run build  # Check TypeScript compilation
   ```

### Debugging

**Backend:**
```bash
cd backend
npm run dev:api
# Logs appear in terminal
# Check backend/.env for configuration
```

**Frontend:**
- Open browser DevTools (F12)
- Check Console tab for errors
- Use React DevTools extension for component debugging

### Building for Production

```bash
# Build backend
cd backend
npm run build
# Output: dist/

# Build frontend
cd frontend
npm run build
# Output: dist/
```

### Testing Configuration Changes

Edit `backend/.env` and the API will auto-reload:
```env
# Examples:
ADO_DAYS=7        # Look back 7 days instead of 30
ADO_TOP=10        # Get 10 bugs instead of 5
GITHUB_COMMITS=30 # Analyze fewer commits for faster ranking
RANK_MIN_SCORE=0.15  # Hide weaker matches
```

## Troubleshooting

### Port Already in Use
If port 4000 or 5173 is already in use:

```bash
# Find and kill process
# macOS/Linux:
lsof -i :4000
kill -9 <PID>

# Or use different ports:
API_PORT=4001 npm run dev:api
VITE_PORT=5174 npm run dev
```

### TypeScript Compilation Errors
```bash
cd backend
npm run build

cd frontend
npm run build
```

### "Cannot find module" errors
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Azure DevOps Authentication Failed
- Verify `ADO_ORG`, `ADO_PROJECT`, `ADO_PAT` in `.env`
- Check PAT has "Work Items (Read)" permission
- PAT may have expired

### GitHub API Rate Limited
- You're making too many requests
- GitHub allows 60 requests/hour unauthenticated
- With token: 5000 requests/hour

## Project Standards

### Code Style
- TypeScript for type safety
- Use `const` by default
- Arrow functions preferred
- Component names PascalCase
- File names match component names

### Component Guidelines
- One component per file (unless very small)
- Props should be typed
- Keep components focused (single responsibility)
- Extract reusable logic to hooks

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes on separate branches
git commit -m "Add feature description"

# Push and create PR
git push origin feature/my-feature
```

## Performance Optimization

### Frontend
- Components already lazy-load via React
- Material-UI components tree-shake well
- Vite handles code splitting

### Backend
- Ranking algorithm: O(n*m) - optimize commit count if slow
- AI analysis: Only runs for single-bug queries
- API caching: Not implemented yet

## Next Steps for Feature Addition

1. **New Ranking Factor:** Edit `src/rank.ts`
2. **New API Endpoint:** Add route in `src/server.ts`
3. **New UI Component:** Create in `frontend/src/components/`
4. **New Configuration:** Add to `src/config.ts` and `.env`

## Resources

- [Azure DevOps API Docs](https://learn.microsoft.com/en-us/rest/api/azure/devops)
- [GitHub REST API](https://docs.github.com/en/rest)
- [Express.js Guide](https://expressjs.com/)
- [React Best Practices](https://react.dev/)
- [Material-UI Components](https://mui.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Getting Help

- Check existing code for similar patterns
- Read error messages carefully - they often point to the issue
- Use `git log` to see how things were implemented before
- Test components in isolation first

Happy coding! 🚀
