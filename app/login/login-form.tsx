"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import { Field, Button, Alert } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

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
        autoComplete="current-password"
        required
        errors={state?.errors?.password}
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
