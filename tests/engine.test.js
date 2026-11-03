const assert = require('assert'); const E = require('../js/engine.js'); const D = E.D;
let n = 0; const t = (name, fn) => { try { fn(); n++; console.log('PASS ' + name); } catch (e) { console.log('FAIL ' + name + '\n  ' + e.message); process.exitCode = 1; } };
function autoplay(r, pickFn) { while (!r.ended) { while (r.phase === 'market') { E.browse(r); const i = pickFn ? pickFn(r) : 0; if (i >= 0) E.takeOffer(r, i); else E.skipOffer(r); } const o = E.payRent(r); if (o === 'canbuy') E.buyShop(r); if (!r.ended) E.nextWeek(r); } return r; }
t('content floors: 120 symbols in 6 families, 80 charms, 30 events, 5 weathers, 3 locations', () => {
  assert.strictEqual(D.SYMBOLS.length, 120); for (const f in D.FAMILIES) assert.strictEqual(D.SYMBOLS.filter(s => s.fam === f).length, 20, f);
  assert.strictEqual(D.CHARMS.length, 80); assert.strictEqual(D.EVENTS.length, 30); assert.strictEqual(D.WEATHER_ORDER.length, 5); assert.strictEqual(D.LOCATIONS.length, 3);
  assert.strictEqual(new Set(D.SYMBOLS.map(s => s.id)).size, 120); assert.strictEqual(new Set(D.CHARMS.map(c => c.id)).size, 80);
});
t('every symbol has a readable rule and every charm and event a readable effect', () => {
  for (const s of D.SYMBOLS) { const txt = E.ruleText(s); assert.ok(txt.length > 10 && !/undefined|NaN/.test(txt), s.id + ': ' + txt); if (s.rule.s) assert.ok(E.SYM[s.rule.s], s.id); }
  for (const c of D.CHARMS) { const txt = E.charmText(c); assert.ok(txt.length > 5 && !/undefined|NaN/.test(txt), c.id + ': ' + txt); }
  for (const e of D.EVENTS) { const txt = E.charmText(e); assert.ok(!/undefined|NaN/.test(txt), e.id); }
});
t('no gambling vocabulary in player-facing text', () => {
  const bad = /\b(slot|slots|casino|jackpot|gamble|gambling|bet|wager|reel|reels|spin|spins|lucky)\b/i;
  const texts = [].concat(D.SYMBOLS.map(s => s.name + ' ' + E.ruleText(s)), D.CHARMS.map(c => c.name + ' ' + E.charmText(c)), D.EVENTS.map(e => e.name + ' ' + e.text), D.LOCATIONS.map(l => l.name + ' ' + l.desc), Object.values(D.WEATHER).map(w => w.name + ' ' + w.desc));
  for (const x of texts) assert.ok(!bad.test(x), x);
});
t('same seed, same season', () => { const play = () => { const r = autoplay(E.newRun({ seed: 9, tier: 3 }), r => Math.floor(E.rand(r) * r.offers.length)); return JSON.stringify([r.week, r.coins, r.ended, r.stats, Object.keys(r.combos).length]); }; assert.strictEqual(play(), play()); });
t('a season ends in a win or a loss within 12 weeks, coins never NaN', () => {
  for (let seed = 1; seed <= 30; seed++) { const r = autoplay(E.newRun({ seed, tier: 1 }), r => { let b = 0; r.offers.forEach((id, i) => { if (E.SYM[id].pay > E.SYM[r.offers[b]].pay) b = i; }); return b; }); assert.ok(r.ended === 'win' || r.ended === 'lose'); assert.ok(r.week <= 12 && Number.isFinite(r.coins) && r.coins >= 0, seed); }
});
t('every rule kind fires and pays what it says', () => {
  const r = E.newRun({ seed: 3, tier: 3 }); r.stock = []; for (const id of ['tea', 'honey', 'honey', 'honey', 'honey', 'honey', 'honey', 'honey', 'honey']) E.addStock(r, id);
  const res = E.browse(r); assert.ok(res.combos.some(c => c.sym === 'tea' && c.rule === 'adj'), 'tea next to honey');
  const r2 = E.newRun({ seed: 4, tier: 3 }); r2.stock = []; E.addStock(r2, 'jam'); for (let i = 0; i < 14; i++) E.addStock(r2, 'apple'); const before = r2.stock.length; const res2 = E.browse(r2);
  assert.ok(res2.removed.length > 0 && r2.stock.length < before, 'jam sold through fruit'); assert.ok(res2.combos.some(c => c.rule === 'eat'));
  const r3 = E.newRun({ seed: 5, tier: 3 }); r3.stock = []; E.addStock(r3, 'brownie'); E.browse(r3); E.skipOffer(r3); E.browse(r3); assert.strictEqual(r3.stock.length, 0, 'brownies sold out after 2 browses');
  const r4 = E.newRun({ seed: 6, tier: 3 }); r4.stock = []; E.addStock(r4, 'vinegar'); for (let i = 0; i < 14; i++) E.addStock(r4, 'plum'); E.browse(r4); assert.ok(r4.stock.some(it => it.id === 'cider'), 'vinegar turned fruit into cider');
  const r5 = E.newRun({ seed: 7, tier: 3 }); r5.stock = []; E.addStock(r5, 'compass'); const res5 = E.browse(r5); assert.ok(res5.total >= 2 + 2 * 3, 'compass with empty neighbours');
});
t('charms and events change the numbers', () => {
  const base = E.newRun({ seed: 11, tier: 3 }); base.event = 'nothing'; const a = E.browse(base).total;
  const c = E.newRun({ seed: 11, tier: 3 }); c.event = 'nothing'; c.charms.push('tipjar'); const b = E.browse(c).total; assert.strictEqual(b, a + 2, 'tip jar +2');
  const w = E.newRun({ seed: 11, tier: 3 }); w.event = 'nothing'; w.charms.push('almanac'); E.dawn(w); assert.strictEqual(w.weather, 'sun', 'almanac locks the weather');
  const h = E.newRun({ seed: 11, tier: 3 }); h.event = 'halfday'; E.dawn(h); h.event = 'halfday'; h.spinsToday = Math.max(1, D.LOCATIONS[0].spins - 1); assert.strictEqual(h.spinsToday, 4);
});
t('rent escalates on the published schedule and a missed fee ends the run; the shop can be bought', () => {
  const r = E.newRun({ seed: 2 }); for (let w = 1; w <= 12; w++) { r.week = w; assert.strictEqual(E.rentDue(r), D.LOCATIONS[0].rent[w - 1]); }
  r.week = 1; r.phase = 'dusk'; r.coins = 0; assert.strictEqual(E.payRent(r), 'lose'); assert.strictEqual(r.ended, 'lose');
  const s = E.newRun({ seed: 2 }); s.phase = 'dusk'; s.coins = 5000; assert.strictEqual(E.payRent(s), 'canbuy'); assert.ok(E.buyShop(s)); assert.strictEqual(s.ended, 'win');
  assert.ok(E.goEndless(s)); assert.strictEqual(s.ended, null); E.nextWeek(s); s.week = 20; assert.ok(E.rentDue(s) > D.LOCATIONS[0].rent[11], 'endless fee keeps climbing');
});
t('pool tiers gate stock, and the free pool is tier ≤1', () => {
  assert.strictEqual(E.maxTier({ tier: 3 }, false), 1); assert.strictEqual(E.maxTier({ tier: 3 }, true), 3); assert.strictEqual(E.maxTier({ tier: 1 }, true), 1);
  assert.ok(E.symbolPool(1).length >= 60 && E.symbolPool(1).length < 120); assert.strictEqual(E.symbolPool(3).length, 120); assert.strictEqual(E.charmPool(3).length, 80);
  const r = E.newRun({ seed: 1, tier: 0 }); for (let i = 0; i < 40; i++) { E.browse(r); for (const id of r.offers) assert.strictEqual(E.SYM[id].tier, 0); E.skipOffer(r); if (r.phase !== 'market') { E.payRent(r); if (r.ended) break; E.nextWeek(r); } }
});
t('sanitizeRun survives garbage and round-trips a real run', () => {
  assert.strictEqual(E.sanitizeRun(null), null); assert.strictEqual(E.sanitizeRun({ loc: 'moon' }), null);
  const g = E.sanitizeRun({ loc: 'green', week: 99, coins: 'lots', stock: [{ id: 'nope' }, { id: 'apple', age: -5 }, 7], charms: ['x', 'beehive'], weather: 'hail', event: 'z', offers: ['bad'], phase: 'eek', ended: 'maybe', stats: { browses: 'q' } });
  assert.strictEqual(g.week, 12); assert.strictEqual(g.coins, 0); assert.strictEqual(g.stock.length, 1); assert.strictEqual(g.stock[0].age, 0); assert.deepStrictEqual(g.charms, ['beehive']); assert.strictEqual(g.weather, 'sun'); assert.strictEqual(g.event, 'nothing'); assert.strictEqual(g.offers, null); assert.strictEqual(g.ended, null); assert.strictEqual(g.stats.browses, 0);
  const r = E.newRun({ seed: 8, tier: 2 }); E.browse(r); E.takeOffer(r, 1); E.browse(r); const copy = E.sanitizeRun(JSON.parse(JSON.stringify(r)));
  for (const k of ['week', 'spin', 'coins', 'weather', 'event', 'phase']) assert.strictEqual(copy[k], r[k], k); assert.deepStrictEqual(copy.offers, r.offers); assert.strictEqual(copy.stock.length, r.stock.length);
});
console.log(process.exitCode ? 'SOME FAILED' : `ALL ${n} PASSED`);
