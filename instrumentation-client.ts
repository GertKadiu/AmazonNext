// Ekzekutohet në browser PAS ngarkimit të HTML-së por PARA se React të hidratohet
// (shih node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
// instrumentation-client.md).
//
// Amplify konfigurohet vetëm për anën e klientit, sepse Cognito tani përdoret
// VETËM si burim i vjetër gjatë migrimit: verifikimi i kredencialeve me SRP te
// login-form, pastaj `signOut` menjëherë. Sesioni i aplikacionit është i Supabase-it.
//
// Pa `ssr: true` — serveri nuk e lexon më sesionin e Cognito-s, ndaj tokenat e tij
// nuk kanë pse të shkojnë në cookie.
import { Amplify } from "aws-amplify";
import { authConfig } from "@/lib/amplify-config";

Amplify.configure(authConfig);
