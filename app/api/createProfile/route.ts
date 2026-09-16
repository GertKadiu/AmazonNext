import { userFromBearer } from "@/lib/api-auth";
import { setProfile } from "@/lib/users";
import { ProfileSchema, flattenFieldErrors } from "@/lib/definitions";

// POST /api/createProfile
//
// Ruan fushat e profilit për përdoruesin e tokenit.
//
// SIGURIA: `userId` merret nga tokeni i verifikuar, KURRË nga trupi i kërkesës.
// Po ta pranonim nga klienti, kushdo do të shkruante mbi profilin e tjetrit
// thjesht duke ndryshuar një fushë JSON. I njëjti parim si te çelësi i avatarit
// në S3 dhe te `sub`-i gjatë migrimit.
export async function POST(request: Request) {
  const user = await userFromBearer(request);

  if (!user) {
    return Response.json({ error: "I paautorizuar" }, { status: 401 });
  }

  // Trupi mund të mos jetë JSON i vlefshëm — kjo vjen nga jashtë, ndaj nuk i
  // besojmë as formatit.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Trup i pavlefshëm JSON." }, { status: 400 });
  }

  const parsed = ProfileSchema.safeParse(body);
  if (!parsed.success) {
    // 400 dhe jo 500: gabimi është i dërguesit, jo i yni. Kthejmë edhe fushat
    // konkrete, që formulari t'i shfaqë pranë secilit input.
    return Response.json(
      { error: "Të dhëna të pavlefshme.", fields: flattenFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const record = await setProfile(user.userId, parsed.data);

    return Response.json({
      ok: true,
      profile: {
        firstName: record.firstName ?? null,
        lastName: record.lastName ?? null,
        bio: record.bio ?? null,
        city: record.city ?? null,
        profileUpdatedAt: record.profileUpdatedAt ?? null,
      },
    });
  } catch (error) {
    const name = (error as { name?: string })?.name ?? "UnknownError";
    console.error("[api/createProfile] dështoi:", error);

    // Emri i gabimit mjafton për diagnozë dhe nuk zbulon asgjë sekrete —
    // pikërisht kështu e gjetëm `InvalidSignatureException` më parë.
    return Response.json(
      { error: "Nuk u ruajt dot profili.", code: name },
      { status: 500 }
    );
  }
}
