import { verifySession } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { Card, Title } from "@/components/ui";

// Faqe e mbrojtur. `verifySession()` verifikon JWT-në nga cookie dhe, nëse
// nuk është e vlefshme, bën redirect te /login PARA se të render-ohet ndonjë gjë.
// Kjo është "mbrojtja e vërtetë" — proxy.ts (më vonë) është vetëm një filtër i shpejtë.
export default async function DashboardPage() {
  const user = await verifySession();

  return (
    <Card>
      <Title>Dashboard</Title>

      <dl className="mb-6 space-y-3 text-sm">
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Email</dt>
          <dd className="font-medium text-zinc-900 dark:text-zinc-50">
            {user.email}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">
            User ID (Cognito <code>sub</code>)
          </dt>
          <dd className="break-all font-mono text-xs text-zinc-900 dark:text-zinc-50">
            {user.userId}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Email i verifikuar</dt>
          <dd className="font-medium text-zinc-900 dark:text-zinc-50">
            {user.emailVerified ? "Po ✅" : "Jo ❌"}
          </dd>
        </div>
      </dl>

      {/* Logout: një formë pa fusha, që thërret direkt Server Action-in.
          Përdorim <form> në vend të <button onClick> sepse:
            1. Funksionon edhe pa JavaScript
            2. Server Action-i ekzekutohet në server, ku mund të fshijë cookie-t */}
      <form action={logout}>
        <button
          type="submit"
          className="w-full rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Dil
        </button>
      </form>
    </Card>
  );
}
