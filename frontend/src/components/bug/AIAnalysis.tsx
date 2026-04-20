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
                Why Is This Bug Happening?
              </Typography>
              <Typography variant="body2">{analysis.summary}</Typography>
            </Box>

            {analysis.likelyCause && (
              <Box>
                <Typography variant="caption" fontWeight={600}>
                  What Could Be The Issue?
                </Typography>
                <Typography variant="body2">{analysis.likelyCause}</Typography>
              </Box>
            )}

            {analysis.suspectCommits.length > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={600}>
                  Related Recent Commit(s)
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
                  How To Fix It
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

            {(analysis.importantPoints?.length ?? 0) > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={600}>
                  Other Important Points
                </Typography>
                <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                  {analysis.importantPoints?.map((point, i) => (
                    <Typography key={i} variant="body2" component="li">
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
