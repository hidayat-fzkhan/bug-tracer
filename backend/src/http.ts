function extractErrorChain(err: unknown, depth = 0): string {
  if (depth > 4) return "";

  if (err instanceof Error) {
    const cause = (err as Error & { cause?: unknown }).cause;
    const causeStr = cause === undefined ? "" : ` → ${extractErrorChain(cause, depth + 1)}`;
    return `${err.message}${causeStr}`;
  }

  if (typeof err === "string") return err;
  if (err === null || err === undefined) return "unknown";
  return JSON.stringify(err);
}

export async function httpJson<T>(
  url: string,
  options: RequestInit & { expectedStatus?: number } = {}
): Promise<T> {
  const expectedStatus = options.expectedStatus ?? 200;

  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    const chain = extractErrorChain(err);
    throw new Error(`Network request failed for ${url}: ${chain}`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (response.status !== expectedStatus) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(
      `HTTP ${response.status} for ${url}\n${contentType}\n${bodyText.slice(0, 2000)}`
    );
  }

  return (await response.json()) as T;
}

export function basicPatAuthHeader(pat: string): string {
  // Azure DevOps uses Basic auth with username blank and PAT as the password.
  const token = Buffer.from(`:${pat}`, "utf8").toString("base64");
  return `Basic ${token}`;
}
