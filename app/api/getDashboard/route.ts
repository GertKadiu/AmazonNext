import { userFromBearer } from "@/lib/api-auth";
import { getUserRecord } from "@/lib/users";
import { signedAvatarUrl } from "@/lib/s3";

// GET /api/me
//
// Kthen gjithçka që i duhet dashboard-it për përdoruesin aktual:
// identitetin nga tokeni, rreshtin nga DynamoDB, dhe një URL të nënshkruar
// për avatarin.
//
// URL-ja e avatarit gjenerohet KËTU sepse bucket-i është privat dhe nënshkrimi
// kërkon kredenciale IAM — të cilat browser-i nuk guxon t'i ketë kurrë.
export async function GET(request: Request) {
  const user = await userFromBearer(request);

  if (!user) {
    // 401 dhe jo 403: mesazhi është "s'të njoh", jo "s'të lejoj".
    // Interceptor-i te lib/api-client.ts e kap pikërisht këtë kod.
    return Response.json({ error: "I paautorizuar" }, { status: 401 });
  }

  const record = await getUserRecord(user.userId);

  const avatarUrl = record?.avatarUpdatedAt
    ? await signedAvatarUrl(user.userId)
    : null;

  return Response.json({
    user: {
      userId: user.userId,
      email: user.email,
      emailVerified: user.emailVerified,
      provider: user.provider,
    },
    record,
    avatarUrl,
  });
}
