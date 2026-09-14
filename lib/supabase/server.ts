import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireEnv } from "@/lib/env";

// Klienti i Supabase për SERVER — Server Components, Server Actions, Route Handlers.
// Lexon të njëjtat cookie që vendos klienti i browser-it, ndaj sesioni është i
// përbashkët midis të dyja anëve.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Thirrur nga një Server Component, ku cookie-t NUK shkruhen dot.
            // Nuk është problem: proxy.ts e rifreskon sesionin në çdo kërkesë
            // dhe i rishkruan cookie-t atje. Pikërisht ky rast na prishi më parë
            // përgjigjet RSC me Amplify — këtu trajtohet qartë.
          }
        },
      },
    }
  );
}
