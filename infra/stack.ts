import * as path from "node:path";
import {
  Stack,
  type StackProps,
  Duration,
  RemovalPolicy,
  CfnOutput,
} from "aws-cdk-lib";
import type { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

const OPEN_NEXT = path.join(__dirname, "..", ".open-next");

/**
 * Variablat që i duhen funksionit të serverit.
 *
 * Lexohen nga mjedisi i asaj makine që bën `cdk deploy` — pra nga `.env.local`
 * kur e nis me `--require dotenv/config`, ose nga CI. NUK ruhen kurrë në kod.
 *
 * Mungon qëllimisht `APP_AWS_ACCESS_KEY_ID` dhe `APP_AWS_SECRET_ACCESS_KEY`:
 * brenda Lambda-s, SDK-ja i merr kredencialet nga ROLI i funksionit. Çelësa
 * statikë nuk duhen më — dhe të përkohshmit e rrotulluar nga AWS janë më të sigurt.
 */
const APP_ENV_KEYS = [
  "APP_AWS_REGION",
  "COGNITO_USER_POOL_ID",
  "COGNITO_CLIENT_ID",
  "DYNAMODB_USERS_TABLE",
  "S3_AVATARS_BUCKET",
  "SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_COGNITO_USER_POOL_ID",
  "NEXT_PUBLIC_COGNITO_CLIENT_ID",
] as const;

function appEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of APP_ENV_KEYS) {
    const value = process.env[key];
    if (!value) {
      throw new Error(
        `Mungon ${key}. Kontrollo .env.local (ngarkohet te infra/app.ts).`
      );
    }
    out[key] = value;
  }
  return out;
}

