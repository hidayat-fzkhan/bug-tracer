import { Card, CardContent, Stack } from "@mui/material";
import type { ApiBug } from "../../types";
import { AIAnalysis } from "./AIAnalysis";
import { BugDetails } from "./BugDetails";

type BugCardProps = {
  bug: ApiBug;
};

export function BugCard({ bug }: BugCardProps) {
  return (
    <Card sx={{ borderLeft: "4px solid #1976d2" }}>
      <CardContent>
        <Stack spacing={1.5}>
          <BugDetails bug={bug} />
          {bug.aiAnalysis && <AIAnalysis analysis={bug.aiAnalysis} />}
        </Stack>
      </CardContent>
    </Card>
  );
}
