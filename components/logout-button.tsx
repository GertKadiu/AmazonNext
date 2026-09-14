"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Logout i sesionit të Supabase-it (sesioni i vetëm i aplikacionit).
// Sesioni i Cognito-s mbyllet menjëherë pas migrimit te login-form, ndaj këtu
// nuk ka nevojë të preket më.
export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } finally {
        router.push("/login");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="w-full rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
    >
      {pending ? "Duke dalë..." : "Dil"}
    </button>
  );
}
