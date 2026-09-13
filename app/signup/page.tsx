import { Card, Title } from "@/components/ui";
import { SignupForm } from "./signup-form";

// Server Component: nuk ka 'use client'. Vetëm përbën faqen dhe vendos
// Client Component-in e formës brenda. Kjo është ndarja tipike në Next.js:
// faqja (server) → forma (client, sepse ka ndërveprim).
export default function SignupPage() {
  return (
    <Card>
      <Title>Krijo llogari</Title>
      <SignupForm />
    </Card>
  );
}
