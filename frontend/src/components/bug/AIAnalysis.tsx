import { Box, Card, CardContent, Divider, Stack, Typography } from "@mui/material";
import type { ApiTicket } from "../../types";

type AIAnalysisProps = Readonly<{
  analysis: NonNullable<ApiTicket["aiAnalysis"]>;
}>;

type StructuredPrimitive = string | number | boolean | null;

interface StructuredArray extends Array<StructuredValue> {}

interface StructuredObject {
  [key: string]: StructuredValue;
}

type StructuredValue = StructuredPrimitive | StructuredArray | StructuredObject;

function toReadableLabel(key: string): string {
  return key
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll(/[_-]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function isStructuredObject(value: unknown): value is StructuredObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStructuredValue(value: unknown): value is StructuredValue {
  if (value == null) {
    return true;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) => isStructuredValue(item));
  }

  if (isStructuredObject(value)) {
    return Object.values(value).every((item) => isStructuredValue(item));
  }

  return false;
}

function decodeJsonString(value: string): string {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value;
  }
}

function tryParseStructuredSummary(summary: unknown): StructuredValue | null {
  if (isStructuredValue(summary) && typeof summary !== "string") {
    return summary;
  }

  if (typeof summary !== "string") {
    return null;
  }

  const trimmed = summary.trim();
  if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return isStructuredValue(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function tryExtractSummaryField(summary: unknown): string | null {
  if (typeof summary !== "string") {
    return null;
  }

  const match = /"summary"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(summary);
  return match ? decodeJsonString(match[1]) : null;
}

function getPlainSummaryText(summary: unknown): string {
  const extractedSummary = tryExtractSummaryField(summary);
  if (extractedSummary) {
    return extractedSummary;
  }

  if (typeof summary === "string") {
    return summary;
  }

  if (typeof summary === "number" || typeof summary === "boolean") {
    return String(summary);
  }

  if (summary == null) {
    return "";
  }

  if (Array.isArray(summary) || isStructuredObject(summary)) {
    try {
      return JSON.stringify(summary, null, 2);
    } catch {
      return "";
    }
  }

  return "";
}

function renderStructuredValue(value: StructuredValue, path: string): React.ReactNode {
  if (value == null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return (
      <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
        {String(value)}
      </Typography>
    );
  }

  if (Array.isArray(value)) {
    return (
      <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
        {value.map((item, index) => (
          <Box key={`${path}.${index}`} component="li">
            {renderStructuredValue(item, `${path}.${index}`)}
          </Box>
        ))}
      </Stack>
    );
  }

  const entries = Object.entries(value).filter(([, nestedValue]) => nestedValue != null);
  return (
    <Stack spacing={1}>
      {entries.map(([key, nestedValue]) => (
        <Box key={`${path}.${key}`}>
          <Typography variant="caption" fontWeight={600}>
            {toReadableLabel(key)}
          </Typography>
          <Box sx={{ mt: 0.5 }}>{renderStructuredValue(nestedValue, `${path}.${key}`)}</Box>
        </Box>
      ))}
    </Stack>
  );
}

export function AIAnalysis({ analysis }: AIAnalysisProps) {
  if (analysis.status === "not-enough-data") {
    return (
      <>
        <Divider sx={{ mt: 2 }} />
        <Typography variant="h5" sx={{ mt: 2 }}>
          AI Analysis
        </Typography>
        <Card variant="outlined" sx={{ backgroundColor: "#f5f5f5" }}>
          <CardContent>
            <Typography variant="body2">Not enough data for AI analysis.</Typography>
          </CardContent>
        </Card>
      </>
    );
  }

  const isBug = analysis.analysisType === "bug";
  const structuredSummary = tryParseStructuredSummary(analysis.summary);
  const plainSummaryText = getPlainSummaryText(analysis.summary);

  return (
    <>
      <Divider sx={{ mt: 2 }} />
      <Typography variant="h5" sx={{ mt: 2 }}>
        AI Analysis
      </Typography>
      <Card variant="outlined" sx={{ backgroundColor: "#f5f5f5" }}>
        <CardContent>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="caption" fontWeight={600}>
                {isBug ? "Why Is This Bug Happening?" : "What Is This User Story Asking For?"}
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                {!isBug && structuredSummary ? (
                  renderStructuredValue(structuredSummary, "summary")
                ) : (
                  <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                    {plainSummaryText}
                  </Typography>
                )}
              </Box>
            </Box>

            {isBug && analysis.likelyCause && (
              <Box>
                <Typography variant="caption" fontWeight={600}>
                  What Could Be The Issue?
                </Typography>
                <Typography variant="body2">{analysis.likelyCause}</Typography>
              </Box>
            )}

            {!isBug && analysis.implementationApproach && (
              <Box>
                <Typography variant="caption" fontWeight={600}>
                  Suggested Implementation Approach
                </Typography>
                <Typography variant="body2">{analysis.implementationApproach}</Typography>
              </Box>
            )}

            {!isBug && (analysis.impactedAreas?.length ?? 0) > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={600}>
                  Likely Impacted Areas
                </Typography>
                <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                  {analysis.impactedAreas?.map((area, index) => (
                    <Typography key={area} variant="body2" component="li">
                      {area}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}

            {!isBug && (analysis.dependencies?.length ?? 0) > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={600}>
                  Dependencies / Preconditions
                </Typography>
                <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                  {analysis.dependencies?.map((dependency, index) => (
                    <Typography key={dependency} variant="body2" component="li">
                      {dependency}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}

            {analysis.suspectCommits.length > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={600}>
                  {isBug ? "Related Recent Commit(s)" : "Potentially Relevant Recent Commit(s)"}
                </Typography>
                <Stack spacing={0.5}>
                  {analysis.suspectCommits.map((commit, idx) => (
                    <Typography key={commit.sha} variant="body2">
                      {commit.url ? (
                        <a href={commit.url} target="_blank" rel="noreferrer">
                          {commit.sha}
                        </a>
                      ) : (
                        commit.sha
                      )}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}

            {analysis.recommendations.length > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={600}>
                  {isBug ? "How To Fix It" : "Implementation Recommendations"}
                </Typography>
                <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                  {analysis.recommendations.map((rec, i) => (
                    <Typography key={rec} variant="body2" component="li">
                      {rec}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}

            {(analysis.importantPoints?.length ?? 0) > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={600}>
                  Other Important Points
                </Typography>
                <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                  {analysis.importantPoints?.map((point, i) => (
                    <Typography key={point} variant="body2" component="li">
                      {point}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    </>
  );
}
