// Konfigurimi i Amplify për Cognito.
//
// KY skedar përdoret NGA TË DYJA anët — browser DHE server — prandaj NUK ka
// `server-only` dhe vlerat vijnë nga variabla `NEXT_PUBLIC_*` (të vetmet që
// Next.js i fut edhe në bundle-in e browser-it).
//
// KUJDES: SRP në browser kërkon një App Client PUBLIK, pra PA client secret.
// Amplify-i që xhiron te klienti nuk mund ta mbajë dot një secret të fshehtë;
// nëse app client-i yt ka secret, krijo një të ri pa të dhe vendos ID-n e tij te
// NEXT_PUBLIC_COGNITO_CLIENT_ID. Rajoni merret automatikisht nga prefiksi i
// User Pool ID-së (p.sh. `eu-west-2_XXXX`), prandaj nuk e japim veças.

import type { ResourcesConfig } from "aws-amplify";

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Mungon ${name}. Shtoje te .env.local (duhet të nisë me NEXT_PUBLIC_).`
    );
  }
  return value;
}

export const authConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      // Referencat duhen shkruar plot (jo me kllapa dinamike) që Next.js t'i
      // zëvendësojë me vlerën gjatë build-it edhe në bundle-in e browser-it.
      userPoolId: required(
        "NEXT_PUBLIC_COGNITO_USER_POOL_ID",
        process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID
      ),
      userPoolClientId: required(
        "NEXT_PUBLIC_COGNITO_CLIENT_ID",
        process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID
      ),
      loginWith: { email: true },
    },
  },
};
