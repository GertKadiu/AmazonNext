"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAvatarUpload, confirmAvatarUpload } from "@/app/actions/avatar";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

export function AvatarUpload({ hasAvatar }: { hasAvatar: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage(undefined);

    // Kontroll i shpejtë para se të bëjmë ndonjë thirrje. Serveri dhe S3 i
    // zbatojnë sërish të njëjtat kufij — ky është vetëm për mesazh të menjëhershëm.
    if (!ALLOWED_TYPES.includes(file.type)) {
      setMessage("Lejohen vetëm JPEG, PNG dhe WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setMessage("Fotoja duhet të jetë nën 2 MB.");
      return;
    }

    startTransition(async () => {
      // 1. Kërko lejen. Serveri e nxjerr çelësin nga sesioni, jo nga ne.
      const ticket = await createAvatarUpload(file.type);
      if (!ticket.ok) {
        setMessage(ticket.error);
        return;
      }

      // 2. Ngarko DIREKT te S3. Skedari nuk kalon fare nga serveri ynë.
      const form = new FormData();
      for (const [name, value] of Object.entries(ticket.fields)) {
        form.append(name, value);
      }
      // Fusha `file` duhet të jetë E FUNDIT — S3 i injoron fushat pas saj.
      form.append("file", file);

      let uploaded: Response;
      try {
        // Pa header `Content-Type`: browser-i duhet ta vendosë vetë bashkë me
        // kufirin e multipart-it.
        uploaded = await fetch(ticket.url, { method: "POST", body: form });
      } catch {
        setMessage("Ngarkimi dështoi. Kontrollo lidhjen.");
        return;
      }

      if (!uploaded.ok) {
        console.error("[avatar] S3 ktheu", uploaded.status, await uploaded.text());
        setMessage("S3 e refuzoi ngarkimin.");
        return;
      }

      // 3. Tani që skedari është atje, shënoje në DynamoDB.
      const confirmed = await confirmAvatarUpload(file.type);
      if (!confirmed.ok) {
        setMessage("Fotoja u ngarkua, por nuk u ruajt dot te profili.");
        return;
      }

      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="avatar"
        className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
      >
        {hasAvatar ? "Ndrysho foton" : "Shto një foto"}
      </label>

      <input
        ref={inputRef}
        id="avatar"
        name="avatar"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        disabled={pending}
        className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700 disabled:opacity-60 dark:text-zinc-400 dark:file:bg-zinc-50 dark:file:text-zinc-900 dark:hover:file:bg-zinc-300"
      />

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        JPEG, PNG ose WebP · deri në 2 MB
      </p>

      {pending && (
        <p className="text-xs text-zinc-600 dark:text-zinc-400">Duke ngarkuar...</p>
      )}
      {message && (
        <p className="text-xs text-red-600 dark:text-red-400">{message}</p>
      )}
    </div>
  );
}
