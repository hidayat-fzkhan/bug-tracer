import { useState } from "react";
import { Box, Button, Card, CardContent, CircularProgress, Divider, Stack, Typography } from "@mui/material";
import { ErrorMessage } from "../common/ErrorMessage";

type ImplementationPromptProps = Readonly<{
  prompt?: string;
  loading: boolean;
  error?: string | null;
  onGenerate: () => void;
}>;

export function ImplementationPrompt({ prompt, loading, error, onGenerate }: ImplementationPromptProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Divider sx={{ mt: 2 }} />
      <Typography variant="h5" sx={{ mt: 2 }}>
        Prompt to Implement
      </Typography>

      {!prompt && !loading && !error && (
        <Button variant="outlined" sx={{ alignSelf: "flex-start" }} onClick={onGenerate}>
          Generate Implementation Prompt
        </Button>
      )}

      {loading && (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={20} />
          <Typography variant="body2">Generating implementation prompt...</Typography>
        </Stack>
      )}

      {error && !loading && <ErrorMessage message={error} />}

      {prompt && !loading && (
        <Card variant="outlined" sx={{ backgroundColor: "#f5f5f5" }}>
          <CardContent>
            <Stack spacing={1.5}>
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => void handleCopy()}
                >
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </Button>
              </Box>
              <Typography
                variant="body2"
                component="pre"
                sx={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: "inherit",
                  m: 0,
                }}
              >
                {prompt}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}
    </>
  );
}
