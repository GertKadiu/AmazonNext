import "server-only";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from "node:crypto";
import { requireEnv } from "@/lib/env";

// Lexojmë konfigurimin një herë të vetme kur ngarkohet moduli.
// Nëse mungon diçka, dështojmë menjëherë me një mesazh të qartë,
// në vend që të marrim gabime të çuditshme nga AWS më vonë.
export const cognitoConfig = {
  region: requireEnv("AWS_REGION"),
  userPoolId: requireEnv("COGNITO_USER_POOL_ID"),
  clientId: requireEnv("COGNITO_CLIENT_ID"),
  // Secret-i është opsional: nëse app client-i u krijua pa secret, lëre bosh.
  clientSecret: process.env.COGNITO_CLIENT_SECRET || undefined,
};

// Një instancë e vetme e klientit, e ripërdorur nga të gjitha Server Actions.
// Nuk i japim kredenciale IAM sepse operacionet që përdorim (SignUp, InitiateAuth,
// ConfirmSignUp, GlobalSignOut...) janë "publike" — identifikohen me Client ID + Secret.
export const cognitoClient = new CognitoIdentityProviderClient({
  region: cognitoConfig.region,
});

/**
 * Kur app client-i ka secret, Cognito kërkon që çdo thirrje të përfshijë
 * një SECRET_HASH — provë që ne e njohim secret-in pa e dërguar atë vetë.
 *
 *   SECRET_HASH = Base64( HMAC-SHA256( key = clientSecret, message = username + clientId ) )
 *
 * Kthen `undefined` nëse nuk ka secret, që të mund ta kalojmë direkt si parametër.
 */
export function computeSecretHash(username: string): string | undefined {
  if (!cognitoConfig.clientSecret) return undefined;

  return createHmac("sha256", cognitoConfig.clientSecret)
    .update(username + cognitoConfig.clientId)
    .digest("base64");
}
