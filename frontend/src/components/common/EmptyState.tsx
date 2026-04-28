import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import SearchOffIcon from "@mui/icons-material/SearchOff";

type EmptyStateProps = Readonly<{
  message?: string;
}>;

export function EmptyState({ message = "No tickets found for this query." }: EmptyStateProps) {
  return (
    <Card variant="outlined" sx={{ borderStyle: "dashed" }}>
      <CardContent sx={{ py: 5 }}>
        <Stack alignItems="center" spacing={1.5}>
          <Box sx={{ color: "text.disabled" }}>
            <SearchOffIcon sx={{ fontSize: 48 }} />
          </Box>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            {message}
          </Typography>
          <Typography variant="body2" color="text.disabled" textAlign="center">
            Try a different ticket ID or leave the search blank to load recent items.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
