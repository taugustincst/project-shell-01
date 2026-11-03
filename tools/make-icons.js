// Renders icons and the staged store screenshot with the pre-installed Chromium. node tools/make-icons.js [pageUrl]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f6efe3"/><g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})">
<rect x="56" y="300" width="400" height="36" rx="8" fill="#8b5e3c"/><rect x="80" y="336" width="24" height="140" fill="#6c4529"/><rect x="408" y="336" width="24" height="140" fill="#6c4529"/>
<path d="M40 300 L256 160 L472 300 Z" fill="#b5542d"/><path d="M40 300 L96 300 L256 196 L200 196 Z" fill="#d9a441"/><path d="M472 300 L416 300 L256 196 L312 196 Z" fill="#d9a441"/><path d="M152 300 L256 232 L360 300 Z" fill="#d9a441"/>
<circle cx="140" cy="265" r="22" fill="#c8362b"/><circle cx="200" cy="262" r="22" fill="#e3a21a"/><circle cx="260" cy="262" r="22" fill="#5c8a3a"/><circle cx="320" cy="262" r="22" fill="#7b4ea3"/><circle cx="380" cy="265" r="22" fill="#e86f2c"/>
</g></svg>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 512, height: 512 } });
  const out = path.join(__dirname, '..', 'icons'); fs.mkdirSync(out, { recursive: true });
  for (const [name, pad, size] of [['icon-512.png', 0, 512], ['icon-192.png', 0, 192], ['maskable-512.png', 70, 512]]) {
    await p.setViewportSize({ width: size, height: size }); await p.setContent(`<html><body style="margin:0">${svg(pad).replace('viewBox="0 0 512 512"', `viewBox="0 0 512 512" width="${size}" height="${size}"`)}</body></html>`);
    await p.screenshot({ path: path.join(out, name), clip: { x: 0, y: 0, width: size, height: size } });
  }
  const base = process.argv[2];
  if (base) {
    const q = await b.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 }); await q.goto(base + '?dev=1'); await q.waitForSelector('#app:not([hidden])');
    await q.evaluate(() => { const T = window.__openstall; T.start('green', 77); T.profile.settings.motion = true; T.setWeek(7); T.give(412); T.stock(['tea', 'honey', 'honey', 'biscuit', 'flapjack', 'scone', 'jam', 'mint', 'teacosy']); T.charm('beehive'); T.browse(); });
    await q.waitForTimeout(300); await q.evaluate(() => { document.getElementById('modal-offer').hidden = true; document.getElementById('toast').hidden = true; }); await q.waitForTimeout(200);
    await q.screenshot({ path: path.join(out, 'screenshot-portrait.png') });
  }
  await b.close(); console.log('icons written');
})();
