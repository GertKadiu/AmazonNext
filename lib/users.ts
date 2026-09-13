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
export async function recordLogin(user: SessionUser): Promise<UserRecord> {
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
