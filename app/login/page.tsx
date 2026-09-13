import { Card, Title, Alert } from "@/components/ui";
import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  // Pas konfirmimit të suksesshëm vijmë këtu me ?confirmed=1 → shfaqim një mesazh.
  const { confirmed } = await props.searchParams;

  return (
    <Card>
      <Title>Hyr në llogari</Title>
      {confirmed && (
        <Alert kind="success">Llogaria u konfirmua! Tani mund të hysh.</Alert>
      )}
      <LoginForm />
    </Card>
  );
}
