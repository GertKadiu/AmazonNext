"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { syncUser } from "@/app/actions/auth";
import { ConfirmSchema, flattenFieldErrors } from "@/lib/definitions";
import { supabaseErrorMessage } from "@/lib/auth-errors";
import { Field, Button, Alert } from "@/components/ui";

export function ConfirmForm({ email }: { email: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resendPending, startResend] = useTransition();
  const [message, setMessage] = useState<string>();
  const [info, setInfo] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string[]>>();

  function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    setInfo(undefined);
    setErrors(undefined);

    const formData = new FormData(event.currentTarget);
    const parsed = ConfirmSchema.safeParse({
      email: formData.get("email"),
      code: formData.get("code"),
    });
    if (!parsed.success) {
      setErrors(flattenFieldErrors(parsed.error));
      return;
    }

    startTransition(async () => {
      const supabase = createClient();

      // `verifyOtp` bën dy gjëra njëherësh: konfirmon email-in DHE hap sesionin.
      // Prandaj pas tij përdoruesi është tashmë i loguar — nuk e çojmë më te
      // /login siç bënim me Cognito, por direkt te dashboard.
      const { error } = await supabase.auth.verifyOtp({
        email: parsed.data.email,
        token: parsed.data.code,
        type: "signup",
      });

      if (error) {
        setMessage(supabaseErrorMessage(error));
        return;
      }

      try {
        await syncUser();
      } catch (syncError) {
        console.error("[syncUser] dështoi (injorohet):", syncError);
      }

      router.push("/dashboard");
    });
  }

  function handleResend() {
    setMessage(undefined);
    setInfo(undefined);

    startResend(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({ type: "signup", email });

      if (error) {
        setMessage(supabaseErrorMessage(error));
        return;
      }
      setInfo("Kodi u ridërgua. Kontrollo email-in (edhe Spam).");
    });
  }

  return (
    <>
      <form onSubmit={handleConfirm}>
        {message && <Alert>{message}</Alert>}
        {info && <Alert kind="info">{info}</Alert>}

        <Field
          id="email"
          name="email"
          type="email"
          label="Email"
          defaultValue={email}
          autoComplete="email"
          required
          errors={errors?.email}
        />

        <Field
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          label="Kodi i verifikimit (6 shifra)"
          placeholder="123456"
          autoComplete="one-time-code"
          required
          errors={errors?.code}
        />

        <Button type="submit" pending={pending}>
          Konfirmo
        </Button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={resendPending}
          className="text-sm text-zinc-600 underline disabled:opacity-60 dark:text-zinc-400"
        >
          {resendPending ? "Duke dërguar..." : "Nuk more kod? Ridërgo"}
        </button>
      </div>
    </>
  );
}
