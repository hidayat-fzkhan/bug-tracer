export type ApiBug = {
  id: number;
  title: string;
  state?: string;
  createdDate?: string;
  assignedTo?: string;
  areaPath?: string;
  tags?: string;
  webUrl?: string;
  summary?: string;
  aiAnalysis?: {
    summary: string;
    likelyCause?: string;
    suspectCommits: Array<{
      sha: string;
      url?: string;
    }>;
    recommendations: string[];
  };
};

export type ApiResponse = {
  generatedAt: string;
  bugs: ApiBug[];
};
