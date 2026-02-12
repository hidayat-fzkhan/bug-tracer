export async function httpJson<T>(
  url: string,
  options: RequestInit & { expectedStatus?: number } = {}
): Promise<T> {
  const expectedStatus = options.expectedStatus ?? 200;
  const response = await fetch(url, options);
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
