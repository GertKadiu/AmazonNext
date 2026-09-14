"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  fetchAuthSession,
} from "aws-amplify/auth";
import { createClient } from "@/lib/supabase/client";
import { migrateCognitoUser } from "@/app/actions/migrate";
import { syncUser } from "@/app/actions/auth";
import { LoginSchema, flattenFieldErrors } from "@/lib/definitions";
import {
  authErrorMessage,
  supabaseErrorMessage,
  shouldTryCognito,
} from "@/lib/auth-errors";
import { Field, Button, Alert } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string[]>>();

  /** Hapat e përbashkët pas çdo login-i të suksesshëm te Supabase. */
  async function finishLogin() {
    try {
      await syncUser();
    } catch (syncError) {
      console.error("[syncUser] dështoi (injorohet):", syncError);
    }
    router.push("/dashboard");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    setErrors(undefined);

    const formData = new FormData(event.currentTarget);
    const parsed = LoginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) {
      setErrors(flattenFieldErrors(parsed.error));
      return;
    }
    const { email, password } = parsed.data;

    startTransition(async () => {
      const supabase = createClient();

      // ---- 1. Rruga normale: përdoruesi është tashmë te Supabase -------------
      const { error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!supabaseError) {
        await finishLogin();
        return;
      }

      // Biem te Cognito VETËM nëse Supabase tha konkretisht që kredencialet
      // s'përputhen. Për gabime të tjera (email i pakonfirmuar, limit kërkesash,
      // rrjet) s'ka kuptim të trokasim te sistemi i vjetër — do ta ngadalësonim
      // login-in dhe do t'ia fshihnim përdoruesit shkakun e vërtetë.
      if (!shouldTryCognito(supabaseError)) {
        setMessage(supabaseErrorMessage(supabaseError));
        return;
      }

      // ---- 2. Nuk ekziston te Supabase → provo Cognito (burimi i vjetër) -----
      //    Nëse kredencialet janë të sakta atje, e migrojmë në heshtje.
      try {
        const { isSignedIn, nextStep } = await cognitoSignIn({
          username: email,
          password,
          options: { authFlowType: "USER_SRP_AUTH" },
        });

        if (!isSignedIn) {
          if (nextStep.signInStep === "CONFIRM_SIGN_UP") {
            router.push(`/confirm?email=${encodeURIComponent(email)}`);
            return;
          }
          setMessage(`Kërkohet një hap shtesë: ${nextStep.signInStep}`);
          return;
        }

        // ---- 3. Migro: sub-i merret nga ID token-i, i verifikuar në server ---
        const { tokens } = await fetchAuthSession();
        const idToken = tokens?.idToken?.toString();
        if (!idToken) {
          setMessage("Nuk u mor dot identiteti nga Cognito. Provo përsëri.");
          return;
        }

        const result = await migrateCognitoUser(idToken, password);

        // Cognito nuk na duhet më për këtë përdorues — mbyll sesionin e tij që
        // të mos mbeten tokena të vjetër në browser.
        await cognitoSignOut().catch(() => {});

        if (!result.ok) {
          setMessage(result.error);
          return;
        }

        // ---- 4. Tani përdoruesi ekziston te Supabase → hyr normalisht -------
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (retryError) {
          setMessage("Migrimi u krye, por login-i dështoi. Provo edhe një herë.");
          return;
        }

        await finishLogin();
      } catch (error) {
        // Cognito e refuzoi gjithashtu → kredencialet janë vërtet të gabuara.
        setMessage(authErrorMessage(error));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {message && <Alert>{message}</Alert>}

      <Field
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        errors={errors?.email}
      />

      <Field
        id="password"
        name="password"
        type="password"
        label="Fjalëkalimi"
        autoComplete="current-password"
        required
        errors={errors?.password}
      />

      <Button type="submit" pending={pending}>
        Hyr
      </Button>

      <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Nuk ke llogari?{" "}
        <Link href="/signup" className="font-medium underline">
          Regjistrohu
        </Link>
      </p>
    </form>
  );
}
