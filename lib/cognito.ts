import "server-only";
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { requireEnv } from "@/lib/env";

// Konfigurimi i Cognito-s për anën e serverit.
//
// Pas kalimit te Supabase, Cognito luan vetëm një rol: burim i VJETËR identitetesh
// gjatë migrimit. Kur një përdorues nuk ekziston ende te Supabase, browser-i i
// verifikon kredencialet te Cognito me SRP dhe na sjell një ID token; ne e
// verifikojmë këtu dhe prej tij marrim `sub`-in që i japim përdoruesit të ri
// në Supabase. Sesioni i aplikacionit është GJITHMONË i Supabase-it.
export const cognitoConfig = {
  region: requireEnv("AWS_REGION"),
  userPoolId: requireEnv("COGNITO_USER_POOL_ID"),
  clientId: requireEnv("COGNITO_CLIENT_ID"),
};

/**
 * Verifikuesi i JWT-ve. Krijohet një herë (module-level) sepse brenda mban një
 * cache të çelësave publikë (JWKS) të User Pool-it.
 *
 * Kontrollon automatikisht: nënshkrimin, `iss` (pool-i ynë), `aud` (app client-i
 * ynë), `exp` dhe `token_use`.
 */
const idTokenVerifier = CognitoJwtVerifier.create({
  userPoolId: cognitoConfig.userPoolId,
  clientId: cognitoConfig.clientId,
  tokenUse: "id",
});

export type CognitoIdentity = {
  /** `sub` — identifikuesi unik. Bëhet `id` i përdoruesit në Supabase. */
  userId: string;
  email: string;
  emailVerified: boolean;
};

/**
 * Verifikon një ID token të Cognito-s dhe nxjerr prej tij identitetin.
 * Kthen `null` nëse tokeni është i falsifikuar, i skaduar, ose i lëshuar për një
 * User Pool / App Client tjetër.
 *
 * KJO është arsyeja pse migrimi është i sigurt: `sub`-in nuk e marrim nga ajo që
 * thotë klienti, por nga një token të cilit ia kemi verifikuar nënshkrimin me
 * çelësat publikë të Cognito-s.
 */
export async function verifyCognitoIdToken(
  idToken: string
): Promise<CognitoIdentity | null> {
  try {
    const payload = await idTokenVerifier.verify(idToken);
    return {
      userId: payload.sub,
      email: String(payload.email ?? ""),
      emailVerified: payload.email_verified === true,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// KONTROLLI I EKZISTENCËS — përdoret nga signup-i.
//
// Kujdes me kredencialet: operacionet që përdorte dikur ky projekt (SignUp,
// InitiateAuth, ConfirmSignUp...) janë PUBLIKE dhe nuk kërkojnë IAM. Por
// `AdminGetUser` është ADMINISTRATIV — duhet nënshkruar me SigV4, pra i duhen
// kredencialet IAM (po ato që përdor DynamoDB) dhe e drejta
// `cognito-idp:AdminGetUser` te politika e atij përdoruesi IAM.
// ---------------------------------------------------------------------------
const cognitoAdminClient = new CognitoIdentityProviderClient({
  region: cognitoConfig.region,
  credentials: {
    accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
  },
});

/**
 * Rezultati i kontrollit. `"unknown"` ekziston qëllimisht: kur nuk e dimë dot,
 * NUK guxojmë të supozojmë "nuk ekziston".
 */
export type LegacyLookup = "exists" | "not-found" | "unknown";

/**
 * A ekziston ky email te Cognito (sistemi i vjetër)?
 *
 * Pse na duhet: nëse një përdorues i vjetër shkon te /signup në vend të /login,
 * Supabase do t'i jepte një `id` KREJT TË RI — jo `sub`-in e tij — dhe rreshti i
 * tij në DynamoDB do të mbetej jetim. Duke e kapur këtu, e dërgojmë te login-i,
 * ku migrimi ruan `sub`-in e vjetër.
 *
 * Pse tri gjendje dhe jo `boolean`: nëse thirrja dështon (p.sh. mungon e drejta
 * IAM), kthimi i `false` do të thoshte "vazhdo me regjistrimin" — dhe do të
 * krijonim pikërisht identitetin e dyfishtë që duam të parandalojmë. Një dështim
 * i dukshëm dhe i riprovueshëm është shumë më i mirë se korruptim i heshtur.
 */
export async function lookupCognitoUser(email: string): Promise<LegacyLookup> {
  try {
    await cognitoAdminClient.send(
      new AdminGetUserCommand({
        UserPoolId: cognitoConfig.userPoolId,
        Username: email,
      })
    );
    return "exists";
  } catch (error) {
    const name = (error as { name?: string })?.name;
    if (name === "UserNotFoundException") return "not-found";

    console.error(
      "[cognito] AdminGetUser dështoi — kontrolli i përdoruesve të vjetër NUK po funksionon. " +
        "Shto të drejtën IAM `cognito-idp:AdminGetUser`:",
      error
    );
    return "unknown";
  }
}
