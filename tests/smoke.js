// Headless smoke test: node tests/smoke.js [url]  (defaults to index.html over file://)
const { chromium } = require('playwright'); const path = require('path');
const base = process.argv[2] || ('file://' + path.resolve(__dirname, '..', 'index.html'));
let failures = 0; const check = (name, ok, extra = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) failures++; };
const T = (p, fn, arg) => p.evaluate(fn, arg);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); }); p.on('dialog', d => d.accept());
  await p.goto(base); await p.waitForSelector('#app:not([hidden])');
  check('title screen lists three locations, none locked', (await p.locator('.loc').count()) === 3 && (await p.locator('.loc.locked').count()) === 0);
  check('there is no unlock or restore button and no unlock card', (await p.locator('#btn-unlock, #btn-restore, #unlock-card').count()) === 0);
  check('a new profile starts with everything open', await T(p, () => window.__openstall.profile.meta.unlocked === true));
  await p.click('#btn-start'); await p.waitForSelector('#screen-market:not([hidden])');
  check('a season starts at week 1 with 15 coins', (await p.textContent('#hdr-week')).includes('Week 1') && (await p.textContent('#hdr-coins')) === '15');
  await T(p, () => { window.__openstall.profile.settings.motion = true; });
  await p.click('#btn-browse'); await p.waitForSelector('#modal-offer:not([hidden])');
  check('a browse lays out the stall and the wholesaler offers stock', (await p.locator('#stall .cell:not(.empty)').count()) === 6 && (await p.locator('.offer').count()) === 3);
  const coins1 = await T(p, () => window.__openstall.run.coins); check('the customers paid', coins1 > 15, String(coins1));
  const stock0 = await T(p, () => window.__openstall.run.stock.length); await p.click('.offer'); await p.waitForTimeout(100);
  check('taking an offer adds stock', (await T(p, () => window.__openstall.run.stock.length)) === stock0 + 1);
  await p.click('#stall .cell:not(.empty)'); await p.waitForSelector('#modal-info:not([hidden])');
  check('tapping an item shows its rule in plain words', (await p.textContent('#info-rule')).length > 10); await p.click('#btn-info-ok');
  for (let i = 0; i < 4; i++) { await p.click('#btn-browse'); await p.waitForSelector('#modal-offer:not([hidden])'); await p.click('#btn-offer-skip'); await p.waitForTimeout(80); }
  await p.waitForSelector('#modal-dusk:not([hidden])');
  check('after five browses the dusk ledger opens with charms for sale', (await p.locator('#dusk-charms .charm').count()) === 3);
  await T(p, () => { window.__openstall.run.coins = 500; }); await p.click('#dusk-charms .charm button'); await p.waitForTimeout(80);
  check('a charm can be bought', (await T(p, () => window.__openstall.run.charms.length)) === 1);
  const stockBefore = await T(p, () => window.__openstall.run.stock.length);
  await p.click('#dusk-sell .item'); await p.waitForSelector('#modal-info:not([hidden])'); await p.click('#btn-info-sell'); await p.waitForTimeout(80);
  check('stock can be sold at dusk', (await T(p, () => window.__openstall.run.stock.length)) === stockBefore - 1);
  await p.click('#btn-pay'); await p.waitForTimeout(100);
  check('paying the fee moves to week 2', (await p.textContent('#hdr-week')).includes('Week 2'));
  await p.click('.tab[data-tab="journal"]'); check('the combo journal lists every combo found', (await p.locator('.journal').count()) === (await T(p, () => Object.keys(window.__openstall.profile.meta.journal).length)) && (await p.textContent('#journal-list')).includes('combo'));
  // save & reload
  await T(p, () => window.__openstall.save()); const before = await T(p, () => ({ w: window.__openstall.run.week, c: window.__openstall.run.coins, s: window.__openstall.run.stock.length }));
  await p.reload(); await p.waitForSelector('#screen-market:not([hidden])');
  const after = await T(p, () => ({ w: window.__openstall.run.week, c: window.__openstall.run.coins, s: window.__openstall.run.stock.length }));
  check('the season survives a reload', JSON.stringify(before) === JSON.stringify(after), JSON.stringify(after));
  // lose
  await T(p, () => { const K = window.__openstall; K.run.coins = 0; K.run.phase = 'dusk'; K.run.spin = K.run.spinsToday; }); await T(p, () => window.__openstall.pay()); await p.waitForSelector('#modal-end:not([hidden])');
  check('missing the fee ends the season', (await p.textContent('#end-title')).includes('bust')); await p.click('#btn-end-ok'); await p.waitForSelector('#screen-title:not([hidden])');
  // win, the Free Market and every location open
  await T(p, () => { const K = window.__openstall; K.start('green', 5); K.run.coins = 5000; K.run.phase = 'dusk'; K.run.spin = K.run.spinsToday; K.pay(); }); await p.waitForSelector('#modal-end:not([hidden])');
  check('buying the shop wins the season and raises the pool tier', (await p.textContent('#end-title')).includes('yours') && (await T(p, () => window.__openstall.profile.meta.tier)) === 2);
  check('the Free Market is offered after buying the shop', await p.isVisible('#btn-end-free'));
  check('the end-of-season text mentions no purchase', !/unlock|purchase|buy the game/i.test(await p.textContent('#end-unlock')));
  await p.click('#btn-end-ok'); await p.waitForSelector('#screen-title:not([hidden])');
  await p.click('.loc >> nth=1'); await p.click('#btn-start'); await p.waitForSelector('#screen-market:not([hidden])');
  check('the Harbour Market can be played from the title screen', (await T(p, () => window.__openstall.run.loc)) === 'harbour' && (await p.textContent('#hdr-loc')) === 'Harbour Market');
  await T(p, () => { window.__openstall.start('square', 3); }); await p.waitForSelector('#screen-market:not([hidden])');
  check('City Square has four browses', (await p.textContent('#hdr-spins')).includes('/ 4'));
  for (const [label, junk] of [['truncated JSON', '{"run":{"loc":"green","week":"x"'], ['wrong types', '{"v":1,"run":{"loc":"green","week":"zzz","coins":"1e999","stock":"no"},"meta":{"tier":"9","unlocked":"yes"}}'], ['not an object', '42'], ['an old save that was never unlocked', '{"v":1,"meta":{"tier":2,"unlocked":false}}']]) {
    const ctx = await b.newContext({ viewport: { width: 360, height: 640 } }); const q = await ctx.newPage(); const qe = []; q.on('pageerror', e => qe.push(e.message));
    await q.addInitScript(j => { try { localStorage.setItem('openstall.v1', j); } catch (e) { } }, junk); await q.goto(base); await q.waitForSelector('#app:not([hidden])');
    check('a mangled save still loads: ' + label, qe.length === 0 && await T(q, () => { const P = window.__openstall.profile; return P.meta.tier <= 3 && P.meta.unlocked === true && document.querySelectorAll('.loc.locked').length === 0; }), qe.join(' | ')); await ctx.close();
  }
  { // an old locked save with a season at the Harbour keeps that season and plays on with the whole pool
    const ctx = await b.newContext({ viewport: { width: 360, height: 640 } }); const q = await ctx.newPage(); const qe = []; q.on('pageerror', e => qe.push(e.message));
    await q.addInitScript(() => { try { localStorage.setItem('openstall.v1', JSON.stringify({ v: 1, meta: { tier: 3, unlocked: false }, run: { loc: 'harbour', week: 3, coins: 40, stock: [{ id: 'apple' }] } })); } catch (e) { } }); await q.goto(base); await q.waitForSelector('#app:not([hidden])');
    check('an old locked save keeps its Harbour season and the full pool', qe.length === 0 && await T(q, () => { const K = window.__openstall; return K.run && K.run.loc === 'harbour' && K.profile.meta.unlocked === true && K.E.maxTier(K.profile.meta, K.profile.meta.unlocked) === 3; }), qe.join(' | ')); await ctx.close();
  }
  check('no page errors, console errors or failed requests', errs.length === 0, errs.join(' | '));
  await b.close(); console.log(failures ? `${failures} FAILED` : 'ALL PASSED'); process.exit(failures ? 1 : 0);
})();
