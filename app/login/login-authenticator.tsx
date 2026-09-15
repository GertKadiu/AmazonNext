"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import {
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  fetchAuthSession,
  type SignInInput,
  type SignInOutput,
} from "aws-amplify/auth";
import { createClient } from "@/lib/supabase/client";
import { migrateCognitoUser } from "@/app/actions/migrate";
import { syncUser } from "@/app/actions/auth";
import { supabaseErrorMessage, shouldTryCognito } from "@/lib/auth-errors";

// ---------------------------------------------------------------------------
// Authenticator i Amplify-t si UI, POR me migrimin tonë të paprekur.
//
// Çelësi është `services.handleSignIn`: ai merr { username, password } përpara
// se Amplify t'i dërgojë te Cognito — pra fjalëkalimi është i kapshëm, gjë që
// migrimi e kërkon patjetër (Supabase duhet ta hash-ojë vetë).
//
// `hideSignUp` — regjistrimi NUK kalon nga këtu. Authenticator-i do ta çonte te
// Cognito, ndërsa ne duam që përdoruesit e rinj të lindin direkt te Supabase.
// Prandaj mbajmë faqen tonë /signup.
// ---------------------------------------------------------------------------

export function LoginAuthenticator() {
  const router = useRouter();

  /**
   * Kur hyrja përfundon me sukses te Supabase, largohemi nga faqja.
   *
   * Kthejmë një Promise që nuk zgjidhet KURRË qëllimisht: makina e gjendjeve e
   * Authenticator-it është e lidhur me Cognito dhe do të ngatërrohej nëse i
   * thoshim "u hyr" pa pasur sesion Cognito. Duke mos u zgjidhur, butoni mbetet
   * në gjendje "duke pritur" derisa navigimi ta çmontojë komponentin — që është
   * pikërisht sjellja që duket normale për përdoruesin.
   */
  async function leaveForDashboard(): Promise<SignInOutput> {
    try {
      await syncUser();
    } catch (error) {
      console.error("[syncUser] dështoi (injorohet):", error);
    }
    router.push("/dashboard");
    return new Promise<SignInOutput>(() => {});
  }

  async function handleSignIn(input: SignInInput): Promise<SignInOutput> {
    const email = input.username.trim().toLowerCase();
    const password = input.password ?? "";
    const supabase = createClient();

    // ---- 1. Rruga normale: përdoruesi është tashmë te Supabase --------------
    const { error: supabaseError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!supabaseError) {
      return leaveForDashboard();
    }

    // Biem te Cognito VETËM nëse Supabase tha konkretisht që kredencialet
    // s'përputhen. Gabimet e tjera i shfaqim ashtu siç janë.
    if (!shouldTryCognito(supabaseError)) {
      throw new Error(supabaseErrorMessage(supabaseError));
    }

    // ---- 2. Provo Cognito (burimi i vjetër) --------------------------------
    // Pastro çdo sesion të mbetur, që `signIn` të mos hedhë
    // UserAlreadyAuthenticatedException.
    await cognitoSignOut().catch(() => {});

    // Gabimet e Cognito-s i lëmë të dalin: Authenticator-i i shfaq vetë bukur.
    const result = await cognitoSignIn({
      username: email,
      password,
      options: { authFlowType: "USER_SRP_AUTH" },
    });

    // Nëse Cognito kërkon një hap tjetër (p.sh. konfirmim llogarie), ia kthejmë
    // përgjigjen Authenticator-it — ai e di ta trajtojë vetë.
    if (!result.isSignedIn) {
      return result;
    }

    // ---- 3. Migro te Supabase me të njëjtin `sub` --------------------------
    const { tokens } = await fetchAuthSession();
    const idToken = tokens?.idToken?.toString();
    if (!idToken) {
      throw new Error("Nuk u mor dot identiteti nga Cognito. Provo përsëri.");
    }

    const migration = await migrateCognitoUser(idToken, password);

    // Cognito nuk na duhet më për këtë përdorues.
    await cognitoSignOut().catch(() => {});

    if (!migration.ok) {
      throw new Error(migration.error);
    }

    // ---- 4. Tani ekziston te Supabase → hyr normalisht ---------------------
    const { error: retryError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (retryError) {
      throw new Error("Migrimi u krye, por login-i dështoi. Provo edhe një herë.");
    }

    return leaveForDashboard();
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 p-6 dark:bg-black">
      <Authenticator hideSignUp services={{ handleSignIn }}>
        {/* Shfaqet vetëm në çastin midis hyrjes dhe navigimit. */}
        {() => <p className="text-sm text-zinc-600">Duke të çuar te dashboard...</p>}
      </Authenticator>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Nuk ke llogari?{" "}
        <Link href="/signup" className="font-medium underline">
          Regjistrohu
        </Link>
      </p>
    </div>
  );
}
