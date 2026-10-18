import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-lg px-6 py-24">
      <h1 className="font-display text-4xl">That page is not in Folio</h1>
      <p className="mt-3 text-muted">The link may be old, or the document may have been removed.</p>
      <Link href="/documents" className="btn btn-primary mt-6">
        Back to documents
      </Link>
    </main>
  );
}
