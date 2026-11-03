/* Open Stall — UI, save, flow. The rules live in engine.js. */
(function () {
'use strict';
const E = window.OS, D = E.D, B = window.OS_BILLING || window.KTL_BILLING;
const VERSION = '1.0.0', SAVE_KEY = 'openstall.v1', BACKUP_KEY = 'openstall.v1.backup';
const $ = id => document.getElementById(id);
const DEV = new URLSearchParams(location.search).get('dev') === '1';
const ICONS = { apple: '🍎', pear: '🍐', plum: '🫐', strawberry: '🍓', blackberry: '🫐', cherry: '🍒', lemon: '🍋', rhubarb: '🌱', carrot: '🥕', potato: '🥔', onion: '🧅', pumpkin: '🎃', tomato: '🍅', lettuce: '🥬', mushroom: '🍄', garlic: '🧄', basil: '🌿', mint: '🌿', chilli: '🌶', beetroot: '🟣',
  loaf: '🍞', sourdough: '🥖', scone: '🧁', pie: '🥧', sausageroll: '🌭', croissant: '🥐', cake: '🍰', brownie: '🍫', flapjack: '🍯', bun: '🥯', pasty: '🥟', pretzel: '🥨', gingerbread: '🍪', biscuit: '🍪', muffin: '🧁', baguette: '🥖', tart: '🥧', cheesestraw: '🧀', focaccia: '🫓', crumpet: '🫓',
  jam: '🫙', marmalade: '🍊', honey: '🍯', chutney: '🫙', pickles: '🥒', curd: '🍋', cider: '🍺', juice: '🧃', tea: '🍵', coffee: '☕', cordial: '🍶', hotsauce: '🌶', mustard: '🫙', oil: '🫒', vinegar: '🍾', jelly: '🫐', relish: '🍅', driedapple: '🍎', syrup: '🍁', kombucha: '🧉',
  rose: '🌹', tulip: '🌷', daffodil: '🌼', sunflower: '🌻', lavender: '💜', daisy: '🌼', peony: '🌸', posy: '💐', wreath: '🎍', dried: '🥀', poppy: '🌺', bluebell: '🔔', lily: '🪷', orchid: '🌸', seedlings: '🌱', herbpot: '🪴', fern: '🌿', cactus: '🌵', bouquet: '💐', sweetpea: '🌸',
  spoon: '🥄', board: '🪵', scarf: '🧣', candle: '🕯', soap: '🧼', mug: '☕', basket: '🧺', tote: '👜', birdhouse: '🏠', quilt: '🧵', earrings: '💎', wallet: '👛', owl: '🦉', teacosy: '🫖', apron: '🥼', bowl: '🥣', chime: '🎐', lantern: '🏮', rug: '🧶', bookmark: '🔖',
  map: '🗺', compass: '🧭', record: '💿', typewriter: '⌨', postcard: '📮', fossil: '🦴', watch: '⌚', snowglobe: '🔮', telescope: '🔭', bottle: '🍾', marbles: '🔵', train: '🚂', horseshoe: '🧲', feather: '🪶', geode: '💎', glass: '🔍', key: '🗝', musicbox: '🎵', ship: '⛵', vane: '🐓' };
const CHARM_ICON = { tagpay: '🏷', tagmult: '✨', wxmult: '🌤', spins: '🔔', rent: '📜', sell: '⚖', offers: '🚚', reroll: '🎟', emptypay: '🧺', adjmult: '🪧', eatmult: '🥄', first: '🐦', last: '🔔', flat: '🫙', min: '📌', countpay: '📦', refund: '🧾', weatherlock: '📅', interest: '🏦', agemult: '🍷', spawnmult: '🌱', rowmult: '📏', lonemult: '💡', weekmult: '🗓', selloutmult: '🪢' };
const ico = id => ICONS[id] || '📦';

/* ---------- profile ---------- */
let P = null, R = null, selLoc = 'green';
const num = (v, d, lo, hi) => { v = +v; return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
function freshMeta() { return { tier: 0, seasons: 0, wins: 0, winsBy: {}, bestWeek: 0, journal: {}, unlocked: false, combosEver: 0, bestBrowse: 0 }; }
function sanitizeMeta(m) {
  m = (m && typeof m === 'object') ? m : {}; const o = freshMeta();
  o.tier = Math.round(num(m.tier, 0, 0, 3)); o.seasons = Math.round(num(m.seasons, 0, 0, 1e6)); o.wins = Math.round(num(m.wins, 0, 0, 1e6)); o.bestWeek = Math.round(num(m.bestWeek, 0, 0, 999)); o.combosEver = Math.round(num(m.combosEver, 0, 0, 1e9)); o.bestBrowse = Math.round(num(m.bestBrowse, 0, 0, 1e9));
  if (m.winsBy && typeof m.winsBy === 'object') for (const k in m.winsBy) if (E.LOC[k]) o.winsBy[k] = Math.round(num(m.winsBy[k], 0, 0, 1e6));
  if (m.journal && typeof m.journal === 'object') { let n = 0; for (const k in m.journal) { if (n++ > 2000) break; const j = m.journal[k]; if (j && typeof j.text === 'string') o.journal[String(k).slice(0, 60)] = { text: j.text.slice(0, 200), n: Math.round(num(j.n, 1, 1, 1e9)), sym: typeof j.sym === 'string' && E.SYM[j.sym] ? j.sym : null }; } }
  o.unlocked = m.unlocked === true; return o;
}
function sanitizeSettings(x) { x = (x && typeof x === 'object') ? x : {}; return { large: x.large === true, motion: x.motion === true, contrast: x.contrast === true }; }
function load() {
  let raw = null; try { raw = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { try { localStorage.setItem(BACKUP_KEY, localStorage.getItem(SAVE_KEY) || ''); } catch (e2) { } }
  P = { v: 1, meta: sanitizeMeta(raw && raw.meta), settings: sanitizeSettings(raw && raw.settings) };
  R = raw && raw.run ? E.sanitizeRun(raw.run) : null; if (R && R.ended) R = null;
  if (R && !P.meta.unlocked && !E.LOC[R.loc].free) R = null;
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, run: R, meta: P.meta, settings: P.settings })); } catch (e) { } }
function poolTier() { return E.maxTier(P.meta, P.meta.unlocked || DEV); }

