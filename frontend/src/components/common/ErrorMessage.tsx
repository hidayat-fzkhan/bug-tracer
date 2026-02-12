import { Card, CardContent, Typography } from "@mui/material";

type ErrorMessageProps = {
  message: string;
};

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <Card sx={{ borderLeft: "4px solid #d32f2f" }}>
      <CardContent>
        <Typography color="error" variant="subtitle1">
          {message}
        </Typography>
      </CardContent>
    </Card>
  );
}
