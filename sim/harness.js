/* Balance harness: node sim/harness.js [runsPerStrategy=50] [location=green] [tier=1]
   Auto-plays seasons with simple heuristics (random, greedy, and one focused player per combo archetype) and reports
   win-rate, coin curves and combo usage. The brief's kill rule: at least 15 distinct viable archetypes. */
const E = require('../js/engine.js'); const D = E.D;
const N = +(process.argv[2] || 50), LOC = process.argv[3] || 'green', TIER = +(process.argv[4] || 1);
// tuning overrides for experiments: SHOP=1200 RENTX=1.1 SPINS=5 node sim/harness.js ...
if (process.env.SHOP) D.LOCATIONS.find(l => l.id === LOC).shop = +process.env.SHOP;
if (process.env.RENTX) { const l = D.LOCATIONS.find(l => l.id === LOC); l.rent = l.rent.map(v => Math.round(v * +process.env.RENTX)); }
if (process.env.SPINS) D.LOCATIONS.find(l => l.id === LOC).spins = +process.env.SPINS;

function fits(sym, A) { if (!A) return false; if (A.symbols && A.symbols.indexOf(sym.id) >= 0) return true; if (A.tags) for (const t of A.tags) if (E.hasTag(sym, t)) return true; return false; }
function charmFits(c, A) { if (!A) return false; const e = c.eff; if (A.charms && A.charms.indexOf(c.id) >= 0) return true; if ((e.k === 'tagpay' || e.k === 'tagmult' || e.k === 'countpay') && A.tags && A.tags.indexOf(e.t) >= 0) return true; if ((e.k === 'wxmult' || e.k === 'weatherlock') && A.weather === e.w) return true; if (e.k === 'adjmult' && A.tags) return true; return false; }
const GENERIC = { spins: 3, flat: 2, min: 2, rent: 1, first: 1, last: 1 };

/* The arranger the sim's players use: place an item where the stall pays most (or leave it in the boxes), then
   try every swap of two spaces once. Random players leave things where they land. */
