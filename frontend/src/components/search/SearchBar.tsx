import { Box, Button, TextField } from "@mui/material";
import { useMemo } from "react";

type SearchBarProps = {
  query: string;
  loading: boolean;
  onQueryChange: (query: string) => void;
  onSearch: (query?: string) => void;
  onStop: () => void;
};

export function SearchBar({ query, loading, onQueryChange, onSearch, onStop }: SearchBarProps) {
  const hasQuery = useMemo(() => query.trim().length > 0, [query]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSearch(query.trim() || undefined);
  };

  const handleClear = () => {
    onQueryChange("");
    onSearch();
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", gap: 2 }}>
      <TextField
        label="Search by Bug ID"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="e.g. 2689652"
        size="small"
        fullWidth
      />
      <Button type="submit" variant="contained" disabled={loading}>
        Search
      </Button>
      {loading ? (
        <Button variant="contained" color="error" onClick={onStop}>
          STOP
        </Button>
      ) : (
        <Button variant="outlined" disabled={!hasQuery} onClick={handleClear}>
          Clear
        </Button>
      )}
    </Box>
  );
}
