import { AppBar, Toolbar, Typography } from "@mui/material";

export function Header() {
  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <Typography variant="h6" component="div">
          Bugs Agent
        </Typography>
      </Toolbar>
    </AppBar>
  );
}
