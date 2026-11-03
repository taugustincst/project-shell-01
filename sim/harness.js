/* Balance harness: node sim/harness.js [runsPerStrategy=50] [location=green] [tier=1]
   Auto-plays seasons with simple heuristics (random, greedy, and one focused player per combo archetype) and reports
   win-rate, coin curves and combo usage. The brief's kill rule: at least 15 distinct viable archetypes. */
const E = require('../js/engine.js'); const D = E.D;
const N = +(process.argv[2] || 50), LOC = process.argv[3] || 'green', TIER = +(process.argv[4] || 1);

function fits(sym, A) { if (!A) return false; if (A.symbols && A.symbols.indexOf(sym.id) >= 0) return true; if (A.tags) for (const t of A.tags) if (E.hasTag(sym, t)) return true; return false; }
function charmFits(c, A) { if (!A) return false; const e = c.eff; if (A.charms && A.charms.indexOf(c.id) >= 0) return true; if ((e.k === 'tagpay' || e.k === 'tagmult' || e.k === 'countpay') && A.tags && A.tags.indexOf(e.t) >= 0) return true; if ((e.k === 'wxmult' || e.k === 'weatherlock') && A.weather === e.w) return true; if (e.k === 'adjmult' && A.tags) return true; return false; }
const GENERIC = { spins: 3, flat: 2, min: 2, rent: 1, first: 1, last: 1 };

function play(strategy, A, seed) {
  const r = E.newRun({ loc: LOC, tier: TIER, seed }); const curve = [];
  while (!r.ended) {
    while (r.phase === 'market') {
      E.browse(r);
      const offers = r.offers.map(id => E.SYM[id]);
      let choice = -1;
      if (strategy === 'random') choice = Math.floor(E.rand(r) * offers.length);
      else if (strategy === 'greedy') { let b = 0; offers.forEach((s, i) => { if (s.pay > offers[b].pay) b = i; }); choice = b; }
      else { // focused: take matching symbols; otherwise only take if the stall is still sparse (or the archetype wants space)
        let best = -1, bs = -1; offers.forEach((s, i) => { const sc = (fits(s, A) ? 10 : 0) + s.pay * 0.5; if (sc > bs) { bs = sc; best = i; } });
        const cap = A.sparse ? 8 : A.spread ? 10 : 15; const dense = r.stock.length >= cap;
        if (bs >= 10 && !dense) choice = best; else if (!dense) choice = best; else if (bs >= 10 && !A.sparse && !A.spread) choice = best;
      }
      if (choice >= 0) E.takeOffer(r, choice); else E.skipOffer(r);
    }
    curve.push(r.coins);
    const o = E.payRent(r); if (o === 'canbuy') { E.buyShop(r); break; }
    if (r.ended) break;
    // dusk: sell what does not fit when the stall is crowded; buy charms that fit
    if (strategy !== 'random') {
      if (strategy !== 'greedy') { const keep = A.sparse ? 8 : A.spread ? 10 : 12; for (const it of r.stock.slice()) { if (r.stock.length <= keep) break; if (!fits(E.SYM[it.id], A)) E.sell(r, it.uid); } }
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
  const top = Object.entries(comboUse).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
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
process.exitCode = viable.length >= 15 ? 0 : 2;
