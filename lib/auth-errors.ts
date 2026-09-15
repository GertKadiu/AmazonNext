// ---------------------------------------------------------------------------
// SUPABASE — sistemi i ri. Gabimet vijnë me një `code` të qëndrueshëm; e
// përdorim atë dhe biem te teksti vetëm si rezervë.
// ---------------------------------------------------------------------------

/** Kodet që do të thonë "kredencialet s'përputhen ose përdoruesi s'ekziston". */
const INVALID_CREDENTIALS = new Set(["invalid_credentials", "user_not_found"]);

/**
 * A duhet të provojmë Cognito-n pas një dështimi te Supabase?
 *
 * VETËM kur Supabase thotë konkretisht që kredencialet s'përputhen. Për çdo
 * gabim tjetër (email i pakonfirmuar, limit kërkesash, problem rrjeti) nuk ka
 * kuptim të trokasim edhe te sistemi i vjetër — do ta ngadalësonim login-in dhe
 * do ta fshihnim shkakun e vërtetë nga përdoruesi.
 */
export function shouldTryCognito(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code) return INVALID_CREDENTIALS.has(code);

  const message = (error as { message?: string })?.message ?? "";
  return /invalid login credentials/i.test(message);
}

export function supabaseErrorMessage(error: unknown): string {
  const err = (error ?? {}) as { code?: string; message?: string };
  const { code = "", message = "" } = err;

  console.error(`[Supabase] ${code}: ${message}`);

  switch (code) {
    case "invalid_credentials":
    case "user_not_found":
      return "Email ose fjalëkalim i gabuar.";
    case "email_not_confirmed":
      return "Llogaria nuk është konfirmuar ende. Kontrollo email-in për kodin.";
    case "user_already_exists":
    case "email_exists":
      return "Ky email është i regjistruar tashmë.";
    case "otp_expired":
      return "Kodi ka skaduar. Kërko një kod të ri.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Shumë përpjekje. Provo përsëri pas pak minutash.";
    case "weak_password":
      return "Fjalëkalimi nuk plotëson rregullat e sigurisë.";
    case "signup_disabled":
      return "Regjistrimet janë të çaktivizuara.";
    default:
      // Kodet e OTP-së të gabuar vijnë ndonjëherë vetëm si tekst.
      if (/token has expired or is invalid|invalid token/i.test(message)) {
        return "Kodi i verifikimit është i gabuar ose ka skaduar.";
      }
      return "Ndodhi një gabim. Provo përsëri.";
  }
}
