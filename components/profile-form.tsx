"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { api } from "@/lib/api-client";
import { ProfileSchema, flattenFieldErrors } from "@/lib/definitions";
import { Field, Button, Alert } from "@/components/ui";

// ---------------------------------------------------------------------------
// Profili, plotësisht përmes API-së:
//
//   GET  /api/getProfile     → mbush fushat
//   POST /api/createProfile  → ruan ndryshimet
//
// Faqja nuk prek më DynamoDB. Serveri i shërben vetëm mbrojtjes së rrugës;
// të dhënat vijnë e shkojnë me axios.
// ---------------------------------------------------------------------------

type ProfileResponse = {
  email: string;
  profile: {
    firstName: string | null;
    lastName: string | null;
    city: string | null;
    bio: string | null;
    profileUpdatedAt: string | null;
  };
};

export function ProfileForm() {
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loadError, setLoadError] = useState<string>();

  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>();
  const [message, setMessage] = useState<string>();
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoadError(undefined);
    try {
      const response = await api.get<ProfileResponse>("/getProfile");
      setData(response.data);
    } catch {
      // 401 e trajton interceptor-i (ridrejtim te /login). Këtu mbeten
      // gabimet e tjera: rrjeti, 500.
      setLoadError("Nuk u lexua dot profili.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors(undefined);
    setMessage(undefined);
    setSaved(false);

    const formData = new FormData(event.currentTarget);
    const input = {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      city: String(formData.get("city") ?? ""),
      bio: String(formData.get("bio") ?? ""),
    };

    // Validim edhe këtu edhe në server. Ky i pari është vetëm për shpejtësi —
    // ai i serverit është i vetmi që vlen, sepse kërkesa mund të vijë nga curl.
    const parsed = ProfileSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(flattenFieldErrors(parsed.error));
      return;
    }

    startTransition(async () => {
      try {
        const response = await api.post<{
          ok: true;
          profile: ProfileResponse["profile"];
        }>("/createProfile", input);

        // Serveri e kthen rreshtin ashtu siç mbeti — e përdorim atë, në vend
        // që ta rilexojmë me një kërkesë të dytë.
        setData((prev) =>
          prev ? { ...prev, profile: response.data.profile } : prev
        );
        setSaved(true);
      } catch (error) {
        const res = (
          error as {
            response?: {
              status?: number;
              data?: { error?: string; fields?: Record<string, string[]> };
            };
          }
        )?.response;

        // 400 → serveri i refuzoi fushat; i shfaqim pranë secilit input.
        if (res?.status === 400 && res.data?.fields) {
          setErrors(res.data.fields);
          return;
        }

        setMessage(res?.data?.error ?? "Nuk u ruajt dot profili.");
      }
    });
  }

  if (loadError) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
        <button
          type="button"
          onClick={load}
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          Riprovo
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Duke lexuar profilin...
      </p>
    );
  }

  const p = data.profile;

  return (
    <>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        {data.email}
      </p>

      <form onSubmit={handleSubmit}>
        {message && <Alert>{message}</Alert>}
        {saved && <Alert kind="success">Profili u ruajt.</Alert>}

        <Field
          id="firstName"
          name="firstName"
          type="text"
          label="Emri"
          autoComplete="given-name"
          defaultValue={p.firstName ?? ""}
          errors={errors?.firstName}
        />

        <Field
          id="lastName"
          name="lastName"
          type="text"
          label="Mbiemri"
          autoComplete="family-name"
          defaultValue={p.lastName ?? ""}
          errors={errors?.lastName}
        />

        <Field
          id="city"
          name="city"
          type="text"
          label="Qyteti"
          autoComplete="address-level2"
          defaultValue={p.city ?? ""}
          errors={errors?.city}
        />

        <div className="mb-4">
          <label
            htmlFor="bio"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            defaultValue={p.bio ?? ""}
            maxLength={300}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Deri në 300 karaktere. Lëre bosh për ta hequr.
          </p>
          {errors?.bio?.map((e) => (
            <p key={e} className="mt-1 text-xs text-red-600 dark:text-red-400">
              {e}
            </p>
          ))}
        </div>

        <Button type="submit" pending={pending}>
          Ruaj profilin
        </Button>
      </form>

      {p.profileUpdatedAt && (
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          Përditësuar më {new Date(p.profileUpdatedAt).toLocaleString("sq-AL")}
        </p>
      )}
    </>
  );
}
