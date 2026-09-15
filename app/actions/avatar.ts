"use server";

import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getCurrentUser } from "@/lib/dal";
import { s3Client, AVATARS_BUCKET, avatarKey } from "@/lib/s3";
import { setAvatar } from "@/lib/users";

// Kufijtë zbatohen NË TË DYJA anët: te browser-i për një mesazh të shpejtë,
// dhe këtu te kushtet e presigned POST-it, ku S3 i detyron vërtet.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export type UploadTicket =
  | { ok: true; url: string; fields: Record<string, string> }
  | { ok: false; error: string };

/**
 * Përgatit një leje të përkohshme që browser-i ta ngarkojë foton DIREKT te S3.
 *
 * Pse jo përmes serverit: funksionet e Netlify-t kanë kufi payload-i rreth 6 MB
 * dhe timeout të shkurtër. Duke e dërguar skedarin drejt te S3, serveri ynë
 * prek vetëm disa qindra bajt.
 *
 * SIGURIA: çelësi i objektit ndërtohet nga `userId` i SESIONIT të verifikuar,
 * kurrë nga diçka që dërgon klienti. Pra askush nuk shkruan dot mbi avatarin e
 * tjetrit, sado ta ndryshojë kërkesën. I njëjti parim si te verifikimi i tokenit.
 */
export async function createAvatarUpload(
  contentType: string
): Promise<UploadTicket> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Nuk je i loguar." };

  if (!ALLOWED_TYPES.includes(contentType)) {
    return { ok: false, error: "Lejohen vetëm JPEG, PNG dhe WebP." };
  }

  try {
    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: AVATARS_BUCKET,
      Key: avatarKey(user.userId),
      Conditions: [
        // S3 e refuzon vetë ngarkimin nëse skedari e kalon këtë madhësi —
        // kjo është arsyeja pse përdorim presigned POST dhe jo PUT, i cili
        // nuk e kufizon dot madhësinë.
        ["content-length-range", 1, MAX_BYTES],
        ["eq", "$Content-Type", contentType],
      ],
      Fields: { "Content-Type": contentType },
      Expires: 60,
    });

    return { ok: true, url, fields };
  } catch (error) {
    console.error("[avatar] presigned post dështoi:", error);
    return { ok: false, error: "Nuk u përgatit dot ngarkimi. Provo përsëri." };
  }
}

/**
 * Thirret pasi ngarkimi te S3 ka përfunduar. Shënon në DynamoDB se përdoruesi
 * ka avatar dhe çfarë lloji është.
 *
 * E mbajmë të ndarë nga ngarkimi sepse S3-ja dhe tabela jonë janë dy sisteme:
 * nëse ngarkimi dështon, nuk duam të kemi shënuar një avatar që s'ekziston.
 */
export async function confirmAvatarUpload(
  contentType: string
): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  try {
    await setAvatar(user.userId, contentType);
    return { ok: true };
  } catch (error) {
    console.error("[avatar] ruajtja në DynamoDB dështoi:", error);
    return { ok: false };
  }
}
