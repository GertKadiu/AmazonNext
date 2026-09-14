"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { checkLegacyUser } from "@/app/actions/signup";
import { syncUser } from "@/app/actions/auth";
import { SignupSchema, flattenFieldErrors } from "@/lib/definitions";
import { supabaseErrorMessage } from "@/lib/auth-errors";
import { Field, Button, Alert } from "@/components/ui";

export function SignupForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string[]>>();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    setErrors(undefined);

    const formData = new FormData(event.currentTarget);
    const parsed = SignupSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) {
      setErrors(flattenFieldErrors(parsed.error));
      return;
    }
    const { email, password } = parsed.data;

    startTransition(async () => {
      // ---- 1. A është përdorues i vjetër i Cognito-s? ----------------------
      //    Nëse po, NUK e regjistrojmë: do të merrte një `id` të ri dhe do të
      //    humbte lidhjen me të dhënat e veta. E dërgojmë te login-i, ku
      //    migrimi ia ruan `sub`-in e vjetër.
      const { status } = await checkLegacyUser(email);

      if (status === "exists") {
        setMessage(
          "Ky email është i regjistruar tashmë. Hyr me fjalëkalimin tënd të zakonshëm — llogaria kalon vetvetiu te sistemi i ri."
        );
        return;
      }

      // Kontrolli dështoi (zakonisht mungon e drejta IAM `AdminGetUser`).
      // NUK vazhdojmë: nëse ky email ekziston te Cognito, regjistrimi do t'i
      // jepte një ID të re dhe do t'i shkëpuste të dhënat përgjithmonë.
      // Shkaku i saktë shfaqet te logu i serverit.
      if (status === "unknown") {
        setMessage(
          "Nuk u verifikua dot nëse ekziston një llogari e mëparshme. Provo pas pak."
        );
        return;
      }

      // ---- 2. Përdorues krejt i ri → direkt te Supabase ---------------------
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setMessage(supabaseErrorMessage(error));
        return;
      }

      // Kur email-i ekziston tashmë te Supabase, ai nuk hedh gabim (që të mos
      // zbulohet se cilët email janë të regjistruar) — por e kthen përdoruesin
      // me listë identitetesh BOSH. Ky është sinjali për "ekziston".
      if (data.user && data.user.identities?.length === 0) {
        setMessage("Ky email është i regjistruar tashmë. Provo të hysh.");
        return;
      }

      // Nëse te Supabase "Confirm email" është i ÇAKTIVIZUAR, `signUp` e kthen
      // sesionin menjëherë — përdoruesi është tashmë brenda dhe s'ka kod për të
      // pritur. Në atë rast dërgimi te /confirm do të ishte qorrsokak.
      if (data.session) {
        try {
          await syncUser();
        } catch (syncError) {
          console.error("[syncUser] dështoi (injorohet):", syncError);
        }
        router.push("/dashboard");
        return;
      }

      router.push(`/confirm?email=${encodeURIComponent(email)}`);
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
        autoComplete="new-password"
        required
        errors={errors?.password}
      />

      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        Min. 8 karaktere, me shkronjë të madhe, të vogël, numër dhe simbol.
      </p>

      <Button type="submit" pending={pending}>
        Regjistrohu
      </Button>

      <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Ke llogari?{" "}
        <Link href="/login" className="font-medium underline">
          Hyr
        </Link>
      </p>
    </form>
  );
}
