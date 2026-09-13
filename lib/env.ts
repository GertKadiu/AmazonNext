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
