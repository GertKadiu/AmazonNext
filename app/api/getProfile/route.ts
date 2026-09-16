import { userFromBearer } from "@/lib/api-auth";
import { getUserRecord } from "@/lib/users";

// GET /api/getProfile
//
// Kthen fushat e profilit për përdoruesin e tokenit.
//
// Kthen VETËM profilin — jo `loginCount`, `createdAt` apo avatarin. Ato i jep
// /api/getDashboard. Çdo endpoint kthen atë që i duhet një ekrani të caktuar,
// në vend të një përgjigjeje të madhe që i shërben të gjithëve përgjysmë.
export async function GET(request: Request) {
  const user = await userFromBearer(request);

  if (!user) {
    return Response.json({ error: "I paautorizuar" }, { status: 401 });
  }

  try {
    const record = await getUserRecord(user.userId);

    // `null` dhe jo `undefined`: JSON.stringify i heq fushat `undefined`, dhe
    // klienti do të merrte një objekt me çelësa që mungojnë në vend të vlerave
    // bosh. Me `null` forma e përgjigjes mbetet gjithmonë e njëjtë.
    return Response.json({
      email: user.email,
      profile: {
        firstName: record?.firstName ?? null,
        lastName: record?.lastName ?? null,
        city: record?.city ?? null,
        bio: record?.bio ?? null,
        profileUpdatedAt: record?.profileUpdatedAt ?? null,
      },
    });
  } catch (error) {
    const name = (error as { name?: string })?.name ?? "UnknownError";
    console.error("[api/getProfile] dështoi:", error);

    return Response.json(
      { error: "Nuk u lexua dot profili.", code: name },
      { status: 500 }
    );
  }
}
