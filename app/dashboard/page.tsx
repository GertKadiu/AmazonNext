import { verifySession } from "@/lib/dal";
import { LogoutButton } from "@/components/logout-button";
import { UserRecord } from "@/components/user-record";
import { Card, Title } from "@/components/ui";

// Faqe e mbrojtur.
//
// Mbrojtja mbetet SERVER-SIDE: `verifySession()` e ndalon render-imin para se
// të dalë ndonjë pikselë. Kjo nuk varet nga API-ja dhe nuk duhet zhvendosur —
// një mbrojtje që xhiron në browser nuk është mbrojtje.
//
// Të dhënat, përkundrazi, vijnë tani nga klienti:
//   axios → GET /api/me → Bearer → api-auth → DynamoDB → JSON
export default async function DashboardPage() {
  const user = await verifySession();

  return (
    <Card>
      <Title>Dashboard</Title>

      {/* Nga sesioni, i render-uar në server — mbërrin bashkë me HTML-në */}
      <dl className="mb-6 space-y-3 text-sm">
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Email</dt>
          <dd className="font-medium text-zinc-900 dark:text-zinc-50">
            {user.email}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">User ID</dt>
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

      {/* Nga API-ja, i marrë pas ngarkimit — vër re gjendjen "duke lexuar" */}
      <div className="mb-6">
        <UserRecord />
      </div>

      <LogoutButton />
    </Card>
  );
}
