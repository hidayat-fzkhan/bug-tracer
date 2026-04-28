import { AppBar, Box, Button, Stack, Toolbar, Typography } from "@mui/material";
import BugReportIcon from "@mui/icons-material/BugReport";

type HeaderProps = Readonly<{
  currentPath: string;
  onNavigate: (path: string) => void;
}>;

const NAV_ITEMS = [
  { label: "Bugs", path: "/bugs" },
  { label: "User Stories", path: "/user-stories" },
] as const;

export function Header({ currentPath, onNavigate }: HeaderProps) {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        background:
          "linear-gradient(135deg, #1565c0 0%, #1976d2 60%, #42a5f5 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexGrow: 1,
            cursor: "pointer",
            "&:hover": { opacity: 0.9 },
          }}
          onClick={() => onNavigate("/")}
        >
          <BugReportIcon sx={{ fontSize: 28 }} />
          <Box>
            <Typography
              variant="h6"
              component="div"
              sx={{ lineHeight: 1.1, fontWeight: 700, letterSpacing: "-0.3px" }}
            >
              BugTracer
            </Typography>
            <Typography
              variant="caption"
              sx={{ opacity: 0.75, lineHeight: 1, display: "block" }}
            >
              AI-powered triage
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={0.5}>
          {NAV_ITEMS.map((item) => {
            const isActive =
              currentPath === item.path ||
              currentPath.startsWith(`${item.path}/`);

            return (
              <Button
                key={item.path}
                color="inherit"
                onClick={() => onNavigate(item.path)}
                sx={{
                  borderRadius: 2,
                  px: 2,
                  fontWeight: isActive ? 700 : 400,
                  backgroundColor: isActive
                    ? "rgba(255,255,255,0.18)"
                    : "transparent",
                  "&:hover": {
                    backgroundColor: isActive
                      ? "rgba(255,255,255,0.25)"
                      : "rgba(255,255,255,0.1)",
                  },
                  transition: "background-color 0.15s",
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
