export type AdoWorkItemFields = Record<string, unknown>;

export type WorkItemCategory = "bugs" | "user-stories";

export type WorkItemAnalysisType = "bug" | "user-story";

export type AdoWorkItem = {
  id: number;
  category: WorkItemCategory;
  workItemType: string;
  title: string;
  state?: string;
  createdDate?: string;
  assignedTo?: string;
  areaPath?: string;
  iterationPath?: string;
  tags?: string;
  description?: string;
  reproSteps?: string;
  acceptanceCriteria?: string;
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
