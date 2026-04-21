import { AppBar, Button, Stack, Toolbar, Typography } from "@mui/material";

type HeaderProps = Readonly<{
  currentPath: string;
  onNavigate: (path: string) => void;
}>;

const NAV_ITEMS = [
  { label: "Home", path: "/" },
  { label: "Bugs", path: "/bugs" },
  { label: "User Stories", path: "/user-stories" },
] as const;

export function Header({ currentPath, onNavigate }: HeaderProps) {
  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          BugTracer
        </Typography>
        <Stack direction="row" spacing={1}>
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.path || currentPath.startsWith(`${item.path}/`);

            return (
              <Button
                key={item.path}
                color="inherit"
                variant={isActive ? "outlined" : "text"}
                onClick={() => onNavigate(item.path)}
                sx={isActive ? { borderColor: "rgba(255,255,255,0.8)" } : undefined}
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
