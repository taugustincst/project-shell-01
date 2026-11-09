// Headless smoke test: node tests/smoke.js [url]  (defaults to index.html over file://)
const { chromium } = require('playwright'); const path = require('path');
const base = process.argv[2] || ('file://' + path.resolve(__dirname, '..', 'index.html'));
let failures = 0; const check = (name, ok, extra = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) failures++; };
const T = (p, fn, arg) => p.evaluate(fn, arg);
// A stand-in for the Play app's billing bridge (android/play/.../PlayBilling.java), answering as Play does.
const fakePlay = owned => {
  const say = m => setTimeout(() => window.__billingEvent(JSON.stringify(m)), 30);
  window.__buys = 0;
  window.AndroidBilling = {
    start(id) { const had = owned || localStorage.getItem('fakeplay.bought') === '1'; say({ type: 'ready', product: id }); say({ type: 'price', product: id, price: '$4.99' }); say({ type: 'owned', product: id, owned: had }); },
    buy(id) { window.__buys++; localStorage.setItem('fakeplay.bought', '1'); say({ type: 'purchased', product: id }); },
    restore(id) { say({ type: 'owned', product: id, owned: localStorage.getItem('fakeplay.bought') === '1' }); }
  };
};
const fresh = async (b, init, arg) => { const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true }); const q = await ctx.newPage(); const qe = []; q.on('pageerror', e => qe.push(e.message)); q.on('dialog', d => d.accept()); if (init) await q.addInitScript(init, arg); await q.goto(base); await q.waitForSelector('#app:not([hidden])'); return { ctx, q, qe }; };
const onStall = p => T(p, () => window.__openstall.run.layout.filter(u => u != null).length);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); }); p.on('dialog', d => d.accept());
  await p.goto(base); await p.waitForSelector('#app:not([hidden])');
  check('title screen lists three markets; Harbour and City Square are in the full game', (await p.locator('.loc').count()) === 3 && (await p.locator('.loc.locked').count()) === 2 && !(await p.locator('.loc >> nth=0').getAttribute('class')).includes('locked'));
  check('a save never carries the unlock and there is no test hook for it', await T(p, () => !('unlocked' in window.__openstall.profile.meta) && typeof window.__openstall.unlock === 'undefined'));
  await p.click('.loc >> nth=1'); await p.click('#btn-start'); await p.waitForSelector('#modal-unlock:not([hidden])');
  check('a locked market opens the unlock sheet instead of a season', !(await T(p, () => !!window.__openstall.run)) && (await p.textContent('#u-sub')) === 'Harbour Market');
  check('outside the Play app the unlock says so and cannot be bought', (await p.isDisabled('#u-buy')) && (await p.textContent('#u-note')).includes('Google Play edition'));
  await p.click('#u-later'); await p.click('.loc >> nth=0');
  await p.click('#btn-start'); await p.waitForSelector('#screen-market:not([hidden])');
  check('a season starts at week 1 with 15 coins and the starters already laid out', (await p.textContent('#hdr-week')).includes('Week 1') && (await p.textContent('#hdr-coins')) === '15' && (await p.locator('#stall .cell:not(.empty)').count()) === 6);
  await T(p, () => { window.__openstall.profile.settings.motion = true; });
  check('the stall shows what the layout takes before anyone browses', /about \+\d+ a browse/.test(await p.textContent('#total')));
  { // arranging: tap an item, then an empty space
    const before = await T(p, () => window.__openstall.run.layout.slice());
    const from = before.findIndex(u => u != null), to = before.findIndex(u => u == null);
    await p.click(`#stall .cell[data-i="${from}"]`); check('tapping an item selects it and shows the arrange bar', (await p.isVisible('#sel-bar')) && (await p.locator('#stall .cell.sel').count()) === 1);
    await p.click(`#stall .cell[data-i="${to}"]`);
    const after = await T(p, () => window.__openstall.run.layout.slice());
    check('tapping a space moves it there', after[to] === before[from] && after[from] == null && !(await p.isVisible('#sel-bar')));
    await p.click(`#stall .cell[data-i="${to}"]`); await p.click('#btn-sel-box');
    check('"To the boxes" takes it off the stall and lists it in the boxes', (await onStall(p)) === 5 && (await p.locator('#boxes .boxed').count()) === 1);
    await p.click('#boxes .boxed'); await p.click(`#stall .cell[data-i="${from}"]`);
    check('a boxed item goes back on the stall with two taps', (await onStall(p)) === 6 && (await p.locator('#boxes .boxed').count()) === 0);
  }
  const plan = await T(p, () => window.__openstall.E.preview(window.__openstall.run).total);
  await p.click('#btn-browse'); await p.waitForSelector('#modal-offer:not([hidden])');
  const coins1 = await T(p, () => window.__openstall.run.coins); check('the customers paid at least what the preview said', coins1 >= 15 + plan, `${coins1} vs ${15 + plan}`);
  check('the wholesaler offers the day\'s items, each with its price', (await p.locator('.offer').count()) === (await T(p, () => window.__openstall.E.offerCount(window.__openstall.run))) && (await p.locator('.offer .cost').allTextContents()).every(t => /Costs \d+/.test(t)), JSON.stringify(await p.locator('.offer').allTextContents()));
  await T(p, () => { window.__openstall.run.coins = 0; window.__openstall.reshowOffer(); });
  check('with an empty tin every offer is greyed out and says how short it is', (await p.locator('.offer:disabled').count()) === (await p.locator('.offer').count()) && (await p.textContent('.offer .cost')).includes('short'), JSON.stringify(await p.locator('.offer .cost').allTextContents()));
  await T(p, () => { window.__openstall.run.coins = 500; window.__openstall.reshowOffer(); });
  const cost = await T(p, () => window.__openstall.E.buyPrice(window.__openstall.run, window.__openstall.run.offers[0]));
  const stock0 = await T(p, () => window.__openstall.run.stock.length); await p.click('.offer >> nth=0'); await p.waitForTimeout(100);
  check('taking an offer adds stock and costs its price', (await T(p, () => window.__openstall.run.stock.length)) === stock0 + 1 && (await T(p, () => window.__openstall.run.coins)) === 500 - cost);
  check('after the offer the stall shows the layout again, with the last browse', /last browse took \+\d+/.test(await p.textContent('#total')) && (await onStall(p)) === stock0 + 1);
  await p.click('#stall .cell:not(.empty)'); await p.click('#btn-sel-info'); await p.waitForSelector('#modal-info:not([hidden])');
  check('an item\'s rule reads in plain words, with what the wholesaler asks', (await p.textContent('#info-rule')).length > 10 && (await p.textContent('#info-extra')).includes('wholesaler asks')); await p.click('#btn-info-ok'); await p.click('#btn-sel-cancel');
  for (let i = 0; i < 4; i++) { await p.click('#btn-browse'); await p.waitForSelector('#modal-offer:not([hidden])'); await p.click('#btn-offer-skip'); await p.waitForTimeout(80); }
  await p.waitForSelector('#modal-dusk:not([hidden])');
  check('after five browses the dusk ledger opens with charms for sale', (await p.locator('#dusk-charms .charm').count()) === 3);
  check('each charm shows its icon, name and rule in their own places', await T(p, () => [...document.querySelectorAll('#dusk-charms .charm')].every(c => [...c.querySelector('.ic').textContent].length <= 3 && c.querySelector('b').textContent.length > 2 && c.querySelector('.ds').textContent.length > 8)));
  await T(p, () => { window.__openstall.run.coins = 500; }); await p.click('#dusk-charms .charm button'); await p.waitForTimeout(80);
  check('a charm can be bought', (await T(p, () => window.__openstall.run.charms.length)) === 1);
  const sellInfo = await T(p, () => { const K = window.__openstall, it = K.run.stock[0]; return { half: Math.max(1, Math.round(K.E.SYM[it.id].price / 2)), shown: K.E.sellPrice(K.run, it), charms: K.run.charms }; });
  check('stock sells back for about half its price', sellInfo.shown >= sellInfo.half, JSON.stringify(sellInfo));
  const stockBefore = await T(p, () => window.__openstall.run.stock.length);
  await p.click('#dusk-sell .item'); await p.waitForSelector('#modal-info:not([hidden])'); await p.click('#btn-info-sell'); await p.waitForTimeout(80);
  const left = await T(p, () => window.__openstall.run.stock.length);
  check('stock can be sold at dusk, and its space empties', left === stockBefore - 1 && (await onStall(p)) === Math.min(15, left));
  await p.click('#btn-pay'); await p.waitForTimeout(100);
  check('paying the fee moves to week 2 with the layout kept', (await p.textContent('#hdr-week')).includes('Week 2') && (await p.locator('#stall .cell:not(.empty)').count()) === Math.min(15, left));
  await p.click('.tab[data-tab="journal"]'); check('the combo journal lists every combo found', (await p.locator('.journal').count()) === (await T(p, () => Object.keys(window.__openstall.profile.meta.journal).length)) && (await p.textContent('#journal-list')).includes('combo'));
  await p.click('.tab[data-tab="more"]'); check('More has a full-game card', (await p.textContent('#unlock-card')).includes('Harbour Market'));
  await p.click('.tab[data-tab="stall"]');
  // save & reload
  const snap = () => T(p, () => ({ w: window.__openstall.run.week, c: window.__openstall.run.coins, s: window.__openstall.run.stock.length, l: window.__openstall.run.layout.join(',') }));
  await T(p, () => window.__openstall.save()); const before = await snap(); await p.reload(); await p.waitForSelector('#screen-market:not([hidden])');
  const after = await snap(); check('the season and its layout survive a reload', JSON.stringify(before) === JSON.stringify(after), JSON.stringify(after));
  // lose
  await T(p, () => { const K = window.__openstall; K.run.coins = 0; K.run.phase = 'dusk'; K.run.spin = K.run.spinsToday; }); await T(p, () => window.__openstall.pay()); await p.waitForSelector('#modal-end:not([hidden])');
  check('missing the fee ends the season', (await p.textContent('#end-title')).includes('bust')); await p.click('#btn-end-ok'); await p.waitForSelector('#screen-title:not([hidden])');
  // win at the Green, free
  await T(p, () => { const K = window.__openstall; K.start('green', 5); K.run.coins = 5000; K.run.phase = 'dusk'; K.run.spin = K.run.spinsToday; K.pay(); }); await p.waitForSelector('#modal-end:not([hidden])');
  check('buying the shop wins the season and raises the pool tier', (await p.textContent('#end-title')).includes('yours') && (await T(p, () => window.__openstall.profile.meta.tier)) === 2);
  check('a free win names what the full game adds', (await p.textContent('#end-unlock')).includes('full game') && (await p.textContent('#btn-end-free')).includes('full game'));
  check('the free pool stays at tier 1 whatever the profile reached', await T(p, () => window.__openstall.E.maxTier(window.__openstall.profile.meta, false) === 1 && window.__openstall.run.tier <= 1));
  await p.click('#btn-end-free'); await p.waitForSelector('#modal-unlock:not([hidden])');
  check('the Free Market asks for the unlock', (await p.textContent('#u-sub')) === 'The Free Market' && (await T(p, () => !window.__openstall.run.endless)));
  await p.click('#u-later'); await p.click('#btn-end-ok'); await p.waitForSelector('#screen-title:not([hidden])');
  { // the Play edition: buying opens everything; a reinstall restores it
    const { ctx, q, qe } = await fresh(b, fakePlay, false);
    await q.click('.loc >> nth=2'); await q.click('#btn-start'); await q.waitForSelector('#modal-unlock:not([hidden])'); await q.waitForTimeout(150);
    check('in the Play app the sheet shows Play\'s price', (await q.textContent('#u-buy')).includes('$4.99') && !(await q.isDisabled('#u-buy')));
    await q.click('#u-buy'); await q.waitForSelector('#screen-market:not([hidden])');
    check('buying opens the market that was asked for', (await T(q, () => window.__buys)) === 1 && (await T(q, () => window.__openstall.run.loc)) === 'square' && (await q.textContent('#hdr-spins')).includes('/ 4'));
    check('the pool opens past tier 1 once bought', await T(q, () => window.__openstall.E.maxTier({ tier: 3 }, window.__openstall.billing.state.owned) === 3));
    await ctx.close(); check('no errors in the Play edition run', qe.length === 0, qe.join(' | '));
    const r = await fresh(b, () => { const say = m => setTimeout(() => window.__billingEvent(JSON.stringify(m)), 30); window.AndroidBilling = { start(id) { say({ type: 'ready', product: id }); say({ type: 'owned', product: id, owned: true }); }, buy() { }, restore(id) { say({ type: 'owned', product: id, owned: true }); } }; });
    await r.q.waitForTimeout(200);
    check('a reinstall that Play says owns the unlock opens every market', await T(r.q, () => document.querySelectorAll('.loc.locked').length === 0 && window.__openstall.billing.state.owned));
    await r.ctx.close();
  }
  for (const [label, junk] of [['truncated JSON', '{"run":{"loc":"green","week":"x"'], ['wrong types', '{"v":1,"run":{"loc":"green","week":"zzz","coins":"1e999","stock":"no","layout":"x"},"meta":{"tier":"9","unlocked":true}}'], ['not an object', '42'], ['a save that claims the unlock', '{"v":1,"meta":{"tier":3,"unlocked":true}}']]) {
    const { ctx, q, qe } = await fresh(b, j => { try { localStorage.setItem('openstall.v1', j); } catch (e) { } }, junk);
    check('a mangled save still loads and opens nothing: ' + label, qe.length === 0 && await T(q, () => { const K = window.__openstall; return K.profile.meta.tier <= 3 && document.querySelectorAll('.loc.locked').length === 2 && K.E.maxTier(K.profile.meta, K.billing.state.owned) <= 1; }), qe.join(' | ')); await ctx.close();
  }
  { // a 1.0 paid-edition save with a season at the Harbour: kept, and the sheet explains, until Play says owned
    const { ctx, q, qe } = await fresh(b, () => { try { localStorage.setItem('openstall.v1', JSON.stringify({ v: 1, meta: { tier: 3, unlocked: true }, run: { loc: 'harbour', week: 3, coins: 40, stock: [{ id: 'apple' }, { id: 'loaf' }] } })); } catch (e) { } });
    check('a 1.0 Harbour season is kept but asks for the unlock', qe.length === 0 && (await q.isVisible('#modal-unlock')) && (await q.textContent('#u-sub')) === 'Your saved season' && await T(q, () => window.__openstall.run && window.__openstall.run.loc === 'harbour' && window.__openstall.run.layout.filter(u => u != null).length === 2), qe.join(' | ')); await ctx.close();
  }
  { // phone width: nothing spills sideways on the market screen with the arrange bar open
    await T(p, () => { window.__openstall.start('green', 9); }); await p.waitForSelector('#screen-market:not([hidden])'); await p.click('#stall .cell:not(.empty)');
    const r = await T(p, () => ({ overflow: document.documentElement.scrollWidth - innerWidth, tabs: [...document.querySelectorAll('.tab')].every(t => t.scrollWidth <= t.clientWidth + 1) }));
    check('at 360px the market and the arrange bar fit', r.overflow <= 0 && r.tabs, JSON.stringify(r));
  }
  check('no page errors, console errors or failed requests', errs.length === 0, errs.join(' | '));
  await b.close(); console.log(failures ? `${failures} FAILED` : 'ALL PASSED'); process.exit(failures ? 1 : 0);
})();