/* ---------- helpers ---------- */
let toastT = 0; function toast(m) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2400); }
function show(id) { $(id).hidden = false; } function hide(id) { $(id).hidden = true; }
function screen(id) { document.querySelectorAll('.screen').forEach(s => { s.hidden = s.id !== id; }); window.scrollTo(0, 0); }
function tagsOf(s) { return [D.FAMILIES[s.fam]].concat(s.tags).join(' · '); }
function journalKey(c) { return c.sym + ':' + c.rule + ':' + c.with; }

/* ---------- title ---------- */
function renderTitle() {
  const list = $('loc-list'); list.innerHTML = '';
  for (const L of D.LOCATIONS) {
    const locked = !L.free && !(P.meta.unlocked || DEV); const gated = L.tier === 2 && !(P.meta.winsBy.harbour > 0 || P.meta.winsBy.green > 0);
    const b = document.createElement('button'); b.className = 'loc' + (selLoc === L.id ? ' sel' : '') + (locked ? ' locked' : '');
    b.innerHTML = `<b></b><span></span>`; b.querySelector('b').textContent = L.name + (locked ? ' · needs the whole market' : '') + (P.meta.winsBy[L.id] ? ` · bought ${P.meta.winsBy[L.id]}×` : '');
    b.querySelector('span').textContent = L.desc; b.onclick = () => { if (locked) { toast('Unlock the whole market to trade here.'); return; } selLoc = L.id; renderTitle(); };
    list.appendChild(b);
  }
  $('btn-continue').hidden = !R;
  const t = poolTier(); const syms = E.symbolPool(t).length, charms = E.charmPool(t).length;
  $('meta-card').innerHTML = `<h2>Your trade</h2><div class="stats"><div class="stat"><b>${P.meta.seasons}</b><span>seasons traded</span></div><div class="stat"><b>${P.meta.wins}</b><span>shops bought</span></div><div class="stat"><b>${syms} / ${D.SYMBOLS.length}</b><span>stock unlocked</span></div><div class="stat"><b>${charms} / ${D.CHARMS.length}</b><span>charms unlocked</span></div><div class="stat"><b>${Object.keys(P.meta.journal).length}</b><span>combos in the journal</span></div><div class="stat"><b>${P.meta.bestBrowse}</b><span>best single browse</span></div></div><p class="muted small">${t < 1 ? 'Reach week 6 to unlock more stock and charms.' : t < 2 ? 'Buy the shop to unlock more stock and charms.' : t < 3 ? 'Buy the Harbour chandlery to unlock the last of the pool.' : 'Everything is unlocked. Go and find the combos.'}</p>`;
}
function startRun() {
  if (R) { if (!confirm('Abandon the current season and start a new one?')) return; }
  const L = E.LOC[selLoc]; if (!L.free && !(P.meta.unlocked || DEV)) { toast('Unlock the whole market to trade here.'); return; }
  R = E.newRun({ loc: selLoc, tier: poolTier() }); save(); enterMarket();
}
function enterMarket() { screen('screen-market'); setTab('stall'); renderMarket(true); }

