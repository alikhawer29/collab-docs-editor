"use client";

export default function ErrorScreen({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-lg px-6 py-24">
      <h1 className="font-display text-4xl">Something went wrong</h1>
      <p className="mt-3 text-muted">{error.message || "Folio could not finish that request."}</p>
      <button type="button" className="btn btn-primary mt-6" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
