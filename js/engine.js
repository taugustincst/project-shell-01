/* Open Stall — rules engine. Pure functions over a plain run object; deterministic (seeded RNG); no DOM. */
(function (root) {
'use strict';
const D = (typeof OS_DATA !== 'undefined') ? OS_DATA : require('./data.js');
const SYM = {}; D.SYMBOLS.forEach(s => { SYM[s.id] = s; });
const CHARM = {}; D.CHARMS.forEach(c => { CHARM[c.id] = c; });
const EVENT = {}; D.EVENTS.forEach(e => { EVENT[e.id] = e; });
const LOC = {}; D.LOCATIONS.forEach(l => { LOC[l.id] = l; });
const COLS = D.GRID.cols, ROWS = D.GRID.rows, CELLS = COLS * ROWS;
const AGE_CAP = 6;
const STARTERS = ['apple', 'loaf', 'jam', 'daffodil', 'spoon', 'bottle'];

function rand(s) { s.seed = (s.seed + 0x6D2B79F5) | 0; let t = s.seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
function pick(s, arr) { return arr[Math.floor(rand(s) * arr.length)]; }
function shuffle(s, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand(s) * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
function hasTag(sym, t) { return sym.fam === t || sym.id === t || sym.tags.indexOf(t) >= 0; }
const TAG_WORDS = {}; D.SYMBOLS.forEach(s => s.tags.forEach(t => { TAG_WORDS[t] = true; }));
const tagName = t => D.FAMILIES[t] ? D.FAMILIES[t].toLowerCase() : TAG_WORDS[t] ? t : SYM[t] ? SYM[t].name.toLowerCase() : t;
const wxName = w => D.WEATHER[w].name.toLowerCase();

/* ---------- plain-language rules ---------- */
function ruleText(sym) {
  const r = sym.rule, n = r.n;
  switch (r.k) {
    case 'adj': return `Pays +${n} for each ${tagName(r.t)} item next to it.`;
    case 'adjx': return `Pays ×${r.m} when next to anything ${tagName(r.t)}.`;
    case 'boost': return `Each ${tagName(r.t)} item next to it pays +${n}.`;
    case 'wx': return n >= 0 ? `Pays +${n} on a ${wxName(r.w)} day.` : `Pays ${n} on a ${wxName(r.w)} day.`;
    case 'count': return `Pays +${n} for every other ${tagName(r.t)} item anywhere on the stall.`;
    case 'eat': return `Sells through: each ${tagName(r.t)} item next to it is sold for +${n} and leaves your stock.`;
    case 'age': return `Pays +${n} more for every browse it has been out on the stall, up to ${AGE_CAP}.`;
    case 'sellout': return `After ${r.kk} browses out it sells out for ${n} and leaves your stock.`;
    case 'empty': return `Pays +${n} for each empty space next to it.`;
    case 'row': return `Pays +${n} when its row holds three or more ${tagName(r.t)} items.`;
    case 'week': return `Pays +${n} for every two weeks of the season so far.`;
    case 'spawn': return `Each browse, a ${Math.round(r.p * 100)}% chance to add ${SYM[r.s].name} to your stock.`;
    case 'turn': return `Each ${tagName(r.t)} item next to it becomes ${SYM[r.s].name}.`;
    case 'lone': return `Pays +${n} when nothing from the ${D.FAMILIES[sym.fam].toLowerCase()} family is next to it.`;
    default: return 'No special rule.';
  }
}
function charmText(c) {
  const e = c.eff, p = e.p, n = e.n, m = e.m;
  switch (e.k) {
    case 'tagpay': return `Every ${tagName(e.t)} item pays +${n}.`;
    case 'tagmult': return `Every ${tagName(e.t)} item pays ×${m}.`;
    case 'wxmult': return `On ${wxName(e.w)} days everything pays ×${m}.`;
    case 'spins': return n > 0 ? `+${n} browse${n > 1 ? 's' : ''} every market day.` : `${n} browse every market day.`;
    case 'rent': return p > 0 ? `The weekly stall fee is ${p}% lower.` : `The weekly stall fee is ${-p}% higher.`;
    case 'sell': return p > 0 ? `Selling stock pays ${p}% more.` : `Selling stock pays ${-p}% less.`;
    case 'offers': return n > 0 ? `The wholesaler offers ${n} more choice${n > 1 ? 's' : ''} each browse.` : `The wholesaler offers one fewer choice each browse.`;
    case 'reroll': return `${n} free re-pick${n > 1 ? 's' : ''} of the wholesaler's offer each day.`;
    case 'emptypay': return `Each empty space on the stall pays +${n}.`;
    case 'adjmult': return `Next-to bonuses are worth ×${m}.`;
    case 'eatmult': return `Selling-through pays ×${m}.`;
    case 'first': return `The first browse of the day pays ×${m}.`;
    case 'last': return `The last browse of the day pays ×${m}.`;
    case 'flat': return `Every browse pays +${n} on top.`;
    case 'min': return `Every item on the stall pays at least ${n}.`;
    case 'countpay': return `Each browse pays +${n} for every ${tagName(e.t)} item in your stock.`;
    case 'refund': return `Whenever an item sells out or sells through, +${n}.`;
    case 'weatherlock': return `Every day is ${wxName(e.w)}.`;
    case 'interest': return `At dusk, +${p}% of your coins (up to 50).`;
    case 'agemult': return `Age bonuses are worth ×${m}.`;
    case 'spawnmult': return `Chances to multiply are ×${m}.`;
    case 'rowmult': return `Row bonuses are worth ×${m}.`;
    case 'lonemult': return `Lone bonuses are worth ×${m}.`;
    case 'weekmult': return `Season bonuses are worth ×${m}.`;
    case 'selloutmult': return `Sell-outs pay ×${m}.`;
    case 'nothing': return 'Nothing changes.';
    default: return '';
  }
}

/* ---------- pools & meta ---------- */
function maxTier(meta, unlocked) { return Math.min(meta && typeof meta.tier === 'number' ? meta.tier : 0, unlocked ? 3 : 1); }
function symbolPool(tier) { return D.SYMBOLS.filter(s => s.tier <= tier); }
function charmPool(tier) { return D.CHARMS.filter(c => c.tier <= tier); }

/* ---------- run ---------- */
function newRun(opts) {
  opts = opts || {};
  const loc = LOC[opts.loc] || D.LOCATIONS[0];
  const r = {
    v: 1, seed: (opts.seed | 0) || ((Date.now() ^ (Math.random() * 1e9)) | 0), loc: loc.id, tier: Math.max(0, Math.min(3, opts.tier | 0)),
    week: 1, spin: 0, spinsToday: loc.spins, coins: loc.start, stock: [], charms: [], weather: 'sun', forecast: 'sun', event: 'nothing',
    offers: null, charmOffers: [], rerolls: 0, ended: null, uid: 1, ledger: [], last: null, combos: {}, stats: { browses: 0, earned: 0, best: 0, sold: 0, rentPaid: 0, spent: 0 }, phase: 'dawn',
    layout: new Array(CELLS).fill(null)
  };
  const starters = (opts.starters || STARTERS).map(id => SYM[id] ? id : null).filter(Boolean);
  for (const id of starters) addStock(r, id);
  r.forecast = rollWeather(r);
  dawn(r);
  return r;
}
function addStock(r, id) { if (!SYM[id]) return null; const it = { id, age: 0, uid: r.uid++ }; r.stock.push(it); autoPlace(r, it.uid); return it; }

/* ---------- the stall's layout: the player arranges it ----------
   r.layout holds the uid of the item in each of the fifteen spaces (null = empty). Stock that is not on the
   stall waits in the boxes. New stock goes into the first empty space; the player moves things around with
   move() and box(). The layout stays put from browse to browse, so what is next to what is the player's doing. */
function fixLayout(r) {
  if (!Array.isArray(r.layout) || r.layout.length !== CELLS) r.layout = new Array(CELLS).fill(null);
  const have = {}; for (const it of r.stock) have[it.uid] = true; const seen = {};
  for (let i = 0; i < CELLS; i++) { const u = r.layout[i]; if (u == null || !have[u] || seen[u]) r.layout[i] = null; else seen[u] = true; }
  return r.layout;
}
function autoPlace(r, uid) { fixLayout(r); if (r.layout.indexOf(uid) >= 0) return true; const e = r.layout.indexOf(null); if (e < 0) return false; r.layout[e] = uid; return true; }
function canArrange(r) { return !r.ended && r.phase !== 'over' && !r.offers; }
/* Put an item in a space. From another space it swaps with whatever is there; from the boxes it sends that to the boxes. */
function move(r, uid, cell) {
  if (!canArrange(r) || !(cell >= 0 && cell < CELLS) || !r.stock.some(it => it.uid === uid)) return false;
  fixLayout(r); const from = r.layout.indexOf(uid), occ = r.layout[cell];
  if (from === cell) return true;
  r.layout[cell] = uid; if (from >= 0) r.layout[from] = occ;
  return true;
}
/* Swap two spaces (either may be empty). */
function swapCells(r, a, b) {
  if (!canArrange(r) || !(a >= 0 && a < CELLS) || !(b >= 0 && b < CELLS)) return false;
  fixLayout(r); const t = r.layout[a]; r.layout[a] = r.layout[b]; r.layout[b] = t; return true;
}
function box(r, uid) { if (!canArrange(r)) return false; fixLayout(r); const i = r.layout.indexOf(uid); if (i < 0) return false; r.layout[i] = null; return true; }
function boxed(r) { fixLayout(r); const on = {}; for (const u of r.layout) if (u != null) on[u] = true; return r.stock.filter(it => !on[it.uid]); }
function onStall(r) { fixLayout(r); const by = {}; for (const it of r.stock) by[it.uid] = it; return r.layout.map(u => u == null ? null : by[u]); }
function rollWeather(r) {
  const loc = LOC[r.loc], lock = modsFor(r).find(m => m.k === 'weatherlock');
  if (lock) return lock.w;
  const w = []; for (const id of D.WEATHER_ORDER) { const b = (loc.weatherBias && loc.weatherBias[id]) || 1; for (let i = 0; i < Math.round(b * 4); i++) w.push(id); }
  return pick(r, w);
}
function modsFor(r) {
  const out = r.charms.map(id => CHARM[id] && CHARM[id].eff).filter(Boolean);
  if (r.event && EVENT[r.event]) out.push(EVENT[r.event].eff);
  return out;
}
function modSum(mods, k, f) { let v = 0; for (const m of mods) if (m.k === k && (!f || f(m))) v += (typeof m.n === 'number' ? m.n : typeof m.p === 'number' ? m.p : 0); return v; }
function modProd(mods, k, f) { let v = 1; for (const m of mods) if (m.k === k && (!f || f(m))) v *= m.m; return v; }
function dawn(r) {
  r.phase = 'market'; r.spin = 0;
  r.event = pick(r, D.EVENTS).id;
  const mods = modsFor(r);
  r.weather = modsFor(r).find(m => m.k === 'weatherlock') ? modsFor(r).find(m => m.k === 'weatherlock').w : r.forecast;
  r.forecast = rollWeather(r);
  r.spinsToday = Math.max(1, LOC[r.loc].spins + modSum(mods, 'spins'));
  r.rerolls = modSum(mods, 'reroll');
  r.offers = null; r.charmOffers = [];
  r.ledger.push({ week: r.week, type: 'dawn', weather: r.weather, event: r.event });
}
function offerCount(r) { return Math.max(1, LOC[r.loc].offers + modSum(modsFor(r), 'offers')); }
function makeOffers(r) {
  const pool = symbolPool(r.tier), n = offerCount(r), out = [];
  const weighted = []; for (const s of pool) { const w = [6, 4, 3, 2][s.tier]; for (let i = 0; i < w; i++) weighted.push(s.id); }
  while (out.length < n && out.length < pool.length) { const id = pick(r, weighted); if (out.indexOf(id) < 0) out.push(id); }
  r.offers = out;
}
function makeCharmOffers(r) {
  const pool = charmPool(r.tier).filter(c => r.charms.indexOf(c.id) < 0); shuffle(r, pool); r.charmOffers = pool.slice(0, 3).map(c => c.id);
}

/* ---------- one browse (the customers look at the stall) ---------- */
function neighbours(i) { const c = i % COLS, rw = Math.floor(i / COLS), out = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const nc = c + dc, nr = rw + dr; if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS) out.push(nr * COLS + nc); } return out; }
const NB = []; for (let i = 0; i < CELLS; i++) NB.push(neighbours(i));
function rowCells(i) { const rw = Math.floor(i / COLS), out = []; for (let c = 0; c < COLS; c++) out.push(rw * COLS + c); return out; }

/* What the stall pays for one browse as it is laid out. preview = true scores a copy, rolls no dice and
   changes nothing (the chance to multiply is left out), so the game can show the player what an arrangement
   is worth before the customers come. */
function scoreStall(r, preview) {
  const mods = modsFor(r), wx = r.weather, week = r.week;
  const adjM = modProd(mods, 'adjmult'), eatM = modProd(mods, 'eatmult'), ageM = modProd(mods, 'agemult'), spawnM = modProd(mods, 'spawnmult'), rowM = modProd(mods, 'rowmult'), loneM = modProd(mods, 'lonemult'), weekM = modProd(mods, 'weekmult'), soM = modProd(mods, 'selloutmult');
  const refund = modSum(mods, 'refund'), minPay = Math.max(0, modSum(mods, 'min')), emptyPay = modSum(mods, 'emptypay'), flat = modSum(mods, 'flat');
  // the stall as the player laid it out (copies, so a preview changes nothing)
  const real = onStall(r), grid = real.map(it => it ? { id: it.id, age: it.age, uid: it.uid } : null);
  const symAt = i => grid[i] ? SYM[grid[i].id] : null;
  const combos = [], removed = [], spawned = [];
  // phase 1: transformations
  for (let i = 0; i < CELLS; i++) { const s = symAt(i); if (!s || s.rule.k !== 'turn') continue; for (const j of NB[i]) { const o = symAt(j); if (o && hasTag(o, s.rule.t) && o.id !== s.rule.s) { grid[j].id = s.rule.s; grid[j].age = 0; combos.push({ sym: s.id, rule: 'turn', with: o.id, text: `${s.name} turned ${o.name} into ${SYM[s.rule.s].name}` }); } } }
  // phase 2: base pays and boosts
  const pay = new Array(CELLS).fill(0), bonus = new Array(CELLS).fill(0);
  for (let i = 0; i < CELLS; i++) { const s = symAt(i); if (s) pay[i] = s.pay; }
  for (let i = 0; i < CELLS; i++) { const s = symAt(i); if (!s || s.rule.k !== 'boost') continue; let hit = 0; for (const j of NB[i]) { const o = symAt(j); if (o && hasTag(o, s.rule.t)) { bonus[j] += s.rule.n * adjM; hit++; } } if (hit) combos.push({ sym: s.id, rule: 'boost', with: s.rule.t, text: `${s.name} boosted ${hit} ${tagName(s.rule.t)} item${hit > 1 ? 's' : ''}` }); }
  // phase 3: own rules
  for (let i = 0; i < CELLS; i++) {
    const it = grid[i]; if (!it) continue; const s = SYM[it.id], rl = s.rule; let add = 0, mult = 1, fired = null;
    switch (rl.k) {
      case 'adj': { let c = 0; for (const j of NB[i]) { const o = symAt(j); if (o && hasTag(o, rl.t)) c++; } if (c) { add = c * rl.n * adjM; fired = `${s.name} next to ${c} ${tagName(rl.t)}`; } break; }
      case 'adjx': { if (NB[i].some(j => symAt(j) && hasTag(symAt(j), rl.t))) { mult = rl.m; fired = `${s.name} ×${rl.m} beside ${tagName(rl.t)}`; } break; }
      case 'wx': if (wx === rl.w) { add = rl.n; fired = `${s.name} in the ${wxName(wx)}`; } break;
      case 'count': { let c = 0; for (let j = 0; j < CELLS; j++) if (j !== i && symAt(j) && hasTag(symAt(j), rl.t)) c++; if (c) { add = c * rl.n; fired = `${s.name} counted ${c} ${tagName(rl.t)}`; } break; }
      case 'eat': { let c = 0; for (const j of NB[i]) { const o = grid[j]; if (o && hasTag(SYM[o.id], rl.t) && removed.indexOf(o) < 0) { removed.push(o); c++; } } if (c) { add = c * rl.n * eatM + c * refund; fired = `${s.name} sold through ${c} ${tagName(rl.t)}`; } break; }
      case 'age': if (it.age > 0) { const a = Math.min(AGE_CAP, it.age); add = a * rl.n * ageM; fired = `${s.name} aged ${a}`; } break;
      case 'sellout': if (it.age + 1 >= rl.kk) { add = rl.n * soM + refund; removed.push(it); fired = `${s.name} sold out`; } break;
      case 'empty': { let c = 0; for (const j of NB[i]) if (!grid[j]) c++; if (c) { add = c * rl.n; fired = `${s.name} with ${c} empty space${c > 1 ? 's' : ''}`; } break; }
      case 'row': { let c = 0; for (const j of rowCells(i)) if (symAt(j) && hasTag(symAt(j), rl.t)) c++; if (c >= 3) { add = rl.n * rowM; fired = `${s.name} in a row of ${tagName(rl.t)}`; } break; }
      case 'week': { const n = Math.floor(week / 2) * rl.n * weekM; if (n > 0) { add = n; fired = `${s.name} in week ${week}`; } break; }
      case 'spawn': if (!preview && rand(r) < Math.min(0.95, rl.p * spawnM)) { spawned.push(rl.s); fired = `${s.name} brought a ${SYM[rl.s].name}`; } break;
      case 'lone': if (!NB[i].some(j => symAt(j) && symAt(j).fam === s.fam)) { add = rl.n * loneM; fired = `${s.name} alone`; } break;
    }
    if (fired) combos.push({ sym: s.id, rule: rl.k, with: rl.t || rl.w || rl.s || '', text: fired });
    pay[i] = (pay[i] + add + bonus[i]) * mult;
  }
  // phase 4: charm & day modifiers
  const wxM = modProd(mods, 'wxmult', m => m.w === wx);
  const isFirst = r.spin === 0, isLast = r.spin === r.spinsToday - 1;
  const spinM = (isFirst ? modProd(mods, 'first') : 1) * (isLast ? modProd(mods, 'last') : 1) * wxM;
  let total = 0; const cellPay = new Array(CELLS).fill(0);
  for (let i = 0; i < CELLS; i++) {
    const s = symAt(i);
    if (!s) { cellPay[i] = emptyPay; total += emptyPay; continue; }
    let p = pay[i]; for (const m of mods) { if (m.k === 'tagpay' && hasTag(s, m.t)) p += m.n; }
    for (const m of mods) { if (m.k === 'tagmult' && hasTag(s, m.t)) p *= m.m; }
    p = Math.max(minPay, p); cellPay[i] = p; total += p;
  }
  for (const m of mods) if (m.k === 'countpay') total += m.n * r.stock.filter(it => hasTag(SYM[it.id], m.t)).length;
  total += flat; total = Math.round(total * spinM);
  return { grid, real, cellPay: cellPay.map(v => Math.round(v * spinM)), total, combos, removed, spawned, spinM, wx, isFirst, isLast };
}
function preview(r) { const s = scoreStall(r, true); return { total: s.total, cellPay: s.cellPay }; }
function browse(r) {
  if (r.ended || r.phase !== 'market' || r.offers) return null;
  const sc = scoreStall(r, false), grid = sc.grid, real = sc.real, combos = sc.combos, spawned = sc.spawned, total = sc.total, cellPay = sc.cellPay, wx = sc.wx, isFirst = sc.isFirst, isLast = sc.isLast, spinM = sc.spinM;
  const removedUids = sc.removed.map(it => it.uid), removed = [];
  // apply: what was turned stays turned, everything out on the stall ages, what sold leaves the stock and its space
  for (let i = 0; i < CELLS; i++) { const it = real[i]; if (!it) continue; if (grid[i].id !== it.id) { it.id = grid[i].id; it.age = 0; } else it.age++; if (removedUids.indexOf(it.uid) >= 0) { removed.push(it); r.layout[i] = null; } }
  r.stock = r.stock.filter(it => removed.indexOf(it) < 0);
  for (const id of spawned) addStock(r, id);
  r.coins += total; r.stats.browses++; r.stats.earned += total; if (total > r.stats.best) r.stats.best = total;
  for (const c of combos) { const key = c.sym + ':' + c.rule + ':' + c.with; r.combos[key] = (r.combos[key] | 0) + 1; }
  r.spin++;
  const result = { grid: grid.map(it => it ? { id: it.id, uid: it.uid } : null), cellPay, total, combos, removed: removed.map(it => it.id), spawned, spinM, weather: wx, first: isFirst, last: isLast };
  r.last = result;
  makeOffers(r);
  return result;
}
/* Stock costs its price at the wholesaler; selling it back returns half. */
function buyPrice(r, id) { return SYM[id] ? SYM[id].price : 0; }
function takeOffer(r, i) { if (!r.offers) return false; const id = r.offers[i]; if (!id) return false; const cost = buyPrice(r, id); if (r.coins < cost) return false; r.coins -= cost; r.stats.spent += cost; addStock(r, id); r.offers = null; afterOffer(r); return true; }
function skipOffer(r) { if (!r.offers) return false; r.offers = null; afterOffer(r); return true; }
function rerollOffers(r) { if (!r.offers || r.rerolls <= 0) return false; r.rerolls--; makeOffers(r); return true; }
function afterOffer(r) { if (r.spin >= r.spinsToday) { r.phase = 'dusk'; makeCharmOffers(r); } }

/* ---------- dusk ---------- */
function baseRent(r) { const rents = LOC[r.loc].rent; return r.week <= rents.length ? rents[r.week - 1] : Math.round(rents[rents.length - 1] * Math.pow(1.2, r.week - rents.length)); }
function rentDue(r) { const mods = modsFor(r); const pct = modSum(mods, 'rent', () => true); return Math.max(0, Math.round(baseRent(r) * (1 - Math.min(90, pct) / 100))); }
function shopPrice(r) { return LOC[r.loc].shop; }
function sellPrice(r, it) { const s = SYM[it.id]; const pct = modSum(modsFor(r), 'sell', () => true); return Math.max(1, Math.min(s.price, Math.round(s.price / 2 * (1 + pct / 100)))); }
function sell(r, uid) { const i = r.stock.findIndex(it => it.uid === uid); if (i < 0 || r.ended || r.offers) return false; const v = sellPrice(r, r.stock[i]); r.coins += v; r.stats.sold += v; r.stock.splice(i, 1); fixLayout(r); return v; }
function buyCharm(r, i) { const id = r.charmOffers[i]; if (!id || r.ended || r.phase !== 'dusk') return false; const c = CHARM[id]; if (r.coins < c.price || r.charms.indexOf(id) >= 0) return false; r.coins -= c.price; r.charms.push(id); r.charmOffers.splice(i, 1); return true; }
function buyShop(r) { if (r.ended || r.endless || r.coins < shopPrice(r)) return false; r.coins -= shopPrice(r); r.ended = 'win'; r.phase = 'over'; r.ledger.push({ week: r.week, type: 'win' }); return true; }
/* Free Market: keep trading after the shop is bought; the fee keeps climbing until it cannot be paid. */
function goEndless(r) { if (r.ended !== 'win') return false; r.ended = null; r.endless = true; r.phase = 'night'; r.ledger.push({ week: r.week, type: 'endless' }); return true; }
/* Pay the week's fee. Returns 'paid', 'lose' or 'win'. */
function payRent(r) {
  if (r.ended || r.phase !== 'dusk') return null;
  const due = rentDue(r); const mods = modsFor(r);
  if (r.coins < due) { r.ended = 'lose'; r.phase = 'over'; r.ledger.push({ week: r.week, type: 'lose', due, coins: r.coins }); return 'lose'; }
  r.coins -= due; r.stats.rentPaid += due;
  const ip = modSum(mods, 'interest'); if (ip > 0) r.coins += Math.min(50, Math.round(r.coins * ip / 100));
  r.ledger.push({ week: r.week, type: 'rent', due, coins: r.coins });
  if (!r.endless && r.coins >= shopPrice(r)) return 'canbuy';
  if (!r.endless && r.week >= D.WEEKS) { r.ended = 'lose'; r.phase = 'over'; r.ledger.push({ week: r.week, type: 'seasonover', coins: r.coins }); return 'lose'; }
  r.phase = 'night'; return 'paid';
}
function nextWeek(r) { if (r.ended || r.phase !== 'night') return false; r.week++; dawn(r); return true; }

/* ---------- save hygiene ---------- */
const num = (v, def, lo, hi) => { v = +v; if (!isFinite(v)) v = def; return Math.min(hi, Math.max(lo, v)); };
function sanitizeRun(raw) {
  if (!raw || typeof raw !== 'object' || !LOC[raw.loc]) return null;
  const r = newRun({ loc: raw.loc, seed: raw.seed, tier: raw.tier }); r.stock = []; r.ledger = []; r.combos = {};
  r.week = Math.round(num(raw.week, 1, 1, raw.endless === true ? 200 : D.WEEKS)); r.spin = Math.round(num(raw.spin, 0, 0, 20)); r.spinsToday = Math.round(num(raw.spinsToday, LOC[r.loc].spins, 1, 20));
  r.coins = Math.round(num(raw.coins, 0, 0, 1e9)); r.uid = Math.round(num(raw.uid, 1, 1, 1e9));
  if (Array.isArray(raw.stock)) for (const it of raw.stock.slice(0, 200)) if (it && SYM[it.id]) r.stock.push({ id: it.id, age: Math.round(num(it.age, 0, 0, 1000)), uid: Math.round(num(it.uid, r.uid++, 1, 1e9)) });
  if (Array.isArray(raw.charms)) r.charms = raw.charms.filter(id => CHARM[id]).slice(0, 40);
  r.weather = D.WEATHER[raw.weather] ? raw.weather : 'sun'; r.forecast = D.WEATHER[raw.forecast] ? raw.forecast : 'sun'; r.event = EVENT[raw.event] ? raw.event : 'nothing';
  r.offers = Array.isArray(raw.offers) ? raw.offers.filter(id => SYM[id]).slice(0, 6) : null; if (r.offers && !r.offers.length) r.offers = null;
  r.charmOffers = Array.isArray(raw.charmOffers) ? raw.charmOffers.filter(id => CHARM[id]).slice(0, 3) : [];
  r.rerolls = Math.round(num(raw.rerolls, 0, 0, 10));
  r.ended = ['win', 'lose'].indexOf(raw.ended) >= 0 ? raw.ended : null; r.endless = raw.endless === true;
  r.phase = ['market', 'dusk', 'night', 'over'].indexOf(raw.phase) >= 0 ? raw.phase : 'market'; if (r.ended) r.phase = 'over';
  if (raw.stats && typeof raw.stats === 'object') for (const k in r.stats) r.stats[k] = Math.round(num(raw.stats[k], 0, 0, 1e9));
  if (raw.combos && typeof raw.combos === 'object') for (const k in raw.combos) if (typeof k === 'string' && k.length < 60) r.combos[k] = Math.round(num(raw.combos[k], 1, 1, 1e6));
  if (Array.isArray(raw.ledger)) r.ledger = raw.ledger.filter(l => l && typeof l === 'object').slice(-60);
  // the layout: kept where it is valid; an older save (laid out at random each browse) fills the stall in stock order
  r.layout = Array.isArray(raw.layout) && raw.layout.length === CELLS ? raw.layout.map(u => (u == null ? null : Math.round(num(u, 0, 0, 1e9)))) : null;
  fixLayout(r); if (!Array.isArray(raw.layout)) for (const it of r.stock) autoPlace(r, it.uid);
  r.last = null;
  if (r.phase === 'market' && r.spin >= r.spinsToday && !r.offers) { r.phase = 'dusk'; makeCharmOffers(r); }
  return r;
}

const ENGINE = { D, SYM, CHARM, EVENT, LOC, COLS, ROWS, CELLS, STARTERS, NB, rand, hasTag, ruleText, charmText, maxTier, symbolPool, charmPool, newRun, addStock, dawn, browse, preview, scoreStall, move, swapCells, box, boxed, onStall, fixLayout, canArrange, buyPrice, takeOffer, skipOffer, rerollOffers, rentDue, shopPrice, sellPrice, sell, buyCharm, buyShop, goEndless, baseRent, payRent, nextWeek, sanitizeRun, modsFor, offerCount };
if (typeof module !== 'undefined' && module.exports) module.exports = ENGINE; else root.OS = ENGINE;
})(typeof window !== 'undefined' ? window : globalThis);
