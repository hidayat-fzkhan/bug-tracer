import { Box, Container, LinearProgress } from "@mui/material";
import { ReactNode } from "react";
import { Header } from "./Header";

type LayoutProps = {
  children: ReactNode;
  loading?: boolean;
};

export function Layout({ children, loading }: LayoutProps) {
  return (
    <Box>
      <Header />
      {loading && <LinearProgress color="secondary" />}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
