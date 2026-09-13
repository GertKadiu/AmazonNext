import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { cognitoConfig } from "@/lib/cognito";
import { getSessionTokens } from "@/lib/session";

/**
 * Verifikuesi i JWT-ve. Krijohet një herë të vetme (module-level) sepse
 * brenda mban një cache të çelësave publikë (JWKS) të User Pool-it —
 * i shkarkon në thirrjen e parë dhe i ripërdor pas kësaj.
 *
 * Ai kontrollon automatikisht:
 *   - nënshkrimin (me çelësin publik të Cognito-s)
 *   - `iss` → që tokeni vjen pikërisht nga User Pool-i YNË
 *   - `aud` → që tokeni u lëshua për App Client-in TONË
 *   - `exp` → që nuk ka skaduar
 *   - `token_use` → që është ID token (jo access token)
 */
const idTokenVerifier = CognitoJwtVerifier.create({
  userPoolId: cognitoConfig.userPoolId,
  clientId: cognitoConfig.clientId,
  tokenUse: "id",
});

export type SessionUser = {
  userId: string; // `sub` — identifikuesi unik dhe i pandryshueshëm i përdoruesit
  email: string;
  emailVerified: boolean;
};

/**
 * Verifikon sesionin aktual dhe kthen përdoruesin, ose `null` nëse nuk ka
 * sesion të vlefshëm. NUK bën redirect — e përdorim kur duam të vendosim vetë
 * çfarë të bëjmë (p.sh. në faqen kryesore: shfaq "Login" ose "Dashboard").
 *
 * `cache()` e React-it siguron që brenda të njëjtit render, edhe nëse 5 komponentë
 * e thërrasin këtë funksion, verifikimi bëhet vetëm një herë.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const { idToken } = await getSessionTokens();
  if (!idToken) return null;

  try {
    const payload = await idTokenVerifier.verify(idToken);
    return {
      userId: payload.sub,
      email: String(payload.email ?? ""),
      emailVerified: payload.email_verified === true,
    };
  } catch {
    // Token i falsifikuar, i skaduar, ose i lëshuar për një User Pool tjetër.
    // E trajtojmë njësoj si "nuk ka sesion".
    return null;
  }
});

/**
 * Për faqe që KËRKOJNË login. Nëse nuk ka sesion, dërgon te /login.
 * Kthen gjithmonë një përdorues — TypeScript-i e di që nuk është null pas kësaj.
 */
export const verifySession = cache(async (): Promise<SessionUser> => {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
});
