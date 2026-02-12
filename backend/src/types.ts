export type AdoWorkItemFields = Record<string, unknown>;

export type AdoBug = {
  id: number;
  title: string;
  state?: string;
  createdDate?: string;
  assignedTo?: string;
  areaPath?: string;
  iterationPath?: string;
  tags?: string;
  description?: string;
  reproSteps?: string;
  url?: string;
  webUrl?: string;
};

export type GitCommitFile = {
  filename: string;
  status?: string;
};

export type GitCommit = {
  sha: string;
  htmlUrl?: string;
  message: string;
  authorName?: string;
  date?: string;
  files: GitCommitFile[];
};

export type RankedCommit = GitCommit & { score: number; matchedTokens: string[] };
