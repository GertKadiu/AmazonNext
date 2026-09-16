import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";
import { verifyCognitoIdToken } from "@/lib/cognito";
import type { SessionUser } from "@/lib/dal";

// ---------------------------------------------------------------------------
// Autentikim për API Routes — me header `Authorization`, jo me cookie.
//
// Dallimi nga lib/dal.ts: ai lexon sesionin nga cookie-t e kërkesës, sepse
// i shërben faqeve që render-ohen në server. Ky këtu merr një token që klienti
// e bashkëngjit SHPREHIMISHT, sepse i shërben thirrjeve nga browser-i.
//
// I njëjti aplikacion mund t'i mbajë të dyja: faqet me cookie, API-ja me Bearer.
// ---------------------------------------------------------------------------

// Klient PA cookie dhe pa sesion — e përdorim vetëm si verifikues tokenash.
const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** Nxjerr tokenin nga `Authorization: Bearer <token>`. */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

/**
 * Kthen përdoruesin nga tokeni i kërkesës, ose `null`.
 *
 * Pranon të dy sistemet, pikërisht si lib/dal.ts:
 *   1. Supabase — `getUser(token)` e validon te serveri i tyre
 *   2. Cognito  — urë kalimtare; verifikojmë nënshkrimin lokalisht
 *
 * Pa degën e dytë, përdoruesit që janë ende me sesion Cognito do të merrnin 401.
 */
export async function userFromBearer(
  request: Request
): Promise<SessionUser | null> {
  const token = bearerToken(request);
  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (!error && user) {
    return {
      userId: user.id,
      email: user.email ?? "",
      emailVerified: Boolean(user.email_confirmed_at),
      provider: "supabase",
    };
  }

  const legacy = await verifyCognitoIdToken(token);
  if (legacy) return { ...legacy, provider: "cognito" };

  return null;
}
