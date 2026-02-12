export function stripHtmlToText(input: string): string {
  // Azure DevOps often stores fields as HTML. Keep this lightweight (no deps).
  let text = input;

  text = text.replace(/\r\n/g, "\n");
  text = text.replace(/<\s*br\s*\/?>/gi, "\n");
  text = text.replace(/<\s*\/p\s*>/gi, "\n");
  text = text.replace(/<\s*p\b[^>]*>/gi, "");

  // Drop remaining tags.
  text = text.replace(/<[^>]+>/g, " ");

  // Decode a small set of common entities.
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // Numeric entities.
  text = text.replace(/&#(\d+);/g, (_, code) => {
    const n = Number(code);
    if (!Number.isFinite(n)) return "";
    try {
      return String.fromCodePoint(n);
    } catch {
      return "";
    }
  });

  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    const n = Number.parseInt(hex, 16);
    if (!Number.isFinite(n)) return "";
    try {
      return String.fromCodePoint(n);
    } catch {
      return "";
    }
  });

  return collapseWhitespace(text);
}

export function collapseWhitespace(input: string): string {
  return input
    .replace(/\u00A0/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function truncate(input: string, maxChars: number): string {
  if (maxChars <= 0) return "";
  if (input.length <= maxChars) return input;
  const sliced = input.slice(0, Math.max(0, maxChars - 1)).trimEnd();
  return `${sliced}…`;
}
