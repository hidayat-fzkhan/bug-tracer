import { Chip, Stack, Typography } from "@mui/material";
import type { ApiTicket } from "../../types";
import { formatDate } from "../../utils/formatters";

type BugDetailsProps = {
  bug: ApiTicket;
  isDetailed?: boolean;
};

export function BugDetails({ bug, isDetailed = false }: BugDetailsProps) {
  const isBug = bug.category === "bugs";

  return (
    <>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="baseline">
        <Typography variant="h6">{bug.title}</Typography>
        <Chip size="small" label={`#${bug.id}`} />
        <Chip size="small" label={bug.workItemType} color="default" />
        {bug.state && <Chip size="small" label={bug.state} color="info" />}
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        {bug.createdDate && (
          <Typography variant="body2">
            Created: {formatDate(bug.createdDate)}
          </Typography>
        )}
        {bug.assignedTo && (
          <Typography variant="body2">Assigned: {bug.assignedTo}</Typography>
        )}
        {bug.areaPath && (
          <Typography variant="body2">Area: {bug.areaPath}</Typography>
        )}
        {bug.iterationPath && (
          <Typography variant="body2">Iteration: {bug.iterationPath}</Typography>
        )}
      </Stack>

      {bug.tags && (
        <Typography variant="body2">Tags: {bug.tags}</Typography>
      )}

      {bug.webUrl && (
        <Typography variant="body2">
          <a href={bug.webUrl} target="_blank" rel="noreferrer">
            Open in Azure DevOps
          </a>
        </Typography>
      )}

      {bug.summary && !isDetailed && (
        <>
          <Typography variant="h5" sx={{ whiteSpace: "pre-line" }}>
            Summary
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: "pre-line" }}>
            {bug.summary}
          </Typography>
        </>
      )}

      {isDetailed && bug.description && (
        <>
          <Typography variant="h5" sx={{ whiteSpace: "pre-line" }}>
            {isBug ? "Bug Description" : "User Story Description"}
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: "pre-line" }}>
            {bug.description}
          </Typography>
        </>
      )}

      {isDetailed && isBug && bug.reproSteps && (
        <>
          <Typography variant="h5" sx={{ whiteSpace: "pre-line" }}>
            Repro Steps / Additional Azure Details
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: "pre-line" }}>
            {bug.reproSteps}
          </Typography>
        </>
      )}

      {isDetailed && !isBug && bug.acceptanceCriteria && (
        <>
          <Typography variant="h5" sx={{ whiteSpace: "pre-line" }}>
            Acceptance Criteria
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: "pre-line" }}>
            {bug.acceptanceCriteria}
          </Typography>
        </>
      )}
    </>
  );
}
