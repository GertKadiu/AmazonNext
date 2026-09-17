import "server-only";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { requireEnv, awsCredentials } from "@/lib/env";

// ---------------------------------------------------------------------------
// PSE KËTU DUHEN KREDENCIALE IAM, KURSE TE COGNITO JO?
//
// Operacionet e Cognito-s që përdorim (SignUp, InitiateAuth, ConfirmSignUp,
// ResendConfirmationCode, GlobalSignOut) janë "publike": AWS i pranon PA
// nënshkrim, sepse identifikimi bëhet me Client ID + Secret. Prandaj
// lib/cognito.ts nuk i jep kurrfarë kredencialesh klientit.
//
// DynamoDB është e kundërta: ÇDO kërkesë duhet nënshkruar me SigV4, pra na
// duhet një çift çelësash IAM (Access Key ID + Secret Access Key) me të drejta
// vetëm mbi këtë tabelë. Prandaj i japim shprehimisht më poshtë.
// ---------------------------------------------------------------------------

export const USERS_TABLE = requireEnv("DYNAMODB_USERS_TABLE");

const client = new DynamoDBClient({
  region: requireEnv("APP_AWS_REGION"),
  credentials: awsCredentials(),
});

/**
 * "Document client" — mbështjellës mbi klientin bazë që na kursen formatin e
 * çuditshëm të DynamoDB-së. Pa të, do të na duhej të shkruanim:
 *
 *   { email: { S: "a@b.com" }, loginCount: { N: "3" } }
 *
 * Me të, shkruajmë thjesht objekte JavaScript:
 *
 *   { email: "a@b.com", loginCount: 3 }
 *
 * `removeUndefinedValues` heq fushat `undefined` në vend që të hedhë gabim.
 */
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});
