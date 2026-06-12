"use client";

import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
      <p className="msb-card-title">Error</p>
      <h1 className="mt-2 text-2xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-sm text-zinc-400">
        The play got called off. Try again — if it keeps happening, let the
        commissioner know.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-zinc-600">Error code: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="msb-btn-primary mt-6 px-4 py-2"
      >
        Try again
      </button>
    </div>
  );
}
