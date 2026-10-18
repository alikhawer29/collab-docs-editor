import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AccessMessage } from "@/components/AccessMessage";
import { DocumentEditor } from "@/components/DocumentEditor";
import { getCurrentUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { getDocument } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const user = await getCurrentUser();
  if (!user) return { title: "Document" };
  try {
    const document = getDocument(user.id, (await params).id);
    return { title: document.title };
  } catch {
    return { title: "Document" };
  }
}

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  if (!id) notFound();

  try {
    const document = getDocument(user.id, id);
    return <DocumentEditor document={document} currentUser={user} />;
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      return <AccessMessage title="No document here" body={error.message} />;
    }
    if (error instanceof HttpError && error.status === 403) {
      return <AccessMessage title="You do not have access" body={error.message} />;
    }
    throw error;
  }
}
