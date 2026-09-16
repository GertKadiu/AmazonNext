import * as z from "zod";
import type { ZodError } from "zod";

/**
 * Kthen gabimet e Zod-it në formën { email: [...], password: [...] } që përdorin
 * format. Zhvendosur këtu nga Server Action-et sepse tani validimin e bëjnë
 * komponentët klient (login/signup/confirm) përpara se t'i dërgojnë Amplify-t.
 */
export function flattenFieldErrors(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

// Rregullat e Cognito-s për fjalëkalimin (politika default e User Pool-it):
// min 8 karaktere, të paktën 1 shkronjë e madhe, 1 e vogël, 1 numër, 1 simbol.
const passwordSchema = z
  .string()
  .min(8, { error: "Të paktën 8 karaktere" })
  .regex(/[a-z]/, { error: "Të paktën një shkronjë të vogël" })
  .regex(/[A-Z]/, { error: "Të paktën një shkronjë të madhe" })
  .regex(/[0-9]/, { error: "Të paktën një numër" })
  .regex(/[^a-zA-Z0-9]/, { error: "Të paktën një simbol (!@#$%...)" });

const emailSchema = z
  .email({ error: "Shkruaj një email të vlefshëm" })
  .trim()
  .toLowerCase();

export const SignupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const ConfirmSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { error: "Kodi është 6 shifra" }),
});

/**
 * Fushat e profilit.
 *
 * Të gjitha janë `optional`: formulari mund të dërgojë vetëm atë që ndryshoi,
 * dhe `setProfile` i lë të paprekura fushat që nuk erdhën.
 *
 * Vlera bosh lejohet me qëllim — ajo do të thotë "fshije këtë fushë", dhe
 * përkthehet në `REMOVE` te DynamoDB.
 *
 * `email` NUK është këtu: identiteti vjen nga tokeni i verifikuar, kurrë nga
 * trupi i kërkesës.
 */
export const ProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .max(50, { error: "Emri është shumë i gjatë (max 50)" })
    .optional(),
  lastName: z
    .string()
    .trim()
    .max(50, { error: "Mbiemri është shumë i gjatë (max 50)" })
    .optional(),
  bio: z
    .string()
    .trim()
    .max(300, { error: "Bio-ja është shumë e gjatë (max 300)" })
    .optional(),
  city: z
    .string()
    .trim()
    .max(60, { error: "Qyteti është shumë i gjatë (max 60)" })
    .optional(),
});
