import type { ApiImplementationPromptResponse, ApiTicketAnalysisResponse, ApiTicketListResponse, TicketCategory } from "../types";

function getApiBase(): string {
  return import.meta.env.VITE_API_BASE || "";
}

export async function fetchTickets(
  category: TicketCategory,
  ticketId?: string,
  signal?: AbortSignal,
): Promise<ApiTicketListResponse> {
  const base = getApiBase();
  const path = ticketId
    ? `/api/${category}?ticketId=${encodeURIComponent(ticketId)}`
    : `/api/${category}`;
  const url = `${base}${path}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as ApiTicketListResponse;
}

export async function fetchTicketAnalysis(
  category: TicketCategory,
  ticketId: number,
  signal?: AbortSignal,
): Promise<ApiTicketAnalysisResponse> {
  const base = getApiBase();
  const url = `${base}/api/${category}/${ticketId}/analysis`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as ApiTicketAnalysisResponse;
}

export async function fetchImplementationPrompt(
  ticketId: number,
  signal?: AbortSignal,
): Promise<ApiImplementationPromptResponse> {
  const base = getApiBase();
  const url = `${base}/api/user-stories/${ticketId}/implementation-prompt`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as ApiImplementationPromptResponse;
}
