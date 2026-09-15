import { Alert } from "@/components/ui";
import { LoginAuthenticator } from "./login-authenticator";

export default async function LoginPage(props: PageProps<"/login">) {
  // Pas konfirmimit të suksesshëm vijmë këtu me ?confirmed=1 → shfaqim një mesazh.
  const { confirmed } = await props.searchParams;

  return (
    <>
      {confirmed && (
        <div className="mx-auto w-full max-w-sm px-6 pt-6">
          <Alert kind="success">Llogaria u konfirmua! Tani mund të hysh.</Alert>
        </div>
      )}
      <LoginAuthenticator />
    </>
  );
}
