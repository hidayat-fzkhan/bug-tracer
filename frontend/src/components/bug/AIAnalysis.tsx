import { Box, Card, CardContent, Divider, Stack, Typography } from "@mui/material";
import type { ApiBug } from "../../types";

type AIAnalysisProps = {
  analysis: NonNullable<ApiBug["aiAnalysis"]>;
};

export function AIAnalysis({ analysis }: AIAnalysisProps) {
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
                Summary
              </Typography>
              <Typography variant="body2">{analysis.summary}</Typography>
            </Box>

            {analysis.likelyCause && (
              <Box>
                <Typography variant="caption" fontWeight={600}>
                  Likely Cause
                </Typography>
                <Typography variant="body2">{analysis.likelyCause}</Typography>
              </Box>
            )}

            {analysis.suspectCommits.length > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={600}>
                  AI-Identified Suspect Commits
                </Typography>
                <Stack spacing={0.5}>
                  {analysis.suspectCommits.map((commit, idx) => (
                    <Typography key={idx} variant="body2">
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
                  Recommendations
                </Typography>
                <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                  {analysis.recommendations.map((rec, i) => (
                    <Typography key={i} variant="body2" component="li">
                      {rec}
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
