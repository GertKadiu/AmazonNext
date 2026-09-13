import { NextResponse, type NextRequest } from "next/server";

// Proxy ekzekutohet PARA çdo faqeje, për çdo request që përputhet me `matcher`.
// Këtu bëjmë vetëm një kontroll "optimist" — a ekziston cookie-ja e sesionit? —
// dhe ridrejtojmë përdoruesin në vendin e duhur. NUK verifikojmë JWT-në këtu:
//   1. Proxy ekzekutohet edhe për prefetch-e, pra shumë herë; e duam sa më të lehtë.
//   2. Mbrojtja e vërtetë (verifikimi i nënshkrimit) bëhet në lib/dal.ts,
//      afër të dhënave. Nëse cookie-ja ekziston por tokeni është i falsifikuar
//      ose i skaduar, `verifySession()` e kap dhe bën redirect gjithsesi.
// Kjo quhet "defense in depth": dy shtresa, secila me detyrën e vet.

const protectedRoutes = ["/dashboard"];
const authRoutes = ["/login", "/signup", "/confirm"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("id_token")?.value);

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r));

  // I paloguar që kërkon faqe të mbrojtur → te login
  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // I loguar që hap login/signup → s'ka kuptim, e çojmë te dashboard
  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Ekzekutohet për çdo rrugë PËRVEÇ skedarëve statikë dhe imazheve.
  // Pa këtë përjashtim, proxy do të ekzekutohej edhe për CSS/JS/favicon.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
