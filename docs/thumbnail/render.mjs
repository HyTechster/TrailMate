// Exports the portfolio thumbnail: docs/thumbnail.png (1920x1080) and
// docs/thumbnail@2x.png (3840x2160). Run: node docs/thumbnail/render.mjs
import { chromium } from 'playwright';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const page = pathToFileURL(resolve(here, 'thumbnail.html')).href;

const browser = await chromium.launch();
try {
  for (const [scale, name] of [
    [1, 'thumbnail.png'],
    [2, 'thumbnail@2x.png'],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
    const tab = await ctx.newPage();
    await tab.goto(page, { waitUntil: 'networkidle' });
    await tab.evaluate(() => document.fonts.ready);
    const out = resolve(here, '..', name);
    await tab.screenshot({ path: out, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    console.log('wrote', out);
    await ctx.close();
  }
} finally {
  await browser.close();
}
