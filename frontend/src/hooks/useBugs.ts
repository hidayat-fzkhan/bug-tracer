import { useEffect, useState } from "react";
import { fetchBugs } from "../services/api";
import type { ApiBug } from "../types";

export function useBugs() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bugs, setBugs] = useState<ApiBug[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const load = async (bugId?: string) => {
    // Cancel any ongoing request
    if (abortController) {
      abortController.abort();
    }

    const controller = new AbortController();
    setAbortController(controller);
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBugs(bugId, controller.signal);
      setBugs(data.bugs);
      setGeneratedAt(data.generatedAt);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Request cancelled");
      } else {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return {
    query,
    setQuery,
    loading,
    error,
    bugs,
    generatedAt,
    load,
    handleStop,
  };
}
