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

// Përkthen gabimet e Amplify/Cognito-s në mesazhe të kuptueshme shqip.
//
// KY skedar është i sigurt për browser (pa `server-only`): gabimet e login/signup
// tani ndodhin te klienti. Amplify e ruan emrin origjinal të exception-it të
// Cognito-s te `error.name`, prandaj e kapim po sipas `name`-it — njësoj si më parë.
export function authErrorMessage(error: unknown): string {
  const err = (error ?? {}) as {
    name?: string;
    message?: string;
    recoverySuggestion?: string;
    underlyingError?: unknown;
  };
  const { name = "", message = "" } = err;

  // Në konsolën e browser-it lëmë gjithmonë emrin + mesazhin origjinal (plus
  // sugjerimin dhe gabimin e brendshëm të Amplify-t), që të jetë e lehtë të
  // kuptohet çfarë shkoi keq gjatë zhvillimit.
  console.error(`[Amplify] ${name}: ${message}`, {
    recoverySuggestion: err.recoverySuggestion,
    underlyingError: err.underlyingError,
  });

  // Gabim tipik konfigurimi: app client-i ka secret, por SRP në browser kërkon
  // një klient PUBLIK (pa secret). E raportojmë qartë që të mos humbet kohë.
  if (message.toLowerCase().includes("secret")) {
    return "Konfigurim i gabuar: App Client-i ka client secret. SRP në browser kërkon një klient PUBLIK (pa secret).";
  }

  switch (name) {
    case "UsernameExistsException":
      return "Ky email është i regjistruar tashmë.";
    case "InvalidPasswordException":
      return "Fjalëkalimi nuk plotëson rregullat e sigurisë.";
    case "NotAuthorizedException":
      return "Email ose fjalëkalim i gabuar.";
    case "UserNotFoundException":
      return "Nuk ekziston asnjë llogari me këtë email.";
    case "UserNotConfirmedException":
      return "Llogaria nuk është konfirmuar ende. Kontrollo email-in për kodin.";
    case "CodeMismatchException":
      return "Kodi i verifikimit është i gabuar.";
    case "ExpiredCodeException":
      return "Kodi ka skaduar. Kërko një kod të ri.";
    case "TooManyRequestsException":
    case "LimitExceededException":
      return "Shumë përpjekje. Provo përsëri pas pak minutash.";
    case "UserAlreadyAuthenticatedException":
      return "Je tashmë i loguar. Rifresko faqen.";
    case "UnexpectedSignInInterruptionException":
      return "Login-i u ndërpre pas verifikimit. Zakonisht: çaktivizo 'Device tracking' te User Pool-i (Sign-in → Device tracking → Don't remember).";
    default:
      return "Ndodhi një gabim. Provo përsëri.";
  }
}
