import type { OpenNextConfig } from "@opennextjs/aws/types/open-next";

// Konfigurimi i OpenNext për këtë aplikacion.
//
// Si parazgjedhje, OpenNext ndërton infrastrukturë për ISR (Incremental Static
// Regeneration): një tabelë DynamoDB për etiketat e cache-it dhe një radhë SQS
// për rivalidimin.
//
// Ky aplikacion NUK ka ISR — çdo faqe ose është statike (/signup) ose dinamike
// sepse lexon sesionin. Pa këtë konfigurim, funksioni provon të shkruajë në një
// tabelë që s'ekziston dhe logjet mbushen me `tableName: null`.
//
// `dummy` do të thotë: mos përdor asnjë, mos u ankua.
const config: OpenNextConfig = {
  default: {
    override: {
      tagCache: "dummy",
      queue: "dummy",
    },
  },
};

export default config;
