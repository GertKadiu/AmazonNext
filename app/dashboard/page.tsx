import { verifySession } from "@/lib/dal";
import { getUserRecord } from "@/lib/users";
import { LogoutButton } from "@/components/logout-button";
import { Card, Title } from "@/components/ui";

// Faqe e mbrojtur. `verifySession()` verifikon JWT-në nga cookie dhe, nëse
// nuk është e vlefshme, bën redirect te /login PARA se të render-ohet ndonjë gjë.
// Kjo është "mbrojtja e vërtetë" — proxy.ts (më vonë) është vetëm një filtër i shpejtë.
export default async function DashboardPage() {
  const user = await verifySession();

  // Të dhënat nga Cognito (lart) vijnë nga tokeni; këto vijnë nga tabela jonë
  // në DynamoDB. Mund të jenë `null` nëse përdoruesi ka hyrë para se ta krijonim
  // tabelën — rreshti krijohet në login-in e radhës.
  const record = await getUserRecord(user.userId);

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

      <div className="mb-6 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Nga DynamoDB
        </h2>

        {record ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">
                Regjistruar më
              </dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {new Date(record.createdAt).toLocaleString("sq-AL")}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">
                Login-i i fundit
              </dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {new Date(record.lastLoginAt).toLocaleString("sq-AL")}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">
                Numri i login-eve
              </dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {record.loginCount}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Ende pa rresht në tabelë. Dil dhe hyr sërish që të krijohet.
          </p>
        )}
      </div>

      {/* Logout: client component që thërret `signOut` të Amplify (fshin sesionin
          te Cognito dhe cookie-t në browser). */}
      <LogoutButton />
    </Card>
  );
}
