// Empacota as funções de server/ em api/*.js, cada uma num arquivo só (a Vercel não resolve imports sem extensão)
import { build } from "rolldown";

for (const name of ["frete", "checkout", "mp-webhook", "pay", "pay-status", "admin-orders", "admin-order", "admin-stats", "admin-reindex"]) {
  await build({
    input: `server/${name}.ts`,
    platform: "node",
    output: { file: `api/${name}.js`, format: "esm" },
    logLevel: "warn",
  });
  console.log(`api/${name}.js`);
}