function bestSpot(r, uid) {
  let best = E.preview(r).total, at = null; const from = r.layout.indexOf(uid);
  for (let c = 0; c < E.CELLS; c++) { if (c === from) continue; const save = r.layout.slice(); E.move(r, uid, c); const v = E.preview(r).total; r.layout = save; if (v > best) { best = v; at = c; } }
  if (at !== null) E.move(r, uid, at);
}
function tidy(r) {
  let base = E.preview(r).total;
  for (let a = 0; a < E.CELLS; a++) for (let b = a + 1; b < E.CELLS; b++) { if (r.layout[a] == null && r.layout[b] == null) continue; E.swapCells(r, a, b); const v = E.preview(r).total; if (v > base) base = v; else E.swapCells(r, a, b); }
  for (const it of E.boxed(r)) bestSpot(r, it.uid);
}
function play(strategy, A, seed) {
  const r = E.newRun({ loc: LOC, tier: TIER, seed }); const curve = [];
  while (!r.ended) {
    if (strategy !== 'random') tidy(r);
    while (r.phase === 'market') {
      E.browse(r);
      const offers = r.offers.map(id => E.SYM[id]);
      const can = i => r.coins >= E.buyPrice(r, offers[i].id);
      let choice = -1;
      if (strategy === 'random') { const i = Math.floor(E.rand(r) * (offers.length + 1)); if (i < offers.length && can(i)) choice = i; }
      else if (strategy === 'greedy') { let b = -1; offers.forEach((s, i) => { if (can(i) && (b < 0 || s.pay > offers[b].pay)) b = i; }); if (b >= 0 && (r.stock.length < E.CELLS || offers[b].pay >= 3)) choice = b; }
      else { // focused: take what fits the archetype; otherwise only fill an empty space
        let best = -1, bs = -1; offers.forEach((s, i) => { if (!can(i)) return; const sc = (fits(s, A) ? 10 : 0) + s.pay * 0.5; if (sc > bs) { bs = sc; best = i; } });
        const cap = A.sparse ? 8 : A.spread ? 10 : E.CELLS; const dense = r.stock.length >= cap;
        if (best >= 0 && (bs >= 10 || !dense)) choice = best;
      }
      if (choice >= 0) { E.takeOffer(r, choice); if (strategy !== 'random') { const it = r.stock[r.stock.length - 1]; bestSpot(r, it.uid); } } else E.skipOffer(r);
    }
    curve.push(r.coins);
    const o = E.payRent(r); if (o === 'canbuy') { E.buyShop(r); break; }
    if (r.ended) break;
    // dusk: sell boxed stock that does not fit; buy charms that fit
    if (strategy !== 'random') {
      if (strategy !== 'greedy') for (const it of E.boxed(r)) if (!fits(E.SYM[it.id], A)) E.sell(r, it.uid);
      const next = E.rentDue({ ...r, week: Math.min(D.WEEKS, r.week + 1) }) * 1.2;
      const scored = r.charmOffers.map((id, i) => { const c = E.CHARM[id]; return { i, c, s: (charmFits(c, A) ? 5 : 0) + (GENERIC[c.eff.k] || 0) }; }).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
      for (const x of scored) if (r.coins - x.c.price >= next) { E.buyCharm(r, r.charmOffers.indexOf(x.c.id)); break; }
    }
    E.nextWeek(r);
  }
  return { win: r.ended === 'win', week: r.week, coins: r.coins, curve, combos: r.combos, best: r.stats.best, charms: r.charms.length, stock: r.stock.length };
}
function summarize(name, A, runs) {
  const wins = runs.filter(x => x.win).length; const weeks = 12; const curve = [];
  for (let w = 0; w < weeks; w++) { const v = runs.map(x => x.curve[w]).filter(v => v !== undefined); curve.push(v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0); }
  const comboUse = {}; for (const x of runs) for (const k in x.combos) comboUse[k] = (comboUse[k] | 0) + x.combos[k];
  // an archetype's signature is its most-used combo among the items it collects (the starters' combos fire for everyone)
  const ranked = Object.entries(comboUse).sort((a, b) => b[1] - a[1]); const own = A ? ranked.filter(e => fits(E.SYM[e[0].split(':')[0]], A)) : [];
  const top = (own.length ? own : ranked).slice(0, 3).map(e => e[0]);
  const meanBest = Math.round(runs.reduce((a, x) => a + x.best, 0) / runs.length);
  return { name, winRate: wins / runs.length, curve, top, meanBest, meanWeek: (runs.reduce((a, x) => a + x.week, 0) / runs.length).toFixed(1) };
}
const results = []; let total = 0;
for (const strat of ['random', 'greedy']) { const runs = []; for (let i = 0; i < N; i++) runs.push(play(strat, null, 1000 + i)); total += N; results.push(summarize(strat, null, runs)); }
for (const A of D.ARCHETYPES) { const runs = []; for (let i = 0; i < N; i++) runs.push(play('focus', A, 5000 + i)); total += N; results.push({ ...summarize(A.name, A, runs), arch: A.id }); }
const pct = v => (v * 100).toFixed(0).padStart(3) + '%';
console.log(`Open Stall balance harness — ${total} runs, location ${LOC}, pool tier ≤${TIER}`);
console.log('strategy'.padEnd(30) + 'win   wk   best  coins by week (mean, before rent)');
for (const s of results) console.log(s.name.padEnd(30) + pct(s.winRate) + '  ' + s.meanWeek.padStart(4) + '  ' + String(s.meanBest).padStart(4) + '  ' + s.curve.join(' '));
const VIABLE = 0.25;
const viable = results.filter(s => s.arch && s.winRate >= VIABLE);
const distinct = new Set(viable.map(s => s.top[0]));
console.log(`\nViable archetypes (focused win-rate ≥ ${VIABLE * 100}%): ${viable.length} of ${D.ARCHETYPES.length}; distinct signature combos: ${distinct.size}`);
for (const s of viable) console.log(`  ${s.name.padEnd(30)} ${pct(s.winRate)}  signature: ${s.top.join(', ')}`);
const base = results.find(s => s.name === 'random').winRate;
console.log(`\nRandom play wins ${pct(base)}; greedy-by-payout wins ${pct(results.find(s => s.name === 'greedy').winRate)}. Synergy should beat both.`);
if (process.argv.includes('--json')) console.log(JSON.stringify(results));
// The gate CI holds each market to (the brief's kill rule is 15 at the free Village Green; the paid markets are harder by design).
const MIN = +(process.env.MIN_VIABLE || 15);
if (viable.length < MIN) console.log(`FAIL: ${viable.length} viable archetypes, need ${MIN}.`);
process.exitCode = viable.length >= MIN ? 0 : 2;
