import { Stack, Typography } from "@mui/material";
import { BugList } from "./components/bug/BugList";
import { EmptyState } from "./components/common/EmptyState";
import { ErrorMessage } from "./components/common/ErrorMessage";
import { Layout } from "./components/layout/Layout";
import { SearchBar } from "./components/search/SearchBar";
import { useBugs } from "./hooks/useBugs";
import { formatDate } from "./utils/formatters";

export default function App() {
  const { query, setQuery, loading, error, bugs, generatedAt, load, handleStop } = useBugs();

  return (
    <Layout loading={loading}>
      <Stack spacing={3}>
        <SearchBar
          query={query}
          loading={loading}
          onQueryChange={setQuery}
          onSearch={load}
          onStop={handleStop}
        />

        {error && <ErrorMessage message={error} />}

        {generatedAt && (
          <Typography variant="caption" color="text.secondary">
            Updated: {formatDate(generatedAt)}
          </Typography>
        )}

        {bugs.length === 0 && !loading ? <EmptyState /> : <BugList bugs={bugs} />}
      </Stack>
    </Layout>
  );
}
