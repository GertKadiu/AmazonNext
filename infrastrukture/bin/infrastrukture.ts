#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import { InfrastruktureStack } from '../lib/infrastrukture-stack';

// OpenNext kopjon në bundle vetëm `.env` dhe `.env.production`, JO `.env.local`.
// Prandaj e ngarkojmë këtu, në kohën e `cdk deploy`, dhe stack-u ia kalon
// vlerat Lambda-s si environment variables. Vlerat e vendosura tashmë në shell
// (p.sh. në CI) kanë përparësi — loadEnvFile nuk i mbishkruan.
const envLocal = path.resolve(__dirname, '..', '..', '.env.local');
if (fs.existsSync(envLocal)) {
  process.loadEnvFile(envLocal);
}

const app = new cdk.App();

new InfrastruktureStack(app, 'InfrastruktureStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
