# Contributing to BugTracer

## Branch Strategy

```
master          ← production-ready, protected — PRs only
  └─ develop    ← integration branch — start all new work here
       └─ feature/your-feature
       └─ fix/your-fix
```

- **`master`** is the stable, deployable branch. Direct pushes are blocked. All changes must arrive via a pull request from `develop` (or a hotfix branch).
- **`develop`** is the shared integration branch. Clone the repo and use `develop` as your working base.

## Getting Started

```bash
git clone https://github.com/hidayat-fzkhan/bug-tracer.git
cd bug-tracer
git checkout develop
```

## Day-to-Day Workflow

### 1. Start a new feature or fix

Branch off `develop`:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature   # or fix/my-fix
```

### 2. Do your work, commit locally

```bash
git add <files>
git commit -m "describe what and why"
```

### 3. Push and open a PR against `develop`

```bash
git push -u origin feature/my-feature
```

Open a pull request on GitHub: `feature/my-feature` → `develop`.

### 4. Merging to `master`

Once `develop` is stable and ready to ship, open a PR: `develop` → `master`. Only the repo owner can approve and merge that PR.

## Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/<short-description>` | `feature/implementation-prompt-ui` |
| Bug fix | `fix/<short-description>` | `fix/ado-pat-auth-header` |
| Hotfix (master) | `hotfix/<short-description>` | `hotfix/crash-on-empty-story` |
| Chore/docs | `chore/<short-description>` | `chore/update-readme` |

## Commit Messages

Keep the subject line under 72 characters. Focus on *why*, not *what*:

```
fix: handle empty acceptance criteria before AI call

The sparse-data guard was checking character count but not word count,
letting very short one-liners through and wasting API quota.
```

## Pull Request Checklist

- [ ] Branched from `develop` (or `master` for hotfixes)
- [ ] TypeScript compiles without errors (`npm run build` in both `backend/` and `frontend/`)
- [ ] No `process.env` reads outside `backend/src/config.ts`
- [ ] No secrets or `.env` files committed
- [ ] PR description explains *what* changed and *why*
