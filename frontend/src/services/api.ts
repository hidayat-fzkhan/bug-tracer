import type { ApiResponse } from "../types";

export async function fetchBugs(bugId?: string, signal?: AbortSignal): Promise<ApiResponse> {
  const base = import.meta.env.VITE_API_BASE || "";
  const path = bugId ? `/api/bugs?bugId=${encodeURIComponent(bugId)}` : "/api/bugs";
  const url = `${base}${path}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as ApiResponse;
}
