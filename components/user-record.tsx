"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { AvatarUpload } from "@/components/avatar-upload";

// ---------------------------------------------------------------------------
// E njëjta e dhënë si më parë, por përmes rrugës tjetër:
//
//   axios → GET /api/me → Bearer → api-auth → DynamoDB → JSON
//
// Ndryshe nga Server Component-i, kjo mbërrin PAS ngarkimit të faqes. Prandaj
// ka gjendje "duke lexuar" — diçka që render-imi në server nuk e ka fare.
// ---------------------------------------------------------------------------

type getDashboardResponse = {
  user: {
    userId: string;
    email: string;
    emailVerified: boolean;
    provider: "supabase" | "cognito";
  };
  record: {
    createdAt: string;
    lastLoginAt: string;
    loginCount: number;
    avatarUpdatedAt?: string;
  } | null;
  avatarUrl: string | null;
};

export function UserRecord() {
  const [data, setData] = useState<getDashboardResponse | null>(null);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(undefined);
    try {
      // Tokenin nuk e prekim: interceptor-i te lib/api-client.ts e bashkëngjit.
      const response = await api.get<getDashboardResponse>("/getDashboard");
      setData(response.data);
    } catch {
      // 401 e trajton interceptor-i (ridrejtim te /login). Këtu mbeten
      // gabimet e tjera: rrjeti, 500, e kështu me radhë.
      setError("Nuk u lexuan dot të dhënat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Duke lexuar të dhënat...
      </p>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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

  const record = data?.record ?? null;
  const avatarUrl = data?.avatarUrl ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL e nënshkruar, skadon
          <img
            src={avatarUrl}
            alt="Fotoja e profilit"
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-lg font-medium text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600">
            {(data?.user.email[0] ?? "?").toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {/* Pas ngarkimit rilexojmë nga API-ja, jo me router.refresh() —
              këto të dhëna nuk vijnë më nga serveri gjatë render-imit. */}
          <AvatarUpload hasAvatar={Boolean(avatarUrl)} onUploaded={load} />
        </div>
      </div>

      <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Nga DynamoDB · përmes /api/getDashboard
        </h2>

        {record ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Regjistruar më</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {new Date(record.createdAt).toLocaleString("sq-AL")}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Login-i i fundit</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {new Date(record.lastLoginAt).toLocaleString("sq-AL")}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Numri i login-eve</dt>
              <dd className="font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                {record.loginCount}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Sesioni vjen nga</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {data?.user.provider === "cognito" ? "Cognito (i vjetër)" : "Supabase"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Ende pa rresht në tabelë. Dil dhe hyr sërish që të krijohet.
          </p>
        )}
      </div>
    </div>
  );
}
