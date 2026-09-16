import { userFromBearer } from "@/lib/api-auth";
import { getUserRecord } from "@/lib/users";
import { signedAvatarUrl } from "@/lib/s3";

// GET /api/getDashboard
//
// Kthen gjithçka që i duhet dashboard-it: identitetin nga tokeni, rreshtin nga
// DynamoDB, dhe një URL të nënshkruar për avatarin.
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

  // Deri këtu s'është prekur asnjë kredencial IAM: Supabase verifikohet me
  // rrjet, Cognito me çelësa publikë. Thirrjet e mëposhtme janë të PARAT që
  // përdorin vërtet IAM-in — ndaj këtu shfaqen gabimet e konfigurimit.
  try {
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
  } catch (error) {
    const name = (error as { name?: string })?.name ?? "UnknownError";

    // Logu i plotë shkon te serveri (Amplify → Monitoring → Logs).
    console.error("[api/getDashboard] dështoi:", error);

    // Te klienti kthejmë vetëm EMRIN e gabimit — mjafton për diagnozë dhe nuk
    // zbulon asgjë sekrete. Pa këtë, dështimi del si 500 bosh dhe s'ka nga t'ia
    // nisësh.
    return Response.json(
      { error: "Nuk u lexuan dot të dhënat.", code: name },
      { status: 500 }
    );
  }
}
