import Link from "next/link";

export function AccessMessage({ title, body }: { title: string; body: string }) {
  return (
    <main id="main" className="mx-auto max-w-lg px-6 py-24">
      <p className="font-display text-2xl text-pine-800">Folio</p>
      <h1 className="mt-3 font-display text-4xl">{title}</h1>
      <p className="mt-3 text-lg text-muted">{body}</p>
      <Link href="/documents" className="btn btn-primary mt-6">
        Back to documents
      </Link>
    </main>
  );
}
