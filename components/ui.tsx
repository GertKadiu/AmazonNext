import type { ComponentProps } from "react";

// Komponentë të thjeshtë të stilizuar me Tailwind. Nuk kanë 'use client' —
// mund të përdoren si nga Server ashtu edhe nga Client Components.

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {children}
      </div>
    </div>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
      {children}
    </h1>
  );
}

export function Field({
  label,
  errors,
  ...inputProps
}: ComponentProps<"input"> & { label: string; errors?: string[] }) {
  return (
    <div className="mb-4">
      <label
        htmlFor={inputProps.id}
        className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </label>
      <input
        {...inputProps}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
      />
      {errors?.map((e) => (
        <p key={e} className="mt-1 text-xs text-red-600 dark:text-red-400">
          {e}
        </p>
      ))}
    </div>
  );
}

export function Button({
  pending,
  children,
  ...props
}: ComponentProps<"button"> & { pending?: boolean }) {
  return (
    <button
      {...props}
      disabled={pending || props.disabled}
      className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
    >
      {pending ? "Duke pritur..." : children}
    </button>
  );
}

export function Alert({
  kind = "error",
  children,
}: {
  kind?: "error" | "success" | "info";
  children: React.ReactNode;
}) {
  const styles = {
    error:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
    success:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300",
    info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  }[kind];

  return (
    <div className={`mb-4 rounded-md border px-3 py-2 text-sm ${styles}`}>
      {children}
    </div>
  );
}
