import Link from "next/link";
import { Mark } from "./Mark";
import { UserMenu } from "./UserMenu";
import type { PublicUser } from "@/lib/types";

export function Header({ user }: { user: PublicUser }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/documents" className="flex items-center gap-2 font-display text-xl">
          <Mark />
          Folio
        </Link>
        <UserMenu user={user} />
      </div>
    </header>
  );
}
