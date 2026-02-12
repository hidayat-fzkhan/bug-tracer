import { Command } from "commander";
import { fetchNewBugs } from "./ado.js";
import { loadConfig } from "./config.js";
import { fetchRecentCommits } from "./github.js";
import { rankCommits } from "./rank.js";
import { stripHtmlToText, truncate } from "./text.js";

function csv(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function bugText(bug: { title: string; description?: string; reproSteps?: string; tags?: string }): string {
  const description = bug.description ? stripHtmlToText(bug.description) : undefined;
  const repro = bug.reproSteps ? stripHtmlToText(bug.reproSteps) : undefined;
  return [bug.title, bug.tags, description, repro].filter(Boolean).join("\n\n");
}

function formatFiles(files: string[], maxShown: number): string {
  const shown = files.slice(0, Math.max(0, maxShown));
  const remaining = Math.max(0, files.length - shown.length);
  const base = shown.join(", ");
  if (!base && remaining === 0) return "";
  if (remaining === 0) return base;
  return `${base}${base ? ", " : ""}+${remaining} more`;
}

async function main() {
  const program = new Command();

  program
    .name("bugs-agent")
    .description("Fetch new Azure DevOps bugs and rank likely GitHub commits")
    .option("--ado-org <org>")
    .option("--ado-project <project>")
    .option("--ado-pat <pat>")
    .option("--ado-top <n>", "number of bugs", (v) => Number(v))
    .option("--ado-days <n>", "created within last N days", (v) => Number(v))
    .option("--ado-states <csv>", "comma-separated states")
    .option("--ado-area-path <path>", "filter by Area Path (WIQL UNDER)")
    .option("--gh-repo <owner/repo>")
    .option("--gh-token <token>")
    .option("--gh-commits <n>", "number of commits", (v) => Number(v))
    .option("--bug-id <id>", "analyze a single bug id", (v) => Number(v));

  program.parse(process.argv);
  const opts = program.opts();

  const cfg = loadConfig({
    adoOrg: opts.adoOrg,
    adoProject: opts.adoProject,
    adoPat: opts.adoPat,
    adoTop: Number.isFinite(opts.adoTop) ? opts.adoTop : undefined,
    adoDays: Number.isFinite(opts.adoDays) ? opts.adoDays : undefined,
    adoStates: typeof opts.adoStates === "string" ? csv(opts.adoStates) : undefined,
    adoAreaPath: typeof opts.adoAreaPath === "string" ? opts.adoAreaPath : undefined,
    githubRepo: opts.ghRepo,
    githubToken: opts.ghToken,
    githubCommits: Number.isFinite(opts.ghCommits) ? opts.ghCommits : undefined
  });

  const commits = await fetchRecentCommits({
    repo: cfg.githubRepo,
    token: cfg.githubToken,
    count: cfg.githubCommits
  });

  const bugs = await fetchNewBugs({
    adoOrg: cfg.adoOrg,
    project: cfg.adoProject,
    pat: cfg.adoPat,
    top: cfg.adoTop,
    createdInLastDays: cfg.adoDays,
    states: cfg.adoStates,
    areaPath: cfg.adoAreaPath
  });

  const filteredBugs = Number.isFinite(opts.bugId)
    ? bugs.filter((b) => b.id === opts.bugId)
    : bugs;

  if (filteredBugs.length === 0) {
    console.log("No bugs found for the given criteria.");
    return;
  }

  for (const bug of filteredBugs) {
    const text = bugText(bug);
    const ranked = rankCommits({
      bugText: text,
      commits,
      bugId: bug.id,
      minScore: cfg.rankMinScore
    }).slice(0, 5);

    const summarySource =
      (bug.reproSteps && stripHtmlToText(bug.reproSteps)) ||
      (bug.description && stripHtmlToText(bug.description)) ||
      "";

    console.log("=".repeat(88));
    console.log(`Bug ${bug.id} (${bug.state ?? "Unknown"}) — ${bug.title}`);
    if (bug.createdDate) console.log(`Created: ${bug.createdDate}`);
    if (bug.assignedTo) console.log(`Assigned: ${bug.assignedTo}`);
    if (bug.areaPath) console.log(`Area: ${bug.areaPath}`);
    if (bug.webUrl) console.log(`Link: ${bug.webUrl}`);
    if (bug.tags) console.log(`Tags: ${bug.tags}`);
    if (summarySource) console.log(`Summary: ${truncate(summarySource, 260)}`);

    console.log("\nTop suspect commits (heuristic):");
    if (ranked.length === 0) {
      console.log("(no strong matches)");
    } else {
      for (const c of ranked) {
        const short = c.sha.slice(0, 8);
        const subject = c.message.split("\n")[0] ?? "";
        const files = formatFiles(c.files.map((f) => f.filename), 3);

        console.log(`- ${short}  score=${c.score.toFixed(3)}  ${truncate(subject, 110)}`);
        if (c.htmlUrl) console.log(`  ${c.htmlUrl}`);
        if (files) console.log(`  files: ${truncate(files, 140)}`);
        if (c.matchedTokens.length) console.log(`  matched: ${c.matchedTokens.join(", ")}`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
