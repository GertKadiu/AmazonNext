import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { Card, Title } from "@/components/ui";

// Faqe publike që i përshtatet gjendjes: përdorim getCurrentUser() (kthen null,
// nuk bën redirect) që të tregojmë lidhje të ndryshme për të loguar / të paloguar.
export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <Card>
      <Title>Next.js + Amazon Cognito</Title>

      {user ? (
        <>
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
            Je loguar si <strong>{user.email}</strong>.
          </p>
          <Link
            href="/dashboard"
            className="block w-full rounded-md bg-zinc-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Shko te Dashboard →
          </Link>
        </>
      ) : (
        <>
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
            Nuk je loguar.
          </p>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Hyr
            </Link>
            <Link
              href="/signup"
              className="flex-1 rounded-md border border-zinc-300 px-4 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Regjistrohu
            </Link>
          </div>
        </>
      )}
    </Card>
  );
}
