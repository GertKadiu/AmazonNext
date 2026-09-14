"use server";

import { verifyCognitoIdToken } from "@/lib/cognito";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type MigrationResult = { ok: true } | { ok: false; error: string };

/**
 * MIGRIM I PËRTUAR (lazy migration) i një përdoruesi nga Cognito te Supabase.
 *
 * Thirret VETËM kur login-i te Supabase dështoi dhe ai te Cognito pati sukses.
 * Përdoruesi nuk e vëren fare: nuk merr email, nuk i kërkohet asgjë.
 *
 * Rrjedha:
 *   1. Browser-i verifikon kredencialet te Cognito me SRP dhe merr një ID token.
 *   2. E dërgon këtu bashkë me fjalëkalimin.
 *   3. Ne e VERIFIKOJMË tokenin (nënshkrim + iss + aud + exp) → marrim `sub`-in.
 *   4. Krijojmë përdoruesin në Supabase me TË NJËJTIN `sub` si `id`.
 *
 * Pse i njëjti `sub`: tabela `Users` në DynamoDB është e çelësuar me `userId` =
 * sub-i i Cognito-s. Duke e ruajtur, të gjitha të dhënat ekzistuese vazhdojnë
 * të përputhen pa asnjë migrim të dytë.
 *
 * Pse na duhet fjalëkalimi këtu: Supabase duhet ta hash-ojë VETË atë (hash-in e
 * Cognito-s AWS nuk e ekspozon). Kalon nga serveri vetëm KËTË herë të vetme, mbi
 * HTTPS, dhe nuk ruhet askund nga ne.
 */
export async function migrateCognitoUser(
  idToken: string,
  password: string
): Promise<MigrationResult> {
  const identity = await verifyCognitoIdToken(idToken);
  if (!identity) {
    return { ok: false, error: "Tokeni i Cognito-s është i pavlefshëm." };
  }

  const { error } = await supabaseAdmin.auth.admin.createUser({
    id: identity.userId, // <- i njëjti sub si te Cognito
    email: identity.email,
    password,
    // Email-i është verifikuar tashmë nga Cognito → mos dërgo email konfirmimi.
    email_confirm: true,
    user_metadata: {
      migrated_from: "cognito",
      migrated_at: new Date().toISOString(),
    },
  });

  if (error) {
    // Nëse përdoruesi ekziston tashmë (p.sh. dy dritare njëkohësisht, ose një
    // provë e mëparshme që mbeti përgjysmë), për ne s'është gabim — vazhdojmë
    // me login-in te Supabase.
    const alreadyExists =
      error.status === 422 ||
      /already (been )?registered|already exists/i.test(error.message);

    if (!alreadyExists) {
      console.error("[migrim] createUser dështoi:", error);
      return { ok: false, error: "Migrimi te Supabase dështoi. Provo përsëri." };
    }
  }

  return { ok: true };
}