export class AmazonNextStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // ---- 1. Bucket-i i aseteve dhe i cache-it --------------------------------
    // Asetet statike (JS, CSS, imazhe) dhe cache-i i ISR-së. PRIVAT: CloudFront
    // e lexon me Origin Access Control, askush tjetër.
    const assetsBucket = new s3.Bucket(this, "AssetsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY, // projekt mësimor — fshihet me stack-un
      autoDeleteObjects: true,
    });

    // ---- 2. Funksioni i serverit --------------------------------------------
    // Këtu jeton GJITHÇKA server-side: faqet, Server Actions, /api/*, proxy.ts.
    // Është i njëjti bundle që prodhoi OpenNext te .open-next/server-functions/default.
    const serverFn = new lambda.Function(this, "ServerFunction", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(OPEN_NEXT, "server-functions", "default")
      ),
      // 1024 MB nuk është vetëm memorie: Lambda e lidh CPU-në me të, ndaj kjo
      // e shkurton ndjeshëm kohën e ngarkimit të parë (cold start).
      memorySize: 1024,
      timeout: Duration.seconds(30),
      environment: {
        ...appEnv(),
        // OpenNext i pret këto për cache-in e ISR-së.
        CACHE_BUCKET_NAME: assetsBucket.bucketName,
        CACHE_BUCKET_REGION: this.region,
        CACHE_BUCKET_KEY_PREFIX: "_cache",
      },
    });

    // ---- 3. Të drejtat e funksionit -----------------------------------------
    // Këto zëvendësojnë çelësat IAM që mbante `.env`. Brenda Lambda-s, SDK-ja
    // i merr vetvetiu nga ky rol — kredenciale të përkohshme, të rrotulluara.
    assetsBucket.grantReadWrite(serverFn);

    serverFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
        ],
        resources: [
          `arn:aws:dynamodb:${this.region}:${this.account}:table/${process.env.DYNAMODB_USERS_TABLE}`,
        ],
      })
    );

    serverFn.addToRolePolicy(
      new iam.PolicyStatement({
        // Vetëm prefiksi `avatars/` — jo gjithë bucket-i.
        actions: ["s3:PutObject", "s3:GetObject"],
        resources: [`arn:aws:s3:::${process.env.S3_AVATARS_BUCKET}/avatars/*`],
      })
    );

    serverFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cognito-idp:AdminGetUser"],
        resources: [
          `arn:aws:cognito-idp:${this.region}:${this.account}:userpool/${process.env.COGNITO_USER_POOL_ID}`,
        ],
      })
    );

    // ---- 4. Funksioni i imazheve --------------------------------------------
    // I ndarë sepse mbart `sharp` — rreth 30 MB që s'kanë pse ngarkohen në çdo
    // kërkesë faqeje.
    const imageFn = new lambda.Function(this, "ImageFunction", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(OPEN_NEXT, "image-optimization-function")
      ),
      memorySize: 1536,
      timeout: Duration.seconds(30),
      environment: {
        BUCKET_NAME: assetsBucket.bucketName,
        BUCKET_KEY_PREFIX: "_assets",
      },
    });
    assetsBucket.grantRead(imageFn);

    // ---- 5. Hyrjet HTTP ------------------------------------------------------
    // Function URL i jep Lambda-s një adresë HTTPS drejtpërdrejt, pa API Gateway.
    // Më pak pjesë, më pak kosto. `AWS_IAM` do të kërkonte nënshkrim; e lëmë
    // `NONE` sepse mbrojtja bëhet brenda aplikacionit, dhe CloudFront është para tij.
    const serverUrl = serverFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      // BUFFERED sepse OpenNext e ndërton funksionin pa streaming si parazgjedhje:
      // handler-i kthen një objekt `{ statusCode, headers, body }` dhe Lambda e
      // shpaketon. Me `RESPONSE_STREAM`, ai objekt del i plotë si trup përgjigjeje
      // — statusi zbatohet, por klienti merr zarfin në vend të JSON-it.
      //
      // Për streaming të vërtetë duhet konfiguruar edhe OpenNext, jo vetëm këtu.
      invokeMode: lambda.InvokeMode.BUFFERED,
    });
    const imageUrl = imageFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    // ---- 6. CloudFront -------------------------------------------------------
    // Rrugëzimi pasqyron `open-next.output.json`: asetet te S3, pjesa tjetër te
    // funksioni i serverit, imazhet te funksioni i imazheve.
    const serverOrigin = new origins.FunctionUrlOrigin(serverUrl);
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(assetsBucket);

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: serverOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        // ALL_VIEWER_EXCEPT_HOST_HEADER: Lambda duhet të marrë cookie-t dhe
        // header-at (Authorization!), por `Host` duhet të mbetet i Lambda-s,
        // përndryshe nënshkrimi i Function URL-së prishet.
        originRequestPolicy:
          cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        // Faqet varen nga sesioni — asgjë nuk ruhet.
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      },
      additionalBehaviors: {
        // Asete me hash në emër → ruajtje e gjatë, pa rrezik vjetrimi.
        "_next/static/*": {
          origin: s3Origin,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        // Imazhet te funksioni i vet. Çdo `path pattern` duhet të jetë UNIK —
        // po ta deklarosh dy herë (edhe si vendmbajtëse), CloudFront e refuzon
        // gjithë shpërndarjen me "path pattern must be unique".
        "_next/image*": {
          origin: new origins.FunctionUrlOrigin(imageUrl),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
      defaultRootObject: "",
    });

    // ---- 7. Ngarkimi i aseteve ----------------------------------------------
    // Kopjon `.open-next/assets` te bucket-i dhe pastron cache-in e CloudFront.
    new s3deploy.BucketDeployment(this, "AssetsDeployment", {
      sources: [s3deploy.Source.asset(path.join(OPEN_NEXT, "assets"))],
      destinationBucket: assetsBucket,
      destinationKeyPrefix: "_assets",
      distribution,
      distributionPaths: ["/*"],
      prune: false,
    });

    new CfnOutput(this, "SiteUrl", {
      value: `https://${distribution.distributionDomainName}`,
    });
    new CfnOutput(this, "ServerFunctionName", { value: serverFn.functionName });
  }
}
