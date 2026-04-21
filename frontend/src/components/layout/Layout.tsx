import { Box, Container, LinearProgress } from "@mui/material";
import { ReactNode } from "react";
import { Header } from "./Header";

type LayoutProps = {
  children: ReactNode;
  loading?: boolean;
  currentPath: string;
  onNavigate: (path: string) => void;
};

export function Layout({ children, loading, currentPath, onNavigate }: LayoutProps) {
  return (
    <Box>
      <Header currentPath={currentPath} onNavigate={onNavigate} />
      {loading && <LinearProgress color="secondary" />}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
