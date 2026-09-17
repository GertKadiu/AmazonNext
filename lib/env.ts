import "server-only";

/**
 * Lexon një variabël mjedisi dhe dështon MENJËHERË nëse mungon.
 *
 * Pse kështu? Nëse e lëmë bosh, gabimi shfaqet shumë më vonë dhe në një formë
 * të pakuptueshme (p.sh. "ResourceNotFoundException" nga AWS). Më mirë një
 * mesazh i qartë sapo ngarkohet moduli, se sa gjueti gabimesh më vonë.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Mungon variabla e mjedisit ${name}. Kontrollo skedarin .env.local`
    );
  }
  return value;
}

/**
 * Kredencialet që u jepen klientëve të AWS-së.
 *
 * Kthen `undefined` kur çelësat nuk janë në mjedis — dhe kjo është ME QËLLIM.
 *
 * Lokalisht i lexojmë nga `.env.local`, sepse makina jote nuk ka asnjë identitet
 * AWS. Por brenda Lambda-s ata nuk ekzistojnë dhe as nuk duhen: SDK-ja i merr
 * vetvetiu nga ROLI i funksionit — kredenciale të përkohshme që AWS i rrotullon
 * dhe që nuk vidhen dot nga një skedar.
 *
 * `undefined` është pikërisht sinjali që SDK-ja pret për të kaluar te ai zinxhir.
 * Prandaj këtu NUK përdorim `requireEnv`: mungesa nuk është gabim.
 */
export function awsCredentials():
  | { accessKeyId: string; secretAccessKey: string }
  | undefined {
  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) return undefined;
  return { accessKeyId, secretAccessKey };
}
