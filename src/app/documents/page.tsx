import { redirect } from "next/navigation";
import { DocumentHome } from "@/components/DocumentHome";
import { getCurrentUser } from "@/lib/auth";
import { listDocuments } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const lists = listDocuments(user.id);
  return <DocumentHome user={user} owned={lists.owned} shared={lists.shared} />;
}
