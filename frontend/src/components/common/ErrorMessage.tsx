import { Card, CardContent, Stack, Typography } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";

type ErrorMessageProps = Readonly<{
  message: string;
}>;

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <Card sx={{ borderLeft: "4px solid #d32f2f", backgroundColor: "#fff8f8" }}>
      <CardContent sx={{ py: "12px !important" }}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <ErrorOutlineIcon sx={{ color: "error.main", fontSize: 20, mt: 0.1, flexShrink: 0 }} />
          <Typography color="error" variant="body2">
            {message}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
