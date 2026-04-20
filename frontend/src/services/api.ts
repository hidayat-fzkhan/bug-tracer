import type { ApiBugAnalysisResponse, ApiResponse } from "../types";

function getApiBase(): string {
  return import.meta.env.VITE_API_BASE || "";
}

export async function fetchBugs(bugId?: string, signal?: AbortSignal): Promise<ApiResponse> {
  const base = getApiBase();
  const path = bugId ? `/api/bugs?bugId=${encodeURIComponent(bugId)}` : "/api/bugs";
  const url = `${base}${path}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as ApiResponse;
}

export async function fetchBugAnalysis(
  bugId: number,
  signal?: AbortSignal,
): Promise<ApiBugAnalysisResponse> {
  const base = getApiBase();
  const url = `${base}/api/bugs/${bugId}/analysis`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as ApiBugAnalysisResponse;
}
