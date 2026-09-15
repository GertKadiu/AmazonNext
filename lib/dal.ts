import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readCognitoSession } from "@/lib/cognito";

// Data Access Layer.
//
// Gjatë migrimit aplikacioni pranon DY sesione:
//   1. Supabase — sistemi i ri, ka gjithmonë përparësi
//   2. Cognito  — URË KALIMTARE për ata që ishin të loguar para migrimit
//
// Askënd nuk e nxjerrim jashtë: sesioni i vjetër vlen derisa përdoruesi të dalë
// vetë. Kur të rihyjë, login-i e migron (shih app/actions/migrate.ts).
//
// Kur të mos ketë më sesione Cognito, hiqet dega e dytë dhe krejt lib/cognito.ts.

export type SessionUser = {
  /**
   * Për përdoruesit e Supabase-it: `id` i tyre — që për të migruarit është I
   * NJËJTI me `sub`-in e vjetër të Cognito-s. Për sesionet e mbetura të
   * Cognito-s: vetë `sub`-i. Pra tabela `Users` në DynamoDB përputhet në të dyja rastet.
   */
  userId: string;
  email: string;
  emailVerified: boolean;
  /** Nga cili sistem vjen sesioni — e dobishme për të matur ecurinë e migrimit. */
  provider: "supabase" | "cognito";
};

/**
 * Kthen përdoruesin e sesionit aktual, ose `null`. NUK bën redirect.
 *
 * Te Supabase përdorim `getUser()` dhe jo `getSession()`: ai e validon tokenin
 * te serveri, ndaj nuk i besojmë verbërisht cookie-s. Te Cognito verifikojmë
 * nënshkrimin e ID token-it me çelësat publikë të User Pool-it.
 *
 * `cache()` siguron një thirrje të vetme brenda të njëjtit render.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user) {
    return {
      userId: user.id,
      email: user.email ?? "",
      emailVerified: Boolean(user.email_confirmed_at),
      provider: "supabase",
    };
  }

  // Pa sesion Supabase → mos e nxirr jashtë; mund të jetë ende me Cognito.
  const legacy = await readCognitoSession();
  if (!legacy) return null;

  return { ...legacy, provider: "cognito" };
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
