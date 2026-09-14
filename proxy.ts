import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Proxy ekzekutohet PARA çdo faqeje. Ka dy detyra:
//
//  1. RIFRESKON sesionin e Supabase-it. Tokenat skadojnë; këtu ata rifreskohen
//     dhe cookie-t rishkruhen. Kjo është arsyeja pse Server Components mund të
//     lexojnë sesionin pa pasur nevojë të shkruajnë cookie vetë (gjë që s'e bëjnë dot).
//
//  2. Një kontroll i shpejtë mbrojtjeje për rrugët private. Mbrojtja e vërtetë
//     bëhet gjithsesi te lib/dal.ts, afër të dhënave ("defense in depth").

const protectedRoutes = ["/dashboard"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Kjo thirrje edhe validon edhe rifreskon sesionin. Mos e hiq dhe mos shto
  // kod midis krijimit të klientit dhe saj — përndryshe sesioni mund të mbetet pa u rifreskuar.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // KUJDES: nuk bëjmë ridrejtimin e kundërt (i loguar te /login → /dashboard).
  // Më parë ai, i kombinuar me kontrollin e mësipërm, krijonte lak ridrejtimesh.

  return response;
}

export const config = {
  // Ekzekutohet për çdo rrugë PËRVEÇ skedarëve statikë dhe imazheve.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
