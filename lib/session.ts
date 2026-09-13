import "server-only";
import { cookies } from "next/headers";

// Emrat e cookie-ve — i mbajmë në një vend që të mos i shkruajmë gabim diku.
const COOKIE = {
  idToken: "id_token",
  accessToken: "access_token",
  refreshToken: "refresh_token",
} as const;

export type SessionTokens = {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
};

// Opsionet e sigurisë që i vendosim ÇDO cookie-je të sesionit:
//   httpOnly  → JavaScript-i i browser-it NUK mund ta lexojë (mbrojtje nga XSS)
//   secure    → dërgohet vetëm me HTTPS (në dev, localhost lejohet pa HTTPS)
//   sameSite  → "lax": nuk dërgohet në kërkesa POST nga faqe të tjera (mbrojtje nga CSRF)
//   path      → vlen për të gjithë aplikacionin
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Thirret pas një login-i të suksesshëm (ose pas refresh-it të tokenave).
 * `cookies()` mund të SHKRUAJË vetëm brenda Server Actions, Route Handlers ose Proxy —
 * jo gjatë render-imit të një Server Component.
 */
export async function setSessionCookies(tokens: SessionTokens) {
  const cookieStore = await cookies();

  // ID dhe Access token skadojnë pas 1 ore (default në Cognito). Cookie-n e bëjmë
  // pak më jetëgjatë (30 ditë) që të mos humbasë para refresh-it; vlefshmëria e
  // vërtetë kontrollohet gjithmonë nga nënshkrimi + `exp` brenda JWT-së.
  const thirtyDays = 60 * 60 * 24 * 30;

  cookieStore.set(COOKIE.idToken, tokens.idToken, {
    ...cookieOptions,
    maxAge: thirtyDays,
  });
  cookieStore.set(COOKIE.accessToken, tokens.accessToken, {
    ...cookieOptions,
    maxAge: thirtyDays,
  });

  // Refresh token nuk kthehet gjithmonë (p.sh. gjatë vetë refresh-it), prandaj është opsional.
  if (tokens.refreshToken) {
    cookieStore.set(COOKIE.refreshToken, tokens.refreshToken, {
      ...cookieOptions,
      maxAge: thirtyDays,
    });
  }
}

/** Lexon tokenat nga cookie-t. Kthen `null` për secilin që mungon. */
export async function getSessionTokens() {
  const cookieStore = await cookies();
  return {
    idToken: cookieStore.get(COOKIE.idToken)?.value ?? null,
    accessToken: cookieStore.get(COOKIE.accessToken)?.value ?? null,
    refreshToken: cookieStore.get(COOKIE.refreshToken)?.value ?? null,
  };
}

/** Thirret në logout. */
export async function clearSessionCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE.idToken);
  cookieStore.delete(COOKIE.accessToken);
  cookieStore.delete(COOKIE.refreshToken);
}
