import axios from "axios";
import { fetchAuthSession } from "aws-amplify/auth";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Klienti HTTP për thirrjet nga browser-i drejt API-së sonë.
//
// Ndryshe nga faqet e render-uara në server — të cilat e marrin sesionin nga
// cookie-t vetvetiu — këto thirrje e bashkëngjitin tokenin SHPREHIMISHT.
// ---------------------------------------------------------------------------

export const api = axios.create({ baseURL: "/api" });

/**
 * Tokeni aktual, nga cilido sistem që e mban sesionin.
 *
 * Thirret PARA çdo kërkese dhe kurrë nuk ruhet në një variabël: të dy SDK-të
 * e rifreskojnë tokenin kur ka skaduar, ndaj një vlerë e ruajtur do të vjetrohej
 * pa e marrë vesh.
 */
async function currentToken(): Promise<string | null> {
  // 1. Supabase — sistemi i ri
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
  } catch {
    // pa sesion Supabase — provo të vjetrin
  }

  // 2. Cognito — urë kalimtare për ata që s'janë migruar ende
  try {
    const { tokens } = await fetchAuthSession();
    return tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}

// Interceptor i kërkesës: vendos tokenin.
api.interceptors.request.use(async (config) => {
  const token = await currentToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor i përgjigjes: 401 do të thotë që sesioni ka vdekur vërtet —
// tokeni u rifreskua para dërgimit dhe prapë u refuzua.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
