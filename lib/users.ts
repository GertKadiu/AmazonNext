import "server-only";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, USERS_TABLE } from "@/lib/dynamodb";
import type { SessionUser } from "@/lib/dal";

/**
 * Një rresht në tabelën `Users`.
 *
 * Çelësi kryesor (partition key) është `userId` = `sub`-i i Cognito-s.
 * E përdorim atë dhe jo email-in sepse `sub` nuk ndryshon KURRË, ndërsa
 * email-in përdoruesi mund ta ndërrojë më vonë.
 *
 * Kujdes: Cognito mbetet burimi i vërtetës për identitetin dhe fjalëkalimin.
 * DynamoDB këtu mban vetëm të dhënat e aplikacionit tonë rreth përdoruesit.
 * Fjalëkalime NUK ruhen kurrë këtu.
 */
export type UserRecord = {
  userId: string;
  email: string;
  emailVerified: boolean;
  createdAt: string; // ISO 8601, hera e parë që u pa ky përdorues
  lastLoginAt: string; // ISO 8601, login-i i fundit
  loginCount: number;

  // Avatari. Skedari vetë rri në S3 (bucket privat); këtu mbajmë vetëm faktin
  // që ekziston dhe llojin e tij. Çelësi i objektit nxirret nga `userId`,
  // ndaj nuk ka nevojë të ruhet.
  avatarContentType?: string;
  avatarUpdatedAt?: string; // ISO 8601; mungesa e saj do të thotë "pa avatar"

  // Profili — të dhëna që i shkruan vetë përdoruesi. Të gjitha opsionale:
  // rreshti krijohet në login-in e parë, shumë kohë para se dikush ta plotësojë
  // profilin. Kodi që i lexon duhet të presë `undefined`.
  firstName?: string;
  lastName?: string;
  bio?: string;
  city?: string;
  profileUpdatedAt?: string; // ISO 8601; mungesa do të thotë "pa prekur ende"
};

/** Fushat që përdoruesi mund t'i ndryshojë. Vini re: `email` NUK është këtu. */
export type ProfileInput = {
  firstName?: string;
  lastName?: string;
  bio?: string;
  city?: string;
};

/**
 * "Upsert": krijon rreshtin nëse s'ekziston, përditëson nëse ekziston.
 * Një thirrje e vetme, pa `if (ekziston) ... else ...` — DynamoDB e bën
 * gjithçka atomike brenda `UpdateCommand`:
 *
 *   - `if_not_exists(createdAt, :now)` → shkruan `createdAt` VETËM herën e parë
 *   - `ADD loginCount :one`           → fushë numërore; nëse mungon, nis nga 0
 *
 * `ExpressionAttributeNames` (#email, #createdAt...) janë alias-e. DynamoDB ka
 * një listë të gjatë fjalësh të rezervuara (name, status, count...) dhe alias-i
 * na kursen befasi nëse nesër shtojmë një fushë me emër të tillë.
 */
export async function recordLogin(
  user: Pick<SessionUser, "userId" | "email" | "emailVerified">
): Promise<UserRecord> {
  const now = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId: user.userId },
      UpdateExpression:
        "SET #email = :email, #emailVerified = :emailVerified, " +
        "#lastLoginAt = :now, #createdAt = if_not_exists(#createdAt, :now) " +
        "ADD #loginCount :one",
      ExpressionAttributeNames: {
        "#email": "email",
        "#emailVerified": "emailVerified",
        "#lastLoginAt": "lastLoginAt",
        "#createdAt": "createdAt",
        "#loginCount": "loginCount",
      },
      ExpressionAttributeValues: {
        ":email": user.email,
        ":emailVerified": user.emailVerified,
        ":now": now,
        ":one": 1,
      },
      // Na kthen rreshtin ashtu siç mbeti PAS përditësimit.
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes as UserRecord;
}

/** Lexon një rresht sipas `userId`. Kthen `null` nëse s'ekziston ende. */
export async function getUserRecord(
  userId: string
): Promise<UserRecord | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId },
    })
  );

  return (result.Item as UserRecord | undefined) ?? null;
}

/**
 * Shënon se përdoruesi ka avatar. Thirret PAS ngarkimit të suksesshëm te S3.
 *
 * Përdor `UpdateCommand` me çelësin ekzistues, pra nuk prek asnjë fushë tjetër
 * të rreshtit — `loginCount`, `createdAt` dhe të tjerat mbeten si ishin.
 */
export async function setAvatar(
  userId: string,
  contentType: string
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression:
        "SET #avatarContentType = :contentType, #avatarUpdatedAt = :now",
      ExpressionAttributeNames: {
        "#avatarContentType": "avatarContentType",
        "#avatarUpdatedAt": "avatarUpdatedAt",
      },
      ExpressionAttributeValues: {
        ":contentType": contentType,
        ":now": new Date().toISOString(),
      },
    })
  );
}

/**
 * Ruan fushat e profilit.
 *
 * Ndryshe nga `setAvatar`, ku fushat janë gjithmonë të njëjtat, këtu përdoruesi
 * mund të dërgojë vetëm një pjesë — p.sh. vetëm `city`. Prandaj `UpdateExpression`
 * ndërtohet DINAMIKISHT nga çelësat që erdhën vërtet.
 *
 * Pse jo `PutCommand`: ai e zëvendëson gjithë rreshtin. Do të fshinte
 * `loginCount`, `createdAt` dhe avatarin. `UpdateCommand` prek vetëm ato fusha
 * që përmend shprehimisht.
 *
 * Fushat bosh fshihen me `REMOVE` në vend që të ruhen si string bosh — kështu
 * "pa qytet" dhe "qytet bosh" mbeten e njëjta gjendje, dhe leximi mbetet i thjeshtë.
 */
export async function setProfile(
  userId: string,
  input: ProfileInput
): Promise<UserRecord> {
  const FIELDS = ["firstName", "lastName", "bio", "city"] as const;

  const sets: string[] = ["#profileUpdatedAt = :now"];
  const removes: string[] = [];
  const names: Record<string, string> = {
    "#profileUpdatedAt": "profileUpdatedAt",
  };
  const values: Record<string, unknown> = { ":now": new Date().toISOString() };

  for (const field of FIELDS) {
    const raw = input[field];
    if (raw === undefined) continue; // fusha nuk u dërgua fare → mos e prek

    const trimmed = raw.trim();
    names[`#${field}`] = field;

    if (trimmed === "") {
      removes.push(`#${field}`);
    } else {
      sets.push(`#${field} = :${field}`);
      values[`:${field}`] = trimmed;
    }
  }

  const expression =
    `SET ${sets.join(", ")}` +
    (removes.length ? ` REMOVE ${removes.join(", ")}` : "");

  const result = await docClient.send(
    new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: expression,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes as UserRecord;
}
