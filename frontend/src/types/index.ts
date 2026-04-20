export type ApiBugAnalysis = {
  summary: string;
  likelyCause?: string;
  suspectCommits: Array<{
    sha: string;
    url?: string;
  }>;
  recommendations: string[];
  importantPoints?: string[];
};

export type ApiBug = {
  id: number;
  title: string;
  state?: string;
  createdDate?: string;
  assignedTo?: string;
  areaPath?: string;
  iterationPath?: string;
  tags?: string;
  webUrl?: string;
  summary?: string;
  description?: string;
  reproSteps?: string;
  aiAnalysis?: ApiBugAnalysis;
};

export type ApiResponse = {
  generatedAt: string;
  bugs: ApiBug[];
};

export type ApiBugAnalysisResponse = {
  generatedAt: string;
  bugId: number;
  aiAnalysis: ApiBugAnalysis;
};
