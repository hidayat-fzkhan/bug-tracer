import { useCallback, useRef, useState } from "react";
import { fetchBugAnalysis, fetchBugs } from "../services/api";
import type { ApiBug } from "../types";

export function useBugs() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [bugs, setBugs] = useState<ApiBug[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [selectedBugId, setSelectedBugId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const analysisAbortControllerRef = useRef<AbortController | null>(null);

  const loadAnalysis = useCallback(async (bugId: number) => {
    if (analysisAbortControllerRef.current) {
      analysisAbortControllerRef.current.abort();
    }

    const controller = new AbortController();
    analysisAbortControllerRef.current = controller;
    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      const data = await fetchBugAnalysis(bugId, controller.signal);
      setBugs((currentBugs) =>
        currentBugs.map((bug) =>
          bug.id === data.bugId
            ? {
                ...bug,
                aiAnalysis: data.aiAnalysis,
              }
            : bug,
        ),
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setAnalysisError("AI analysis cancelled");
      } else {
        setAnalysisError(err instanceof Error ? err.message : "Unknown AI analysis error");
      }
    } finally {
      setAnalysisLoading(false);
      if (analysisAbortControllerRef.current === controller) {
        analysisAbortControllerRef.current = null;
      }
    }
  }, []);

  const load = useCallback(async (bugId?: string) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (analysisAbortControllerRef.current) {
      analysisAbortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    setError(null);
    setAnalysisError(null);
    setAnalysisLoading(false);
    setSelectedBugId(bugId ?? null);
    try {
      const data = await fetchBugs(bugId, controller.signal);
      setBugs(data.bugs);
      setGeneratedAt(data.generatedAt);
      if (bugId && data.bugs.length === 1) {
        void loadAnalysis(data.bugs[0].id);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Request cancelled");
      } else {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setLoading(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [loadAnalysis]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (analysisAbortControllerRef.current) {
      analysisAbortControllerRef.current.abort();
    }
  };

  return {
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
  };
}
