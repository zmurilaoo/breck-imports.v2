// Empacota o servidor próprio da loja (VPS) num arquivo só: dist-server/server.mjs
import { build } from "rolldown";

await build({
  input: "server/node-server.ts",
  platform: "node",
  output: { file: "dist-server/server.mjs", format: "esm" },
  logLevel: "warn",
});
console.log("dist-server/server.mjs");
