import { createBrowserClient } from "@supabase/ssr";

// Klienti i Supabase për BROWSER (client components).
//
// Përdor vetëm publishable key — çelës publik, i destinuar për browser.
// Sesionin e ruan në cookie, të cilat i lexon edhe serveri përmes
// @/lib/supabase/server. Kështu i njëjti sesion shihet nga të dyja anët.
//
// Referencat e process.env duhen shkruar plot (jo me kllapa dinamike) që
// Next.js t'i zëvendësojë me vlerën gjatë build-it në bundle-in e browser-it.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Mungon NEXT_PUBLIC_SUPABASE_URL ose NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY te .env.local"
    );
  }

  return createBrowserClient(url, key);
}
