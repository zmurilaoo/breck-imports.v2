// Verificação visual do design: screenshots 1366 e 390, overflow horizontal e erros de console.
// Uso: node check.cjs <url> [nome] [rotulo]
// Requer o pacote "playwright" acessível (NODE_PATH ou node_modules próximo).
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const [url = "http://localhost:5173/", name = "tela", label = "depois"] = process.argv.slice(2);
const outDir = path.resolve(process.cwd(), ".taste-skill");
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);

const viewports = [
  { id: "desktop-1366", width: 1366, height: 800, isMobile: false },
  { id: "mobile-390", width: 390, height: 844, isMobile: true },
  { id: "mobile-390-reduced", width: 390, height: 844, isMobile: true, reducedMotion: "reduce" },
];

(async () => {
  const browser = await chromium.launch();
  let failed = false;
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
      deviceScaleFactor: vp.isMobile ? 2 : 1,
      reducedMotion: vp.reducedMotion || "no-preference",
    });
    const page = await context.newPage();
    const errors = [];
    const badResponses = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("response", (r) => r.status() >= 400 && badResponses.push(`${r.status()} ${r.url()}`));

    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1500);

    const overflow = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const docW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
      const offenders = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width && (r.right > vw + 1 || r.left < -1)) {
          const cs = getComputedStyle(el);
          if (cs.position === "fixed" || cs.visibility === "hidden") continue;
          offenders.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : ""} (${Math.round(r.left)}..${Math.round(r.right)})`);
          if (offenders.length >= 10) break;
        }
      }
      return { vw, docW, overflowX: docW > vw, offenders };
    });

    const file = path.join(outDir, `${stamp}-${name}-${vp.id}-${label}.png`);
    await page.screenshot({ path: file, fullPage: true });

    if (overflow.overflowX || errors.length) failed = true;
    console.log(JSON.stringify({ viewport: vp.id, screenshot: file, ...overflow, consoleErrors: errors, badResponses }, null, 2));
    await context.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error("BLOQUEADO:", e.message);
  process.exit(2);
});
