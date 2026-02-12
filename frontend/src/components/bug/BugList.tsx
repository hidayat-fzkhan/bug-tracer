import { Stack } from "@mui/material";
import type { ApiBug } from "../../types";
import { BugCard } from "./BugCard";

type BugListProps = {
  bugs: ApiBug[];
};

export function BugList({ bugs }: BugListProps) {
  return (
    <Stack spacing={3}>
      {bugs.map((bug) => (
        <BugCard key={bug.id} bug={bug} />
      ))}
    </Stack>
  );
}
