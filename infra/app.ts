#!/usr/bin/env node
import { existsSync } from "node:fs";
import { App } from "aws-cdk-lib";
import { AmazonNextStack } from "./stack";

// Ngarko `.env.local` para se të ndërtohet stack-u.
//
// `process.loadEnvFile` është i vetë Node-it (≥20.12) — pa varësi shtesë.
// Pa këtë, çdo komandë CDK do të kërkonte `-r dotenv/config ...`, dhe do të
// dështonte sa herë ta harroje. Aty ku ngarkimi mund të bëhet vetvetiu, le të bëhet.
//
// Në CI këto vijnë nga mjedisi dhe skedari nuk ekziston — prandaj kontrolli.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

// Pika e hyrjes së CDK-së. `cdk deploy` e ekzekuton këtë skedar, i cili
// ndërton pemën e burimeve dhe e kthen në CloudFormation.
const app = new App();

// Destinacioni vjen nga `.env.local` (ngarkuar më lart), jo nga profili aktiv.
//
// Pse jo `CDK_DEFAULT_ACCOUNT`: ai varet nga `AWS_PROFILE` i terminalit, dhe një
// terminal i ri dështon me "Unable to resolve AWS account".
//
// Pse jo i shkruar në kod: kjo repo është PUBLIKE. ID-ja e llogarisë nuk është
// fjalëkalim, por lehtëson zbulimin — emra bucket-esh, role për provë. Nuk ka
// arsye ta japësh falas.
function deployTarget(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Mungon ${name}. Shtoje te .env.local.`);
  }
  return value;
}

new AmazonNextStack(app, "AmazonNextStack", {
  env: {
    account: deployTarget("CDK_DEPLOY_ACCOUNT"),
    region: deployTarget("CDK_DEPLOY_REGION", "eu-central-1"),
  },
});
