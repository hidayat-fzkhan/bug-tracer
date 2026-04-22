import { Button, Card, CardContent, CircularProgress, Stack, Typography } from "@mui/material";
import type { ApiTicket } from "../../types";
import { AIAnalysis } from "./AIAnalysis";
import { BugDetails } from "./BugDetails";
import { ImplementationPrompt } from "./ImplementationPrompt";
import { ErrorMessage } from "../common/ErrorMessage";

type BugCardProps = {
  bug: ApiTicket;
  isDetailed?: boolean;
  onOpenBug: (bugId: number) => void;
  analysisLoading?: boolean;
  analysisError?: string | null;
  promptLoading?: boolean;
  promptError?: string | null;
  onGeneratePrompt?: (ticketId: number) => void;
};

export function BugCard({
  bug,
  isDetailed = false,
  onOpenBug,
  analysisLoading = false,
  analysisError = null,
  promptLoading = false,
  promptError = null,
  onGeneratePrompt,
}: BugCardProps) {
  const isBug = bug.category === "bugs";
  const showImplementationPrompt =
    isDetailed &&
    !isBug &&
    bug.aiAnalysis?.status === "ready";

  return (
    <Card sx={{ borderLeft: "4px solid #1976d2" }}>
      <CardContent>
        <Stack spacing={1.5}>
          <BugDetails bug={bug} isDetailed={isDetailed} />

          {!isDetailed && (
            <Button variant="outlined" sx={{ alignSelf: "flex-start" }} onClick={() => onOpenBug(bug.id)}>
              {isBug ? "Open Bug Analysis" : "Open User Story Analysis"}
            </Button>
          )}

          {isDetailed && analysisLoading && (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CircularProgress size={20} />
              <Typography variant="body2">
                {isBug
                  ? "AI is analyzing this bug and repository context..."
                  : "AI is analyzing this user story and repository context..."}
              </Typography>
            </Stack>
          )}

          {isDetailed && analysisError && <ErrorMessage message={analysisError} />}

          {isDetailed && bug.aiAnalysis && <AIAnalysis analysis={bug.aiAnalysis} />}

          {showImplementationPrompt && (
            <ImplementationPrompt
              prompt={bug.implementationPrompt}
              loading={promptLoading}
              error={promptError}
              onGenerate={() => onGeneratePrompt?.(bug.id)}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