/* ---------- market ---------- */
let activeTab = 'stall', lastGrid = null;
function setTab(t) { activeTab = t; document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === t)); document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + t)); if (t === 'stock') renderStock(); if (t === 'charms') renderCharms(); if (t === 'journal') renderJournal(); if (t === 'more') { const m = $('more-content'); $('tab-more').appendChild(m); m.hidden = false; $('btn-back-title').hidden = false; } }
function renderMarket(full) {
  const L = E.LOC[R.loc], W = D.WEATHER[R.weather], ev = E.EVENT[R.event];
  $('hdr-week').textContent = R.endless ? `Free Market · week ${R.week}` : `Week ${R.week} of ${D.WEEKS}`; $('hdr-loc').textContent = L.name;
  $('hdr-wx-icon').textContent = W.icon; $('hdr-wx-name').textContent = W.name;
  $('hdr-coins').textContent = R.coins; $('hdr-rent').textContent = E.rentDue(R); $('hdr-shop').textContent = R.endless ? '—' : E.shopPrice(R); $('hdr-spins').textContent = `${R.spin} / ${R.spinsToday}`;
  $('event-strip').textContent = `${ev.name}: ${ev.text}`;
  $('btn-browse').hidden = R.phase !== 'market'; $('btn-dusk').hidden = R.phase !== 'dusk'; $('btn-shop').hidden = R.endless || R.coins < E.shopPrice(R) || !!R.ended;
  $('stock-count').textContent = R.stock.length;
  if (full) renderStall(R.last);
  $('day-card').innerHTML = `<h2>${W.icon} ${W.name}</h2><p class="muted small">${W.desc}</p><p class="small">Tomorrow looks ${D.WEATHER[R.forecast].name.toLowerCase()}. ${R.charms.length ? R.charms.length + ' charm' + (R.charms.length > 1 ? 's' : '') + ' on the table.' : ''}</p>`;
  const led = R.ledger.filter(l => l.type === 'rent' || l.type === 'lose' || l.type === 'win').slice(-5).reverse();
  $('ledger-card').innerHTML = `<h2>Ledger</h2>` + (led.length ? led.map(l => `<div class="small">Week ${l.week}: ${l.type === 'rent' ? `paid ${l.due}, ${l.coins} left` : l.type}</div>`).join('') : '<p class="muted small">The first fee is due at dusk on Saturday.</p>') + `<p class="muted small">Browses so far: ${R.stats.browses} · earned ${R.stats.earned} · best browse ${R.stats.best}</p>`;
  if (activeTab === 'stock') renderStock(); if (activeTab === 'charms') renderCharms();
}
function renderStall(res) {
  const st = $('stall'); st.innerHTML = '';
  for (let i = 0; i < E.CELLS; i++) {
    const cell = document.createElement('button'); const it = res && res.grid[i];
    cell.className = 'cell' + (it ? '' : ' empty') + (res && !P.settings.motion ? ' pop' : '');
    if (it) { const s = E.SYM[it.id]; cell.innerHTML = `<span class="ic"></span><span class="nm"></span><span class="pv"></span>`; cell.querySelector('.ic').textContent = ico(s.id); cell.querySelector('.nm').textContent = s.name; cell.querySelector('.pv').textContent = res.cellPay[i] ? '+' + res.cellPay[i] : ''; if (res.combos.some(c => c.sym === s.id)) cell.classList.add('hot'); if (res.removed.indexOf(s.id) >= 0 && !R.stock.some(x => x.uid === it.uid)) cell.classList.add('gone'); cell.onclick = () => info(s, null); }
    else { cell.innerHTML = res && res.cellPay[i] ? `<span class="pv">+${res.cellPay[i]}</span>` : ''; cell.setAttribute('aria-label', 'empty space'); }
    if (res && !P.settings.motion) cell.style.animationDelay = (i * 0.03) + 's';
    st.appendChild(cell);
  }
}
function doBrowse() {
  if (R.phase !== 'market' || R.offers) return;
  const res = E.browse(R); if (!res) return;
  renderStall(res);
  const bits = []; if (res.spinM !== 1) bits.push(`×${res.spinM} day`); if (res.spawned.length) bits.push(res.spawned.map(id => E.SYM[id].name).join(', ') + ' added'); if (res.removed.length) bits.push(res.removed.length + ' sold through');
  $('total').innerHTML = `The customers spent <b>+${res.total}</b>${bits.length ? ' · ' + bits.join(' · ') : ''}${res.combos.length ? `<div class="small muted">${res.combos.slice(0, 4).map(c => c.text).join(' · ')}${res.combos.length > 4 ? ' · …' : ''}</div>` : ''}`;
  let fresh = 0; for (const c of res.combos) { const k = journalKey(c); if (!P.meta.journal[k]) { fresh++; P.meta.journal[k] = { text: E.ruleText(E.SYM[c.sym]), n: 0, sym: c.sym }; } P.meta.journal[k].n++; P.meta.combosEver++; }
  if (res.total > P.meta.bestBrowse) P.meta.bestBrowse = res.total;
  if (fresh) toast(fresh === 1 ? 'New combo in the journal.' : `${fresh} new combos in the journal.`);
  renderMarket(false); save();
  setTimeout(showOffer, P.settings.motion ? 50 : 650);
}
function showOffer() {
  if (!R.offers) return;
  const list = $('offer-list'); list.innerHTML = '';
  $('offer-sub').textContent = `The wholesaler · ${R.stock.length} in stock`;
  R.offers.forEach((id, i) => { const s = E.SYM[id]; const b = document.createElement('button'); b.className = 'offer'; b.innerHTML = `<span class="ic"></span><b></b><span class="tg"></span><span class="rl"></span>`; b.querySelector('.ic').textContent = ico(id); b.querySelector('b').textContent = `${s.name} · pays ${s.pay}`; b.querySelector('.tg').textContent = tagsOf(s); b.querySelector('.rl').textContent = E.ruleText(s); b.onclick = () => { E.takeOffer(R, i); hide('modal-offer'); afterOffer(); }; list.appendChild(b); });
  $('btn-offer-reroll').hidden = R.rerolls <= 0; $('btn-offer-reroll').textContent = `Re-pick (${R.rerolls})`;
  show('modal-offer');
}
function afterOffer() { save(); renderMarket(false); if (R.phase === 'dusk') showDusk(); }
function showDusk() {
  const due = E.rentDue(R);
  $('dusk-sub').textContent = `Week ${R.week} · dusk`; $('dusk-title').textContent = R.coins >= due ? 'Closing time' : 'Closing time — the fee is short';
  const spent = R.ledger.filter(l => l.type === 'dawn').length;
  $('dusk-ledger').innerHTML = `<div><span>Coins in the tin</span><span>${R.coins}</span></div><div><span>Stall fee due</span><span>−${due}</span></div><div class="tot"><span>After the fee</span><span>${R.coins - due}</span></div>${R.endless ? '' : `<div><span>The shop on the square</span><span>${E.shopPrice(R)}</span></div>`}`;
  const ch = $('dusk-charms'); ch.innerHTML = R.charmOffers.length ? '' : '<p class="muted small">Nothing left on the wholesaler\'s table tonight.</p>';
  R.charmOffers.forEach((id, i) => { const c = E.CHARM[id]; const el = document.createElement('div'); el.className = 'charm'; el.innerHTML = `<span class="ic"></span><div><b></b><span></span></div><button class="btn"></button>`; el.querySelector('.ic').textContent = CHARM_ICON[c.eff.k] || '✨'; el.querySelector('b').textContent = c.name; el.querySelector('div span').textContent = E.charmText(c); const b = el.querySelector('button'); b.textContent = c.price + ' coins'; b.disabled = R.coins < c.price; b.onclick = () => { if (E.buyCharm(R, R.charmOffers.indexOf(id))) { toast(c.name + ' on the table.'); showDusk(); renderMarket(false); save(); } }; ch.appendChild(el); });
  const sl = $('dusk-sell'); sl.innerHTML = '';
  for (const it of R.stock) { const s = E.SYM[it.id]; const el = document.createElement('button'); el.className = 'item'; el.innerHTML = `<div class="ic"></div><div class="nm"></div><div class="pr"></div>`; el.querySelector('.ic').textContent = ico(s.id); el.querySelector('.nm').textContent = s.name; el.querySelector('.pr').textContent = 'sell ' + E.sellPrice(R, it); el.onclick = () => info(s, it); sl.appendChild(el); }
  $('btn-dusk-shop').hidden = R.endless || R.coins < E.shopPrice(R);
  $('btn-pay').textContent = R.coins >= due ? 'Pay the fee and go home' : 'Face the landlord';
  show('modal-dusk');
}
function payAndSleep() {
  const o = E.payRent(R); hide('modal-dusk');
  if (o === 'lose') { endSeason(); return; }
  if (o === 'canbuy') { E.buyShop(R); endSeason(); return; }
  if (R.week >= 6 && P.meta.tier < 1) { P.meta.tier = 1; toast('Week 6: more stock and charms are in the pool from next season.'); }
  if (R.week > P.meta.bestWeek) P.meta.bestWeek = R.week;
  E.nextWeek(R); save(); renderStall(null); $('total').innerHTML = `Week ${R.week}. ${E.EVENT[R.event].name}.`; renderMarket(false); setTab('stall');
}
function endSeason() {
  const won = R.ended === 'win', L = E.LOC[R.loc];
  if (!R.counted) { R.counted = true; P.meta.seasons++; if (won) { P.meta.wins++; P.meta.winsBy[L.id] = (P.meta.winsBy[L.id] | 0) + 1; if (L.id === 'green' && P.meta.tier < 2) P.meta.tier = 2; if (L.id === 'harbour' && P.meta.tier < 3) P.meta.tier = 3; } if (R.week >= 6 && P.meta.tier < 1) P.meta.tier = 1; if (R.week > P.meta.bestWeek) P.meta.bestWeek = R.week; }
  $('end-sub').textContent = `${L.name} · week ${R.week}`;
  $('end-title').textContent = won ? 'The shop is yours' : R.endless ? 'The Free Market closes' : (R.ledger.some(l => l.type === 'seasonover') ? 'The season ends' : 'Gone bust');
  $('end-text').textContent = won ? `You counted out ${E.shopPrice(R)} coins on the landlord's desk and he gave you a key with a brown label. There is a bell over the door. It rings when you open it.` : R.endless ? `The fee finally outran the stall after ${R.week} weeks. Everyone on the square came to the last day.` : R.ledger.some(l => l.type === 'seasonover') ? `Twelve Saturdays and the shop is still for sale. You know what sells now. Next season.` : `Week ${R.week}: the fee was ${E.rentDue(R)} and the tin held ${R.coins}. The landlord was polite about it. Next season.`;
  $('end-stats').innerHTML = [['browses', R.stats.browses], ['earned', R.stats.earned], ['best browse', R.stats.best], ['combos found', Object.keys(R.combos).length], ['fees paid', R.stats.rentPaid], ['charms', R.charms.length]].map(p => `<div class="stat"><b>${p[1]}</b><span>${p[0]}</span></div>`).join('');
  $('end-unlock').textContent = won && !(P.meta.unlocked || DEV) ? 'The Harbour Market and the City Square are waiting, with the endless Free Market and the rest of the stock pool, in the whole-market unlock.' : won && P.meta.tier >= 2 ? 'New stock and charms are in the pool.' : '';
  $('btn-end-free').hidden = !(won && (P.meta.unlocked || DEV) && !R.endless);
  save(); show('modal-end');
}

