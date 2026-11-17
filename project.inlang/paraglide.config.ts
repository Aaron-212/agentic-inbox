import { defineConfig } from "@inlang/paraglide-js";

export default defineConfig({
  outdir: "./shared/paraglide",
  emitTsDeclarations: true,
  outputStructure: "message-modules",
  strategy: ["cookie", "preferredLanguage", "baseLocale"],
  cookieSameSite: "lax",
  cookieSecure: "auto",
});
