import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NextjsSite } from 'cdk-opennext';

// Variablat që serveri i Next.js i lexon me `requireEnv()` (shih lib/env.ts).
// Mungesa e njërës prej tyre hedh gabim në ngarkimin e modulit → 500 në çdo faqe.
//
// NEXT_PUBLIC_* zakonisht inline-ohen në build, por lib/supabase/server.ts i
// lexon dinamikisht (process.env[name]), prandaj duhen edhe në runtime.
//
// Emrat mbajnë prefiksin APP_ sepse AWS_REGION / AWS_ACCESS_KEY_ID /
// AWS_SECRET_ACCESS_KEY janë të rezervuara nga Lambda dhe nuk lejohen.
const SERVER_ENV_VARS = [
  'APP_AWS_REGION',
  'APP_AWS_ACCESS_KEY_ID',
  'APP_AWS_SECRET_ACCESS_KEY',
  'COGNITO_USER_POOL_ID',
  'COGNITO_CLIENT_ID',
  'DYNAMODB_USERS_TABLE',
  'S3_AVATARS_BUCKET',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
] as const;

function readServerEnv(): Record<string, string> {
  const missing = SERVER_ENV_VARS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    // Dështo në synth, jo pas deploy-it me një 500 të pakuptueshëm.
    throw new Error(
      `Mungojnë variablat e mjedisit: ${missing.join(', ')}. ` +
        `Plotësoji te .env.local (në rrënjën e projektit) ose eksportoji para 'cdk deploy'.`
    );
  }
  return Object.fromEntries(
    SERVER_ENV_VARS.map((name) => [name, process.env[name] as string])
  );
}

export class InfrastruktureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const site = new NextjsSite(this, 'NextjsSite', {
      // Relative me dosjen infrastrukture/ — output-i i `npx @opennextjs/aws build`
      openNextPath: '../.open-next',
      defaultFunctionProps: {
        environment: readServerEnv(),
      },
    });

    if (site.distribution) {
      new cdk.CfnOutput(this, 'CloudFrontUrl', {
        value: site.distribution.distributionDomainName,
      });
    }
  }
}
