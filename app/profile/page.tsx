import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { ProfileForm } from "@/components/profile-form";
import { Card, Title } from "@/components/ui";

// Faqe e mbrojtur.
//
// Serveri bën VETËM një punë këtu: ndalon render-imin nëse s'ka sesion.
// Të dhënat i merr dhe i dërgon vetë formulari, me axios te /api/getProfile
// dhe /api/createProfile.
export default async function ProfilePage() {
  await verifySession();

  return (
    <Card>
      <Title>Profili</Title>

      <ProfileForm />

      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/dashboard" className="font-medium underline">
          Kthehu te Dashboard
        </Link>
      </p>
    </Card>
  );
}
