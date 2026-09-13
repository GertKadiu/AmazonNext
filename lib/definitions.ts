import * as z from "zod";

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

export const LoginSchema = z.object({
  email: emailSchema,
  // Në login nuk aplikojmë rregullat e forta — thjesht kontrollojmë që s'është bosh.
  // Cognito do ta thotë vetë nëse është gabim.
  password: z.string().min(1, { error: "Shkruaj fjalëkalimin" }),
});

export const ConfirmSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { error: "Kodi është 6 shifra" }),
});

/**
 * Forma e gjendjes që Server Actions kthejnë te `useActionState`.
 *   errors  → gabime për fushë të caktuar (nga Zod)
 *   message → gabim i përgjithshëm (nga Cognito, p.sh. "email-i ekziston")
 */
export type FormState =
  | {
      errors?: {
        email?: string[];
        password?: string[];
        code?: string[];
      };
      message?: string;
    }
  | undefined;
