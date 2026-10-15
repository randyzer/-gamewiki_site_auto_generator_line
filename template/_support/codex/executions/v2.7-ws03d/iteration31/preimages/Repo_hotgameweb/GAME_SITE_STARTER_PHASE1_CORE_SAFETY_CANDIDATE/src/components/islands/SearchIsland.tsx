import {
  type SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  buildSearchLocation,
  normalizeSearchResult,
  readSearchQuery,
  type RawSearchResult,
  type SearchResult,
} from "../../core/search-state";

interface PagefindHit {
  data: () => Promise<RawSearchResult>;
}

interface PagefindModule {
  init: () => Promise<void>;
  search: (query: string) => Promise<{ results: PagefindHit[] }>;
}

type SearchStatus = "idle" | "loading" | "ready" | "error";

export default function SearchIsland() {
  const pagefindRef = useRef<PagefindModule | null>(null);
  const requestRef = useRef(0);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<SearchStatus>("loading");

  async function runSearch(value: string, pagefind = pagefindRef.current) {
    const normalized = readSearchQuery(
      `?${new URLSearchParams({ q: value }).toString()}`,
    );
    const requestId = ++requestRef.current;
    setSubmittedQuery(normalized);

    if (!normalized) {
      setResults([]);
      setStatus("idle");
      return;
    }

    if (!pagefind) {
      setStatus("loading");
      return;
    }

    setStatus("loading");
    try {
      const response = await pagefind.search(normalized);
      const rawResults = await Promise.all(
        response.results.slice(0, 20).map((result) => result.data()),
      );
      if (requestId !== requestRef.current) return;

      setResults(
        rawResults.flatMap((result) => {
          const normalizedResult = normalizeSearchResult(result);
          return normalizedResult ? [normalizedResult] : [];
        }),
      );
      setStatus("ready");
    } catch {
      if (requestId === requestRef.current) {
        setResults([]);
        setStatus("error");
      }
    }
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const pagefindPath = "/pagefind/pagefind.js";
        const pagefind = (await import(
          /* @vite-ignore */ pagefindPath
        )) as PagefindModule;
        await pagefind.init();
        if (!active) return;

        pagefindRef.current = pagefind;
        const initialQuery = readSearchQuery(window.location.search);
        setQuery(initialQuery);
        await runSearch(initialQuery, pagefind);
      } catch {
        if (active) setStatus("error");
      }
    }

    void initialize();
    return () => {
      active = false;
      requestRef.current += 1;
    };
  }, []);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    window.history.replaceState(null, "", buildSearchLocation(query));
    void runSearch(query);
  }

  const statusMessage =
    status === "loading"
      ? "Searching the local index…"
      : status === "error"
        ? "The local search index could not be loaded. Try refreshing this page."
        : status === "ready" && submittedQuery
          ? `${results.length} result${results.length === 1 ? "" : "s"} for “${submittedQuery}”.`
          : "Enter a guide title, game term, or question.";

  return (
    <section className="search-console" aria-labelledby="search-console-title">
      <div className="search-console__status">
        <span className="signal-dot" aria-hidden="true" />
        <div>
          <p id="search-console-title">Local index online</p>
          <small>Queries stay in this browser and run against the static build.</small>
        </div>
      </div>

      <form action="/search/" role="search" onSubmit={handleSubmit}>
        <label htmlFor="query">Search published dispatches</label>
        <div>
          <input
            id="query"
            name="q"
            type="search"
            maxLength={120}
            placeholder="Try a guide title or topic"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          <button type="submit">Search</button>
        </div>
      </form>

      <p className="search-console__note" aria-live="polite">
        {statusMessage}
      </p>

      {status === "ready" && submittedQuery && results.length === 0 && (
        <div className="search-empty">
          <span aria-hidden="true">00</span>
          <p>No matching dispatches. Try a shorter or broader term.</p>
        </div>
      )}

      {results.length > 0 && (
        <ol className="search-results">
          {results.map((result, index) => (
            <li key={result.url}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <a href={result.url}>
                <strong>{result.title}</strong>
                <p>{result.excerpt}</p>
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
