"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "@/app/actions/auth";
import { Field, Button, Alert } from "@/components/ui";

export function SignupForm() {
  // useActionState lidh formën me Server Action-in:
  //   state   → çfarë ktheu action-i herën e fundit (gabimet)
  //   action  → funksioni që i japim <form action={...}>
  //   pending → true ndërsa action-i po ekzekutohet (për të çaktivizuar butonin)
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <form action={action}>
      {state?.message && <Alert>{state.message}</Alert>}

      <Field
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        errors={state?.errors?.email}
      />

      <Field
        id="password"
        name="password"
        type="password"
        label="Fjalëkalimi"
        autoComplete="new-password"
        required
        errors={state?.errors?.password}
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