/* ---------- panels ---------- */
function renderStock() {
  const box = $('stock-list'); box.innerHTML = ''; const byFam = {};
  for (const it of R.stock) (byFam[E.SYM[it.id].fam] = byFam[E.SYM[it.id].fam] || []).push(it);
  for (const f in D.FAMILIES) { const items = byFam[f]; if (!items) continue; const h = document.createElement('div'); h.className = 'fam'; h.style.gridColumn = '1 / -1'; h.textContent = `${D.FAMILIES[f]} · ${items.length}`; box.appendChild(h);
    for (const it of items) { const s = E.SYM[it.id]; const el = document.createElement('button'); el.className = 'item'; el.innerHTML = `<div class="ic"></div><div class="nm"></div><div class="pr"></div>`; el.querySelector('.ic').textContent = ico(s.id); el.querySelector('.nm').textContent = s.name; el.querySelector('.pr').textContent = `pays ${s.pay}` + (it.age ? ` · out ${it.age}×` : ''); el.onclick = () => info(s, it); box.appendChild(el); } }
  if (!R.stock.length) box.innerHTML = '<p class="muted">The boxes are empty.</p>';
}
function renderCharms() {
  const box = $('charm-list'); box.innerHTML = R.charms.length ? '' : '<p class="muted">No charms yet. The wholesaler sells them at dusk.</p>';
  for (const id of R.charms) { const c = E.CHARM[id]; const el = document.createElement('div'); el.className = 'charm'; el.innerHTML = `<span class="ic"></span><div><b></b><span></span></div><span></span>`; el.querySelector('.ic').textContent = CHARM_ICON[c.eff.k] || '✨'; el.querySelector('b').textContent = c.name; el.querySelector('div span').textContent = E.charmText(c); box.appendChild(el); }
}
function renderJournal(target) {
  const box = target || $('journal-list'); box.innerHTML = '';
  const keys = Object.keys(P.meta.journal).sort((a, b) => P.meta.journal[b].n - P.meta.journal[a].n);
  if (!keys.length) { box.innerHTML = '<p class="muted">Every combo you ever trigger is written here, with its rule. Go and find some.</p>'; return; }
  const h = document.createElement('p'); h.className = 'muted small'; h.textContent = `${keys.length} combos discovered · ${P.meta.combosEver} triggered`; box.appendChild(h);
  for (const k of keys) { const j = P.meta.journal[k]; const s = j.sym ? E.SYM[j.sym] : null; const el = document.createElement('div'); el.className = 'journal'; el.innerHTML = `<b></b><span></span>`; el.querySelector('b').textContent = (s ? ico(s.id) + ' ' + s.name : k) + ` · ${j.n}×`; el.querySelector('span').textContent = j.text; box.appendChild(el); }
}
let infoItem = null;
function info(s, it) {
  infoItem = it; $('info-sub').textContent = tagsOf(s) + ` · pays ${s.pay}`; $('info-title').textContent = `${ico(s.id)} ${s.name}`; $('info-rule').textContent = E.ruleText(s);
  $('info-extra').textContent = it ? `Out on the stall ${it.age} time${it.age === 1 ? '' : 's'}. Sells for ${E.sellPrice(R, it)}.` : '';
  $('btn-info-sell').hidden = !it || R.phase === 'over'; $('btn-info-sell').textContent = it ? `Sell for ${E.sellPrice(R, it)}` : ''; show('modal-info');
}

