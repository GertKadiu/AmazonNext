"use client";

import { useActionState } from "react";
import { confirmSignup, resendCode } from "@/app/actions/auth";
import { Field, Button, Alert } from "@/components/ui";

export function ConfirmForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(confirmSignup, undefined);
  const [resendState, resendAction, resendPending] = useActionState(
    resendCode,
    undefined
  );

  return (
    <>
      <form action={action}>
        {state?.message && <Alert>{state.message}</Alert>}
        {resendState?.message && (
          <Alert kind="info">{resendState.message}</Alert>
        )}

        <Field
          id="email"
          name="email"
          type="email"
          label="Email"
          defaultValue={email}
          autoComplete="email"
          required
          errors={state?.errors?.email}
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
          errors={state?.errors?.code}
        />

        <Button type="submit" pending={pending}>
          Konfirmo
        </Button>
      </form>

      {/* Formë e dytë, e pavarur, vetëm për ridërgimin e kodit.
          Ka input-in e vet të fshehur për email-in sepse çdo formë dërgon
          vetëm fushat e saj. */}
      <form action={resendAction} className="mt-4 text-center">
        <input type="hidden" name="email" value={email} />
        <button
          type="submit"
          disabled={resendPending}
          className="text-sm text-zinc-600 underline disabled:opacity-60 dark:text-zinc-400"
        >
          {resendPending ? "Duke dërguar..." : "Nuk more kod? Ridërgo"}
        </button>
      </form>
    </>
  );
}
