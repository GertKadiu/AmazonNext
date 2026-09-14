"use server";

import { createClient } from "@/lib/supabase/server";
import { recordLogin } from "@/lib/users";

/**
 * Thirret nga login-form-i pas çdo hyrjeje të suksesshme te Supabase.
 * Lexon sesionin nga cookie-t dhe bën upsert-in në DynamoDB.
 *
 * `userId` është `id`-ja e Supabase-it, që për përdoruesit e migruar është i
 * njëjti me `sub`-in e vjetër të Cognito-s — ndaj rreshtat ekzistues në tabelë
 * vazhdojnë të përputhen pa asnjë ndryshim.
 *
 * Gjithçka është best-effort: login-i ka përfunduar tashmë, ndaj asnjë dështim
 * këtu nuk duhet t'i dalë përdoruesit si gabim.
 */
export async function syncUser(): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.warn("[syncUser] Nuk ka sesion Supabase — u anashkalua.");
      return;
    }

    await recordLogin({
      userId: user.id,
      email: user.email ?? "",
      emailVerified: Boolean(user.email_confirmed_at),
    });
  } catch (error) {
    console.error("[syncUser] dështoi (injorohet):", error);
  }
}
