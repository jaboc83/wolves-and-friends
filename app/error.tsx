"use client";

import { useEffect } from "react";
import { recordComponentDiagnostic } from "../lib/feeds/feed-diagnostics";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void recordComponentDiagnostic("App component", error);
  }, [error]);

  return (
    <main className="app-error" role="alert">
      <h1>Something went wrong loading this section.</h1>
      <p>The error was saved in this browser&apos;s diagnostics.</p>
      <button type="button" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}
