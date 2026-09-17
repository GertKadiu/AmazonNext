import "server-only";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireEnv } from "@/lib/env";

// Bucket-i i avatarëve. PRIVAT — asnjë objekt nuk lexohet pa një URL të nënshkruar.
export const AVATARS_BUCKET = requireEnv("S3_AVATARS_BUCKET");

export const s3Client = new S3Client({
  region: requireEnv("APP_AWS_REGION"),
  credentials: {
    accessKeyId: requireEnv("APP_AWS_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("APP_AWS_SECRET_ACCESS_KEY"),
  },
});

/**
 * Çelësi i objektit për një përdorues.
 *
 * Deterministik dhe pa prapashtesë: një ngarkim i ri e ZËVENDËSON të vjetrin,
 * pra ka gjithmonë saktësisht një objekt për përdorues dhe s'mbeten skedarë
 * jetimë kur dikush ndërron nga PNG në JPEG. Lloji i skedarit ruhet si metadata
 * te vetë objekti dhe si fushë në DynamoDB.
 */
export function avatarKey(userId: string): string {
  return `avatars/${userId}`;
}

/**
 * URL e përkohshme për ta SHFAQUR avatarin.
 *
 * Bucket-i është privat, ndaj `<img src>` nuk mund të tregojë drejt te S3.
 * Kjo krijon një link të nënshkruar që skadon — mjafton sa për ta vizatuar faqen.
 */
export async function signedAvatarUrl(
  userId: string,
  expiresInSeconds = 900
): Promise<string> {
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: AVATARS_BUCKET, Key: avatarKey(userId) }),
    { expiresIn: expiresInSeconds }
  );
}
