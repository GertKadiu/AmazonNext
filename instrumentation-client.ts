// Ekzekutohet në browser PAS ngarkimit të HTML-së por PARA se React të hidratohet
// (shih node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
// instrumentation-client.md).
//
// `ssr: true` → Amplify i mban tokenat e Cognito-s në COOKIE, jo në localStorage.
//
// PSE duhet: përdoruesit e loguar me Cognito para migrimit nuk i nxjerrim jashtë.
// Sesioni i tyre vlen derisa të dalin vetë, dhe serveri duhet ta lexojë e
// verifikojë atë — gjë që e bën vetëm nëse tokenat janë në cookie.
//
// KUJDES: serveri i lexon këto cookie drejtpërdrejt (lib/cognito.ts) dhe kurrë
// nuk përdor adapter-in server të Amplify-t — ai shkruan cookie dhe prish
// përgjigjet RSC brenda Server Action-eve.
//
// URË KALIMTARE. Kur të gjithë të jenë migruar, hiqet krejt.
import { Amplify } from "aws-amplify";
import { fetchAuthSession } from "aws-amplify/auth";
import { authConfig } from "@/lib/amplify-config";

Amplify.configure(authConfig, { ssr: true });

// Mban gjallë sesionin e vjetër: `fetchAuthSession()` i rifreskon tokenat kur
// kanë skaduar dhe (me `ssr: true`) i rishkruan në cookie.
//
// Pa këtë, ID token-i skadon pas ~1 ore dhe serveri do ta nxirrte përdoruesin
// jashtë vetvetiu. Për dikë pa sesion Cognito, thirrja nuk bën asgjë.
void fetchAuthSession().catch(() => {});
