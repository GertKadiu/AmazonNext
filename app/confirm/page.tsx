import { Card, Title, Alert } from "@/components/ui";
import { ConfirmForm } from "./confirm-form";

// `searchParams` është Promise në Next.js 16 → faqja duhet të jetë `async`.
// PageProps<'/confirm'> është një tip global që Next.js e gjeneron automatikisht.
export default async function ConfirmPage(props: PageProps<"/confirm">) {
  const { email } = await props.searchParams;
  const emailValue = typeof email === "string" ? email : "";

  return (
    <Card>
      <Title>Konfirmo email-in</Title>
      <Alert kind="info">
        Të dërguam një kod 6-shifror në <strong>{emailValue || "email-in tënd"}</strong>.
        Kontrollo edhe dosjen Spam.
      </Alert>
      <ConfirmForm email={emailValue} />
    </Card>
  );
}
