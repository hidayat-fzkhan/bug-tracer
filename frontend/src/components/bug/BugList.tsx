import { Stack } from "@mui/material";
import type { ApiTicket } from "../../types";
import { BugCard } from "./BugCard";

type BugListProps = Readonly<{
  bugs: ApiTicket[];
  onOpenBug: (bugId: number) => void;
  selectedBugId?: number;
  analysisLoading?: boolean;
  analysisError?: string | null;
}>;

export function BugList({
  bugs,
  onOpenBug,
  selectedBugId,
  analysisLoading,
  analysisError,
}: BugListProps) {
  return (
    <Stack spacing={3}>
      {bugs.map((bug) => (
        <BugCard
          key={bug.id}
          bug={bug}
          isDetailed={selectedBugId === bug.id && bugs.length === 1}
          onOpenBug={onOpenBug}
          analysisLoading={
            selectedBugId === bug.id && bugs.length === 1
              ? analysisLoading
              : false
          }
          analysisError={
            selectedBugId === bug.id && bugs.length === 1 ? analysisError : null
          }
        />
      ))}
    </Stack>
  );
}
