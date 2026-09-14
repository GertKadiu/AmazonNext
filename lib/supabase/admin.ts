import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

// Klienti ADMIN i Supabase — përdor SECRET key dhe ka të drejta të plota
// (anashkalon RLS). Prandaj:
//   - ekziston VETËM në server (`server-only` e ndalon importin nga browser-i)
//   - përdoret vetëm për migrimin: krijimin e përdoruesit me `id` = sub-i i Cognito-s
//
// `persistSession: false` sepse ky klient nuk i përket asnjë përdoruesi — është
// një mjet administrativ, nuk duhet të mbajë apo rifreskojë sesion.
export const supabaseAdmin = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SECRET_KEY"),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
