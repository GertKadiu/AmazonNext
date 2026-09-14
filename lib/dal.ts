import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Data Access Layer — sesioni i aplikacionit është tani GJITHMONË i Supabase-it.
// Cognito përdoret vetëm gjatë migrimit (shih app/actions/migrate.ts).

export type SessionUser = {
  /**
   * `id` i përdoruesit në Supabase. Për përdoruesit e migruar është I NJËJTI
   * me `sub`-in e vjetër të Cognito-s, prandaj tabela `Users` në DynamoDB
   * (e çelësuar me këtë vlerë) vazhdon të përputhet.
   */
  userId: string;
  email: string;
  emailVerified: boolean;
};

/**
 * Kthen përdoruesin e sesionit aktual, ose `null`. NUK bën redirect.
 *
 * Përdorim `getUser()` dhe jo `getSession()`: `getUser()` e validon tokenin te
 * serveri i Supabase, ndaj nuk i besojmë verbërisht përmbajtjes së cookie-s.
 *
 * `cache()` e React-it siguron një thirrje të vetme brenda të njëjtit render,
 * sado komponentë ta kërkojnë përdoruesin.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    emailVerified: Boolean(user.email_confirmed_at),
  };
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
