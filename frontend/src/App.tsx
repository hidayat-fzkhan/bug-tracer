import { useEffect, useState } from "react";
import { Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { BugList } from "./components/bug/BugList";
import { EmptyState } from "./components/common/EmptyState";
import { ErrorMessage } from "./components/common/ErrorMessage";
import { Layout } from "./components/layout/Layout";
import { SearchBar } from "./components/search/SearchBar";
import { useTickets } from "./hooks/useBugs";
import type { TicketCategory } from "./types";
import { formatDate } from "./utils/formatters";

type AppRoute =
  | { page: "home" }
  | { page: "list"; category: TicketCategory }
  | { page: "detail"; category: TicketCategory; ticketId: string };

function parsePath(pathname: string): AppRoute {
  if (pathname === "/") {
    return { page: "home" };
  }

  const listMatch = /^\/(bugs|user-stories)$/.exec(pathname);
  if (listMatch) {
    return {
      page: "list",
      category: listMatch[1] as TicketCategory,
    };
  }

  const detailMatch = /^\/(bugs|user-stories)\/analyze\/([^/]+)$/.exec(pathname);
  if (detailMatch) {
    return {
      page: "detail",
      category: detailMatch[1] as TicketCategory,
      ticketId: decodeURIComponent(detailMatch[2]),
    };
  }

  return { page: "home" };
}

function getCategoryMeta(category: TicketCategory) {
  return category === "bugs"
    ? {
        title: "Bugs",
        searchLabel: "Search by Bug or Defect ID",
        searchPlaceholder: "e.g. 2689652",
        emptyMessage: "No bugs or defects found for this query.",
        backLabel: "Back To Bugs List",
      }
    : {
        title: "User Stories",
        searchLabel: "Search by User Story ID",
        searchPlaceholder: "e.g. 2689652",
        emptyMessage: "No user stories found for this query.",
        backLabel: "Back To User Stories List",
      };
}

function buildListPath(category: TicketCategory) {
  return `/${category}`;
}

function buildDetailPath(category: TicketCategory, ticketId: string) {
  return `/${category}/analyze/${encodeURIComponent(ticketId)}`;
}

export default function App() {
  const [pathname, setPathname] = useState(() => globalThis.location.pathname);
  const route = parsePath(pathname);
  const routePage = route.page;
  const routeTicketId = route.page === "detail" ? route.ticketId : undefined;
  const currentCategory = route.page === "home" ? null : route.category;
  const {
    query,
    setQuery,
    loading,
    error,
    analysisLoading,
    analysisError,
    promptLoading,
    promptError,
    tickets,
    selectedTicketId,
    generatedAt,
    load,
    reset,
    handleStop,
    loadImplementationPrompt,
  } = useTickets(currentCategory);

  const categoryMeta = currentCategory ? getCategoryMeta(currentCategory) : null;

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
    if (!currentCategory) {
      setQuery("");
      reset();
      return;
    }

    setQuery(routeTicketId ?? "");
    void load(routeTicketId);
  }, [currentCategory, load, reset, routePage, routeTicketId, setQuery]);

  const navigateTo = (nextPath: string) => {
    if (globalThis.location.pathname === nextPath) {
      return false;
    }

    globalThis.history.pushState({}, "", nextPath);
    setPathname(nextPath);
    return true;
  };

  const handleHeaderNavigate = (path: string) => {
    if (!navigateTo(path)) {
      const nextRoute = parsePath(path);
      if (nextRoute.page === "home") {
        reset();
        setQuery("");
        return;
      }

      void load(nextRoute.page === "detail" ? nextRoute.ticketId : undefined);
    }
  };

  const openTicket = (ticketId: number) => {
    if (!currentCategory) {
      return;
    }

    navigateTo(buildDetailPath(currentCategory, String(ticketId)));
  };

  const showLatestTickets = () => {
    if (!currentCategory) {
      return;
    }

    setQuery("");
    if (!navigateTo(buildListPath(currentCategory))) {
      void load();
    }
  };

  const handleSearch = (ticketId?: string) => {
    if (!currentCategory) {
      return;
    }

    const trimmedTicketId = ticketId?.trim();

    if (!trimmedTicketId) {
      showLatestTickets();
      return;
    }

    setQuery(trimmedTicketId);
    if (!navigateTo(buildDetailPath(currentCategory, trimmedTicketId))) {
      void load(trimmedTicketId);
    }
  };

  const selectedTicket = tickets.length === 1 && selectedTicketId ? tickets[0] : null;

  const renderWelcomePage = () => (
    <Card>
      <CardContent>
        <Stack spacing={3} alignItems="flex-start">
          <Stack spacing={1}>
            <Typography variant="h4">Welcome to BugTracer</Typography>
            <Typography color="text.secondary">
              Choose what you want to analyze from Azure DevOps. Bugs and defects focus on investigation.
              User stories focus on implementation guidance.
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button variant="contained" size="large" onClick={() => handleHeaderNavigate("/bugs")}>
              Show Bugs
            </Button>
            <Button variant="outlined" size="large" onClick={() => handleHeaderNavigate("/user-stories")}>
              Show User Stories
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Layout loading={loading} currentPath={pathname} onNavigate={handleHeaderNavigate}>
      <Stack spacing={3}>
        {route.page === "home" ? (
          renderWelcomePage()
        ) : (
          <>
            <Stack spacing={1}>
              <Typography variant="h4">{categoryMeta?.title}</Typography>
              <SearchBar
                label={categoryMeta?.searchLabel ?? "Search by Ticket ID"}
                placeholder={categoryMeta?.searchPlaceholder ?? "e.g. 2689652"}
                query={query}
                loading={loading}
                onQueryChange={setQuery}
                onSearch={handleSearch}
                onStop={handleStop}
              />
            </Stack>

            {error && <ErrorMessage message={error} />}

            {generatedAt && (
              <Typography variant="caption" color="text.secondary">
                Updated: {formatDate(generatedAt)}
              </Typography>
            )}

            {selectedTicket && (
              <Button variant="text" onClick={showLatestTickets} sx={{ alignSelf: "flex-start" }}>
                {categoryMeta?.backLabel}
              </Button>
            )}

            {tickets.length === 0 && !loading ? (
              <EmptyState message={categoryMeta?.emptyMessage} />
            ) : (
              <BugList
                bugs={tickets}
                onOpenBug={openTicket}
                selectedBugId={selectedTicket?.id}
                analysisLoading={analysisLoading}
                analysisError={analysisError}
                promptLoading={promptLoading}
                promptError={promptError}
                onGeneratePrompt={loadImplementationPrompt}
              />
            )}
          </>
        )}
      </Stack>
    </Layout>
  );
}
