import { useEffect, useState } from "react";
import { Button, Stack, Typography } from "@mui/material";
import { BugList } from "./components/bug/BugList";
import { EmptyState } from "./components/common/EmptyState";
import { ErrorMessage } from "./components/common/ErrorMessage";
import { Layout } from "./components/layout/Layout";
import { SearchBar } from "./components/search/SearchBar";
import { useBugs } from "./hooks/useBugs";
import { formatDate } from "./utils/formatters";

function getBugIdFromPath(pathname: string): string | null {
  const match = /^\/analyze\/([^/]+)$/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function App() {
  const [pathname, setPathname] = useState(() => globalThis.location.pathname);
  const {
    query,
    setQuery,
    loading,
    error,
    analysisLoading,
    analysisError,
    bugs,
    selectedBugId,
    generatedAt,
    load,
    handleStop,
  } = useBugs();

  const routeBugId = getBugIdFromPath(pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(globalThis.location.pathname);
    };

    globalThis.addEventListener("popstate", handlePopState);
    return () => {
      globalThis.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    setQuery(routeBugId ?? "");
    void load(routeBugId ?? undefined);
  }, [load, routeBugId, setQuery]);

  const navigateTo = (nextPath: string) => {
    if (globalThis.location.pathname === nextPath) {
      return false;
    }

    globalThis.history.pushState({}, "", nextPath);
    setPathname(nextPath);
    return true;
  };

  const openBug = (bugId: number) => {
    navigateTo(`/analyze/${encodeURIComponent(String(bugId))}`);
  };

  const showLatestBugs = () => {
    setQuery("");
    if (!navigateTo("/")) {
      void load();
    }
  };

  const handleSearch = (bugId?: string) => {
    const trimmedBugId = bugId?.trim();

    if (!trimmedBugId) {
      showLatestBugs();
      return;
    }

    setQuery(trimmedBugId);
    if (!navigateTo(`/analyze/${encodeURIComponent(trimmedBugId)}`)) {
      void load(trimmedBugId);
    }
  };

  const selectedBug = bugs.length === 1 && selectedBugId ? bugs[0] : null;

  return (
    <Layout loading={loading}>
      <Stack spacing={3}>
        <SearchBar
          query={query}
          loading={loading}
          onQueryChange={setQuery}
          onSearch={handleSearch}
          onStop={handleStop}
        />

        {error && <ErrorMessage message={error} />}

        {generatedAt && (
          <Typography variant="caption" color="text.secondary">
            Updated: {formatDate(generatedAt)}
          </Typography>
        )}

        {selectedBug && (
          <Button variant="text" onClick={showLatestBugs} sx={{ alignSelf: "flex-start" }}>
            Back To Bug List
          </Button>
        )}

        {bugs.length === 0 && !loading ? (
          <EmptyState />
        ) : (
          <BugList
            bugs={bugs}
            onOpenBug={openBug}
            selectedBugId={selectedBug?.id}
            analysisLoading={analysisLoading}
            analysisError={analysisError}
          />
        )}
      </Stack>
    </Layout>
  );
}
