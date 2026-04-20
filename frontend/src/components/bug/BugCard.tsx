import { Button, Card, CardContent, CircularProgress, Stack, Typography } from "@mui/material";
import type { ApiBug } from "../../types";
import { AIAnalysis } from "./AIAnalysis";
import { BugDetails } from "./BugDetails";
import { ErrorMessage } from "../common/ErrorMessage";

type BugCardProps = {
  bug: ApiBug;
  isDetailed?: boolean;
  onOpenBug: (bugId: number) => void;
  analysisLoading?: boolean;
  analysisError?: string | null;
};

export function BugCard({
  bug,
  isDetailed = false,
  onOpenBug,
  analysisLoading = false,
  analysisError = null,
}: BugCardProps) {
  return (
    <Card sx={{ borderLeft: "4px solid #1976d2" }}>
      <CardContent>
        <Stack spacing={1.5}>
          <BugDetails bug={bug} isDetailed={isDetailed} />

          {!isDetailed && (
            <Button variant="outlined" sx={{ alignSelf: "flex-start" }} onClick={() => onOpenBug(bug.id)}>
              Open Bug Analysis
            </Button>
          )}

          {isDetailed && analysisLoading && (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CircularProgress size={20} />
              <Typography variant="body2">AI is analyzing this bug and repository context...</Typography>
            </Stack>
          )}

          {isDetailed && analysisError && <ErrorMessage message={analysisError} />}

          {isDetailed && bug.aiAnalysis && <AIAnalysis analysis={bug.aiAnalysis} />}
        </Stack>
      </CardContent>
    </Card>
  );
}