/* ---------- unlock ---------- */
function grantUnlock(src) { P.meta.unlocked = true; save(); toast(src === 'restore' ? 'Purchase restored. The whole market is open.' : 'The whole market is open.'); renderTitle(); if (R) renderMarket(false); }
async function doUnlock() { if (P.meta.unlocked) { toast('Already unlocked.'); return; } if (DEV) { grantUnlock('dev'); return; } const r = await B.unlock(); if (r.ok) grantUnlock('buy'); else if (r.reason === 'unavailable') toast('Unlocking is available in the Google Play version of Open Stall.'); else if (r.reason === 'cancelled') toast('No purchase made.'); else toast('The purchase could not be completed. Try again, or Restore purchase.'); }
async function doRestore() { const r = await B.restore(); if (r.ok) grantUnlock('restore'); else if (r.reason === 'unavailable') toast('Restore is available in the Google Play version.'); else toast('No purchase found for this Google account.'); }

/* ---------- settings & wiring ---------- */
function applySettings() { const s = P.settings; for (const k of ['large', 'motion', 'contrast']) { document.documentElement.classList.toggle(k, s[k]); $('opt-' + k).checked = s[k]; } }
function init() {
  load(); applySettings(); $('about-version').textContent = VERSION;
  $('btn-start').onclick = startRun; $('btn-continue').onclick = enterMarket;
  $('btn-journal-title').onclick = () => { const m = $('more-content'); m.hidden = true; const box = document.createElement('div'); box.className = 'card'; box.innerHTML = '<h2>Combo journal</h2><div id="journal-title-list"></div><div class="row-btns"><button class="btn" id="btn-journal-close">Close</button></div>'; $('screen-title').appendChild(box); renderJournal(box.querySelector('#journal-title-list')); box.querySelector('#btn-journal-close').onclick = () => box.remove(); };
  $('btn-more-title').onclick = () => { const m = $('more-content'); $('screen-title').appendChild(m); m.hidden = false; $('btn-back-title').hidden = true; m.scrollIntoView(); };
  $('btn-back-title').onclick = () => { if (confirm('Leave the market for now? The season is saved.')) { save(); screen('screen-title'); renderTitle(); } };
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $('btn-browse').onclick = doBrowse; $('btn-dusk').onclick = showDusk; $('btn-pay').onclick = payAndSleep;
  $('btn-shop').onclick = () => { if (E.buyShop(R)) endSeason(); }; $('btn-dusk-shop').onclick = () => { if (E.buyShop(R)) { hide('modal-dusk'); endSeason(); } };
  $('btn-offer-skip').onclick = () => { E.skipOffer(R); hide('modal-offer'); afterOffer(); }; $('btn-offer-reroll').onclick = () => { if (E.rerollOffers(R)) showOffer(); };
  $('btn-info-ok').onclick = () => hide('modal-info'); $('btn-info-sell').onclick = () => { if (infoItem) { const v = E.sell(R, infoItem.uid); hide('modal-info'); if (v) toast(`Sold for ${v}.`); renderMarket(false); if (!$('modal-dusk').hidden) showDusk(); if (activeTab === 'stock') renderStock(); save(); } };
  $('btn-end-ok').onclick = () => { hide('modal-end'); R = null; save(); screen('screen-title'); renderTitle(); };
  $('btn-end-free').onclick = () => { if (E.goEndless(R)) { hide('modal-end'); E.nextWeek(R); save(); renderStall(null); $('total').textContent = 'The Free Market. The fee keeps rising; see how long the stall lasts.'; renderMarket(false); } };
  $('hdr-wx').onclick = () => toast(`${D.WEATHER[R.weather].name}: ${D.WEATHER[R.weather].desc} Tomorrow looks ${D.WEATHER[R.forecast].name.toLowerCase()}.`);
  $('event-strip').onclick = () => toast(E.EVENT[R.event].text);
  for (const k of ['large', 'motion', 'contrast']) $('opt-' + k).addEventListener('change', e => { P.settings[k] = e.target.checked; applySettings(); save(); });
  $('btn-unlock').onclick = doUnlock; $('btn-restore').onclick = doRestore;
  $('btn-abandon').onclick = () => { if (R && confirm('Abandon this season? Your journal and unlocks stay.')) { R = null; save(); screen('screen-title'); renderTitle(); } };
  $('btn-reset').onclick = () => { if (confirm('Forget everything: journal, unlocked stock, seasons? Your purchase can be restored.')) { const u = P.meta.unlocked; P.meta = freshMeta(); P.meta.unlocked = u; R = null; save(); screen('screen-title'); renderTitle(); } };
  renderTitle(); $('app').hidden = false; if (R) enterMarket(); else screen('screen-title');
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
  window.addEventListener('pagehide', save); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
}
window.__openstall = {
  get run() { return R; }, get profile() { return P; }, E, D, VERSION,
  start(loc, seed) { R = E.newRun({ loc: loc || 'green', seed, tier: poolTier() }); save(); enterMarket(); return R; },
  setWeek(w) { R.week = Math.max(1, w | 0); R.phase = 'market'; R.spin = 0; R.offers = null; renderMarket(true); }, setWeather(w) { if (D.WEATHER[w]) { R.weather = w; renderMarket(false); } },
  give(c) { R.coins = +c; renderMarket(false); }, stock(ids) { for (const id of ids) E.addStock(R, id); renderMarket(false); }, charm(id) { if (E.CHARM[id] && R.charms.indexOf(id) < 0) R.charms.push(id); renderMarket(false); },
  browse: doBrowse, take(i) { E.takeOffer(R, i); hide('modal-offer'); afterOffer(); }, skip() { E.skipOffer(R); hide('modal-offer'); afterOffer(); }, pay: payAndSleep, unlock() { grantUnlock('dev'); }, setTier(t) { P.meta.tier = t; save(); renderTitle(); },
  save, reset() { localStorage.removeItem(SAVE_KEY); location.reload(); }, setTab, render: () => renderMarket(true)
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
