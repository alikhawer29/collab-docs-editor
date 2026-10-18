import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/LoginScreen";
import { getCurrentUser } from "@/lib/auth";

function safeNext(value: string | undefined) {
  if (!value || !value.startsWith("/documents") || value.startsWith("//") || value.includes("\\")) {
    return "/documents";
  }
  return value;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const nextPath = safeNext((await searchParams).next);
  const user = await getCurrentUser();
  if (user) redirect(nextPath);
  return <LoginScreen nextPath={nextPath} />;
}
