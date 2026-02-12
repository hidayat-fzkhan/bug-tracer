import { Card, CardContent, Typography } from "@mui/material";

type EmptyStateProps = {
  message?: string;
};

export function EmptyState({ message = "No bugs found for this query." }: EmptyStateProps) {
  return (
    <Card>
      <CardContent>
        <Typography>{message}</Typography>
      </CardContent>
    </Card>
  );
}
