import "dotenv/config";

export type Config = {
  adoOrg: string;
  adoProject: string;
  adoPat: string;
  adoDays: number;
  adoTop: number;
  adoStates: string[];
  adoAreaPath?: string;
  githubRepo: string;
  githubRepoBranch: string;
  githubToken?: string;
  githubCommits: number;
  anthropicKey: string;
  anthropicModel: string;
  aiEnabled: boolean;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function envNumber(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envCsv(name: string, fallback: string[]): string[] {
  const value = process.env[name];
  if (!value) return fallback;
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function envOptional(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export function loadConfig(partial?: Partial<Config>): Config {
  const adoOrg = partial?.adoOrg ?? requireEnv("ADO_ORG");
  const adoProject = partial?.adoProject ?? requireEnv("ADO_PROJECT");
  const adoPat = partial?.adoPat ?? requireEnv("ADO_PAT");

  const githubRepo = partial?.githubRepo ?? requireEnv("GITHUB_REPO");
  const githubRepoBranch = partial?.githubRepoBranch ?? requireEnv("GITHUB_REPO_BRANCH");
  const githubToken = partial?.githubToken ?? envOptional("GITHUB_TOKEN");
  const anthropicKey = partial?.anthropicKey ?? requireEnv("ANTHROPIC_KEY");
  const anthropicModel = partial?.anthropicModel ?? envOptional("ANTHROPIC_MODEL") ?? "claude-3-7-sonnet-latest";

  return {
    adoOrg,
    adoProject,
    adoPat,
    adoDays: partial?.adoDays ?? envNumber("ADO_DAYS", 7),
    adoTop: partial?.adoTop ?? envNumber("ADO_TOP", 10),
    adoStates: partial?.adoStates ?? envCsv("ADO_STATES", ["New", "Active"]),
    adoAreaPath: partial?.adoAreaPath ?? envOptional("ADO_AREA_PATH"),
    githubRepo,
    githubRepoBranch,
    githubToken,
    githubCommits: partial?.githubCommits ?? envNumber("GITHUB_COMMITS", 50),
    anthropicKey,
    anthropicModel,
    aiEnabled: true
  };
}
