"use server";

import { lookupCognitoUser, type LegacyLookup } from "@/lib/cognito";

/**
 * Kontrollon nëse email-i i përket një përdoruesi të VJETËR të Cognito-s.
 *
 * Signup-i e thërret PARA se të krijojë llogari te Supabase. Nëse përgjigja
 * është `"exists"`, nuk e regjistrojmë — e dërgojmë te login-i, sepse vetëm atje
 * ruhet `sub`-i i vjetër (shih app/actions/migrate.ts) dhe të dhënat e tij në
 * DynamoDB mbeten të lidhura.
 *
 * `"unknown"` do të thotë që kontrolli vetë dështoi; edhe atëherë signup-i
 * ndalet, sepse të vazhdosh verbërisht do të rrezikonte identitet të dyfishtë.
 *
 * E mbajmë në server sepse `AdminGetUser` kërkon kredenciale IAM, të cilat nuk
 * guxojnë kurrë të shkojnë në browser.
 */
export async function checkLegacyUser(
  email: string
): Promise<{ status: LegacyLookup }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { status: "not-found" };

  return { status: await lookupCognitoUser(normalized) };
}
