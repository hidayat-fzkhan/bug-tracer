# Future Scope

Planned improvements and feature ideas for BugTracer.

---

## 1. Repo and Azure Team Configuration from the UI

Currently, GitHub repos and Azure DevOps team/area settings are configured entirely through `backend/.env`. There is no way to change them without restarting the server.

**Proposed work:**
- Add a Settings page in the frontend where users can add, edit, and remove GitHub repositories and Azure DevOps teams/area paths.
- Store configuration in a persistent layer (e.g., a local JSON file or a lightweight database) so changes survive server restarts.
- Allow per-category repo overrides — for example, point the Bugs page at one repo and the User Stories page at another.
- Validate connections on save (test the ADO PAT and GitHub token before persisting).

---

## 2. Developer-Friendly Context Section on Ticket Analysis

When a developer picks up a ticket, they currently have to figure out on their own what tools, repos, and access they need. The AI analysis result should surface this directly.

**Proposed work:**
- Extend the AI analysis output with a **Developer Onboarding** section that includes:
  - **Repos involved** — GitHub repositories relevant to the ticket, with direct links.
  - **Services and tools** — downstream services, SDKs, or internal tools referenced in the ticket or suspect commits.
  - **Access required** — inferred list of permissions, secrets, or environment setup a developer would need (e.g., specific Azure DevOps project access, GitHub repo permissions, feature flags, environment variables).
  - **Suggested local setup steps** — based on impacted files and services, a short checklist to get a working dev environment for this ticket.
- Surface this section prominently on the ticket detail page, collapsed by default to avoid visual noise for users who do not need it.
