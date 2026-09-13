"use server";

import { redirect } from "next/navigation";
import {
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  InitiateAuthCommand,
  GlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { cognitoClient, cognitoConfig, computeSecretHash } from "@/lib/cognito";
import {
  setSessionCookies,
  getSessionTokens,
  clearSessionCookies,
} from "@/lib/session";
import {
  SignupSchema,
  LoginSchema,
  ConfirmSchema,
  type FormState,
} from "@/lib/definitions";
import type { ZodError } from "zod";

// ---------------------------------------------------------------------------
// Ndihmës: përkthen gabimet e Cognito-s në mesazhe të kuptueshme.
// Cognito hedh exception-e me emra si "UsernameExistsException"; ne i kapim
// sipas `name` dhe kthejmë tekst në shqip. Çdo gabim tjetër → mesazh gjenerik
// (nuk i zbulojmë përdoruesit detaje të brendshme).
// ---------------------------------------------------------------------------
function cognitoErrorMessage(error: unknown): string {
  const { name = "", message = "" } = (error as { name?: string; message?: string }) ?? {};

  // Në terminal shfaqim GJITHMONË emrin + mesazhin origjinal të Cognito-s —
  // është mënyra më e shpejtë për të kuptuar çfarë shkoi keq gjatë zhvillimit.
  console.error(`[Cognito] ${name}: ${message}`);

  // Gabime KONFIGURIMI (faji ynë / i AWS setup-it, jo i përdoruesit).
  // I raportojmë qartë që të mos humbasim kohë duke kërkuar gabimin në vend të gabuar.
  if (message.includes("USER_PASSWORD_AUTH flow not enabled")) {
    return "Konfigurim i gabuar: aktivizo ALLOW_USER_PASSWORD_AUTH te App Client-i në AWS Console.";
  }
  if (message.includes("secret hash")) {
    return "Konfigurim i gabuar: COGNITO_CLIENT_SECRET nuk përputhet me App Client-in.";
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
    default:
      return "Ndodhi një gabim. Provo përsëri.";
  }
}

// ---------------------------------------------------------------------------
// 1. SIGNUP — krijon përdoruesin në User Pool.
//    Cognito e krijon me status UNCONFIRMED dhe i dërgon një kod 6-shifror me email.
// ---------------------------------------------------------------------------
export async function signup(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // 1. Validimi
  const parsed = SignupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: z_flatten(parsed.error) };
  }
  const { email, password } = parsed.data;

  // 2. Thirrja në Cognito
  try {
    await cognitoClient.send(
      new SignUpCommand({
        ClientId: cognitoConfig.clientId,
        SecretHash: computeSecretHash(email),
        Username: email,
        Password: password,
        UserAttributes: [{ Name: "email", Value: email }],
      })
    );
  } catch (error) {
    return { message: cognitoErrorMessage(error) };
  }

  // 3. Sukses → dërgojmë te faqja e konfirmimit, me email-in në URL që
  //    përdoruesi të mos e shkruajë sërish.
  redirect(`/confirm?email=${encodeURIComponent(email)}`);
}

// ---------------------------------------------------------------------------
// 2. CONFIRM SIGNUP — përdoruesi fut kodin që mori me email.
//    Pas kësaj statusi bëhet CONFIRMED dhe mund të bëjë login.
// ---------------------------------------------------------------------------
export async function confirmSignup(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = ConfirmSchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return { errors: z_flatten(parsed.error) };
  }
  const { email, code } = parsed.data;

  try {
    await cognitoClient.send(
      new ConfirmSignUpCommand({
        ClientId: cognitoConfig.clientId,
        SecretHash: computeSecretHash(email),
        Username: email,
        ConfirmationCode: code,
      })
    );
  } catch (error) {
    return { message: cognitoErrorMessage(error) };
  }

  redirect("/login?confirmed=1");
}

// ---------------------------------------------------------------------------
// 2b. RESEND CODE — nëse email-i nuk mbërriti ose kodi skadoi (vlen 24 orë).
// ---------------------------------------------------------------------------
export async function resendCode(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { message: "Mungon email-i." };

  try {
    await cognitoClient.send(
      new ResendConfirmationCodeCommand({
        ClientId: cognitoConfig.clientId,
        SecretHash: computeSecretHash(email),
        Username: email,
      })
    );
    return { message: "Kodi u ridërgua. Kontrollo email-in (edhe Spam)." };
  } catch (error) {
    return { message: cognitoErrorMessage(error) };
  }
}

// ---------------------------------------------------------------------------
// 3. LOGIN — rrjedha USER_PASSWORD_AUTH.
//    Dërgojmë email + password te Cognito; nëse janë të sakta, ai kthen
//    IdToken, AccessToken dhe RefreshToken. I ruajmë në cookie httpOnly.
// ---------------------------------------------------------------------------
export async function login(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: z_flatten(parsed.error) };
  }
  const { email, password } = parsed.data;

  // Për USER_PASSWORD_AUTH, SECRET_HASH kalon brenda AuthParameters (jo si fushë
  // e veçantë si te SignUp). AuthParameters është Record<string, string>, prandaj
  // e shtojmë çelësin vetëm nëse ka vërtet secret.
  const secretHash = computeSecretHash(email);
  const authParameters: Record<string, string> = {
    USERNAME: email,
    PASSWORD: password,
  };
  if (secretHash) authParameters.SECRET_HASH = secretHash;

  try {
    const response = await cognitoClient.send(
      new InitiateAuthCommand({
        ClientId: cognitoConfig.clientId,
        AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: authParameters,
      })
    );

    // Cognito mund të kthejë një "challenge" (p.sh. NEW_PASSWORD_REQUIRED për
    // përdorues të krijuar nga admin-i, ose MFA). Për këtë projekt nuk i trajtojmë,
    // por e raportojmë qartë që të mos mbetemi pa e kuptuar.
    const result = response.AuthenticationResult;
    if (!result?.IdToken || !result.AccessToken) {
      return {
        message: `Cognito kërkon një hap shtesë (${response.ChallengeName ?? "i panjohur"}) që nuk është implementuar.`,
      };
    }

    await setSessionCookies({
      idToken: result.IdToken,
      accessToken: result.AccessToken,
      refreshToken: result.RefreshToken,
    });
  } catch (error) {
    return { message: cognitoErrorMessage(error) };
  }

  redirect("/dashboard");
}

// ---------------------------------------------------------------------------
// 4. LOGOUT — dy hapa:
//    a) GlobalSignOut te Cognito: anulon Refresh Token-in (dhe Access Token-in)
//       në anën e AWS, që të mos mund të përdoren më edhe nëse dikush i ka vjedhur.
//    b) Fshijmë cookie-t lokale.
//    Nëse (a) dështon (p.sh. tokeni ka skaduar tashmë), vazhdojmë me (b) gjithsesi.
// ---------------------------------------------------------------------------
export async function logout() {
  const { accessToken } = await getSessionTokens();

  if (accessToken) {
    try {
      await cognitoClient.send(
        new GlobalSignOutCommand({ AccessToken: accessToken })
      );
    } catch (error) {
      console.warn("[Cognito] GlobalSignOut dështoi (injorohet):", error);
    }
  }

  await clearSessionCookies();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Ndihmës i vogël: kthen gabimet e Zod në formën { email: [...], password: [...] }
// ---------------------------------------------------------------------------
function z_flatten(error: ZodError) {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
