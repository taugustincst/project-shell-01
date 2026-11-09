'use strict';
// Emulator tap-through: Open Stall driven with real Android touch input
// (adb shell input) on a debug build of the Play edition. Play's 3 Nov 2026
// review of Bubble Pop's first upload listed "Unresponsive UI elements, such
// as buttons or icons"; this test, built the same way as Bubble Pop's, fails
// unless each control visibly does its job when a finger taps it: a locked
// market and its unlock sheet (the emulator has no Play Store, so it must say
// so and let the player carry on), opening the stall at the Village Green,
// arranging the stall (an item to a space, to the boxes and back), a browse,
// buying from the wholesaler, the rest of the day, selling at dusk, paying
// the fee, the tabs and a setting, Back, a relaunch that keeps the season and
// its layout, and the Free Market's unlock after buying the shop.
//
// The page's layout and state are read over WebView DevTools (enabled only in
// debuggable builds, see MainActivity), so every tap lands on the element's
// measured centre and every step is checked against the game's own state.
// Taps themselves never go through DevTools: they are real touches.
//
//   node tools/tap-through.js <debug-apk> [package]
// Screenshots and a log go to $TAP_THROUGH_OUT (default tap-through/).

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const APK = process.argv[2];
const PKG = process.argv[3] || 'com.taugustincst.openstall';
const OUT = process.env.TAP_THROUGH_OUT || 'tap-through';
const PORT = 9333;
if (!APK) { console.error('usage: node tools/tap-through.js <debug-apk> [package]'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const adb = (...a) => execFileSync('adb', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 << 20 }).trim();
let shotN = 0;
const shot = name => {
  const f = path.join(OUT, String(++shotN).padStart(2, '0') + '-' + name + '.png');
  try { fs.writeFileSync(f, execFileSync('adb', ['exec-out', 'screencap', '-p'], { maxBuffer: 64 << 20 })); } catch (e) { /* best effort */ }
};
let failures = 0;
const check = (name, ok, extra = '') => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
  return ok;
};
const fatal = msg => { console.log('FAIL ' + msg); finish(true); };

// ---------------------------------------------------------------- DevTools
let ws = null, msgId = 0;
const pending = new Map();
const pageErrors = [];
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('DevTools timeout: ' + method)); } }, 15000);
  });
}
async function js(expression) {
  const m = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (m.error) throw new Error('DevTools: ' + m.error.message);
  if (m.result.exceptionDetails) {
    const d = m.result.exceptionDetails;
    throw new Error('page: ' + ((d.exception && d.exception.description) || d.text));
  }
  return m.result.result.value;
}
async function connect() {
  // A freshly booted CI emulator can take well over a minute to bring up the
  // first WebView, so wait longer, and open the app again once in case its
  // first launch was lost while the phone was still settling.
  for (let i = 0; i < 100; i++) {
    if (i === 50) { try { adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1'); } catch (e) { /* try on */ } }
    let pid = '';
    try { pid = adb('shell', 'pidof', PKG); } catch (e) { /* not up yet */ }
    if (pid) {
      try {
        adb('forward', `tcp:${PORT}`, `localabstract:webview_devtools_remote_${pid.split(/\s+/)[0]}`);
        const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
        const page = list.find(t => t.type === 'page' && /appassets\.androidplatform\.net/.test(t.url));
        if (page) {
          ws = new WebSocket(page.webSocketDebuggerUrl);
          await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
          ws.onmessage = e => {
            const m = JSON.parse(e.data);
            if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
            if (m.method === 'Runtime.exceptionThrown') pageErrors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
          };
          await send('Runtime.enable');
          if (await js('!!(window.__openstall)')) return;
          ws.close(); ws = null;
        }
      } catch (e) { /* the page or its DevTools socket is not ready yet */ }
    }
    await sleep(1000);
  }
  fatal('could not reach the game page over WebView DevTools (is this a debug build?)');
}

// ----------------------------------------------------------------- geometry
let dpr = 1, offX = 0, offY = 0, screenW = 0, screenH = 0;
// Measure an element (scrolled into view programmatically if it sits in a
// scrolling panel) and make sure it is the topmost thing at its centre, so a
// tap there reaches it and nothing covers it.
async function measure(sel) {
  return js(`(function(){
    var el=document.querySelector(${JSON.stringify(sel)});
    if(!el) return {missing:true};
    el.scrollIntoView({block:'center',inline:'center'});
    var r=el.getBoundingClientRect();
    var cx=r.left+r.width/2, cy=r.top+r.height/2;
    var top=document.elementFromPoint(cx,cy);
    var visible=r.width>0&&r.height>0&&cx>=0&&cy>=0&&cx<=innerWidth&&cy<=innerHeight;
    return {cx:cx,cy:cy,w:r.width,h:r.height,visible:visible,onTop:!!top&&(top===el||el.contains(top))};
  })()`);
}
const toScreen = (cx, cy) => [Math.round(cx * dpr + offX), Math.round(cy * dpr + offY)];
// Wait for the layout to settle (the soft keyboard opening or closing
// resizes the page), so the tap lands where the element really is.
async function measureSettled(sel) {
  let m = await measure(sel);
  for (let i = 0; i < 12 && !m.missing; i++) {
    await sleep(250);
    const n = await measure(sel);
    if (n.missing || (Math.abs(n.cx - m.cx) < 1 && Math.abs(n.cy - m.cy) < 1)) return n;
    m = n;
  }
  return m;
}
// Two taps close together in time and place read as a double tap, and the
// WebView swallows the second one (CI saw a setting toggled on and the next
// tap on it lost), so a tap near the last one waits until it cannot be.
let lastTap = { t: 0, x: -1e9, y: -1e9 };
async function tap(sel, label) {
  await sleep(150);
  const m = await measureSettled(sel);
  if (m.missing) return check(`${label}: on screen`, false, `${sel} not in the page`);
  if (!check(`${label}: visible and not covered`, m.visible && m.onTop, JSON.stringify(m))) return false;
  const [x, y] = toScreen(m.cx, m.cy);
  const gap = Date.now() - lastTap.t;
  if (gap < 900 && Math.hypot(x - lastTap.x, y - lastTap.y) < 300 * dpr) await sleep(900 - gap);
  adb('shell', 'input', 'tap', String(x), String(y));
  lastTap = { t: Date.now(), x, y };
  return true;
}
// A setting toggle can lose a tap to the WebView (it read two taps on the
// same spot as a double tap in CI), so a toggle whose page state did not
// change is tapped once more after a pause.
async function tapToggle(sel, label, cond) {
  await tap(sel, label);
  if (await waitFor(cond, 2500)) return true;
  await sleep(1200);
  await tap(sel, label + ' (once more)');
  return waitFor(cond);
}
async function longPress(sel, ms) {
  const m = await measureSettled(sel);
  const [x, y] = toScreen(m.cx, m.cy);
  adb('shell', 'input', 'swipe', String(x), String(y), String(x), String(y), String(ms));
}
async function waitFor(expr, ms = 3000) {
  const end = Date.now() + ms;
  for (;;) {
    let v = false;
    try { v = await js(expr); } catch (e) { /* page busy */ }
    if (v) return true;
    if (Date.now() > end) return false;
    await sleep(150);
  }
}
const hidden = id => `document.getElementById(${JSON.stringify(id)}).hidden`;
const shown = id => `!document.getElementById(${JSON.stringify(id)}).hidden`;
function alive() { try { return adb('shell', 'pidof', PKG) !== ''; } catch (e) { return false; } }

// -------------------------------------------------------------------- run
let finished = false;
function finish(stop) {
  if (finished) return; finished = true;
  try { fs.writeFileSync(path.join(OUT, 'logcat.txt'), adb('logcat', '-d')); } catch (e) { /* best effort */ }
  if (stop) failures = failures || 1;
  console.log(failures ? `tap-through: ${failures} FAILED` : 'tap-through: every screen and control responded');
  try { if (ws) ws.close(); } catch (e) { /* closing */ }
  process.exit(failures ? 1 : 0);
}
const K = 'window.__openstall';
const tabOpen = t => `document.getElementById('tab-${t}').classList.contains('active')`;
const onStall = `${K}.run.layout.filter(function(u){return u!=null}).length`;

(async () => {
  adb('wait-for-device');
  adb('install', '-r', APK);
  try { adb('shell', 'pm', 'clear', PKG); } catch (e) { /* fresh install */ }
  adb('logcat', '-c');
  adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1');
  await connect();
  [screenW, screenH] = adb('shell', 'wm', 'size').match(/(\d+)x(\d+)\s*$/).slice(1).map(Number);
  dpr = await js('devicePixelRatio');
  await sleep(1500);
  shot('title');

  // 1. The market gate. Calibrate on the title (no handler).
  check('the game opens on the market gate with three markets', await waitFor(`${shown('screen-title')}&&document.querySelectorAll('.loc').length===3`));
  await js(`window.__tt=[];addEventListener('pointerdown',function(e){__tt.push([e.clientX,e.clientY])},true);1`);
  {
    const m = await measure('.hero h1');
    const sx = Math.round(m.cx * dpr), sy = Math.round(m.cy * dpr);
    adb('shell', 'input', 'tap', String(sx), String(sy));
    if (!(await waitFor('__tt.length>0'))) fatal('a tap on the screen never reached the page (touch input is not getting through)');
    const [px, py] = await js('__tt[__tt.length-1]');
    offX = sx - px * dpr; offY = sy - py * dpr;
    console.log(`geometry: screen ${screenW}x${screenH}, devicePixelRatio ${dpr}, page offset ${offX.toFixed(1)},${offY.toFixed(1)}`);
    check('touch reaches the page where it was aimed', Math.abs(offX) < screenW && Math.abs(offY) < screenH);
  }
  check('the app has the Play billing bridge', await js('!!window.AndroidBilling'));
  check('Harbour Market and City Square are marked as the full game', await js(`document.querySelectorAll('.loc.locked').length===2`));

  // 2. A locked market opens the unlock sheet. No Play Store here, so it must say so.
  await tap('.loc:nth-child(2)', 'Harbour Market');
  check('Harbour Market is chosen', await waitFor(`document.querySelector('.loc:nth-child(2)').classList.contains('sel')`));
  await tap('#btn-start', 'Open the stall at the Harbour');
  check('the unlock sheet opens instead of a season', await waitFor(`${shown('modal-unlock')}&&!${K}.run`));
  check('without a Play Store the sheet says so', await waitFor(`/Google Play/.test(document.getElementById('u-note').textContent)`, 8000), await js(`document.getElementById('u-note').textContent`));
  shot('unlock');
  if (await js(`!document.getElementById('u-buy').disabled`)) {
    await tap('#u-buy', 'Unlock the full game');
    check('the unlock button answers and is not left waiting', await waitFor(`!${K}.billing.state.busy`, 10000));
  }
  if (await js(`!document.getElementById('u-restore').disabled`)) {
    await tap('#u-restore', 'Restore purchase');
    check('Restore answers and is not left waiting', await waitFor(`!${K}.billing.state.busy`, 10000));
  }
  check('nothing unlocked without Play', await js(`!${K}.billing.state.owned`));
  await tap('#u-later', 'Not now');
  check('Not now closes the sheet', await waitFor(hidden('modal-unlock')));

  // 3. The Village Green is free.
  await tap('.loc:nth-child(1)', 'Village Green');
  await tap('#btn-start', 'Open the stall');
  check('a season opens at the Green with the starters on the stall', await waitFor(`${shown('screen-market')}&&${K}.run.loc==='green'&&document.querySelectorAll('#stall .cell:not(.empty)').length===6`));
  check('the stall says what its layout takes', await waitFor(`/about \\+\\d+ a browse/.test(document.getElementById('total').textContent)`));
  shot('stall');

  // 4. Arranging: an item to an empty space, to the boxes, and back.
  const [from, to] = await js(`(function(){var L=${K}.run.layout;return [L.findIndex(function(u){return u!=null}),L.findIndex(function(u){return u==null})]})()`);
  const uid = await js(`${K}.run.layout[${from}]`);
  await tap(`#stall .cell[data-i="${from}"]`, 'an item on the stall');
  check('the item is picked up and the arrange bar shows', await waitFor(`${shown('sel-bar')}&&!!document.querySelector('#stall .cell.sel')`));
  await tap(`#stall .cell[data-i="${to}"]`, 'an empty space');
  check('the item moves to that space', await waitFor(`${K}.run.layout[${to}]===${uid}&&${K}.run.layout[${from}]==null&&${hidden('sel-bar')}`));
  await tap(`#stall .cell[data-i="${to}"]`, 'the moved item');
  await tap('#btn-sel-box', 'To the boxes');
  check('it goes to the boxes', await waitFor(`${onStall}===5&&document.querySelectorAll('#boxes .boxed').length===1`));
  shot('boxes');
  await tap('#boxes .boxed', 'the boxed item');
  await tap(`#stall .cell[data-i="${from}"]`, 'its old space');
  check('it is back on the stall', await waitFor(`${onStall}===6&&${K}.run.layout[${from}]===${uid}`));

  // 5. A browse and the wholesaler.
  await js(`${K}.profile.settings.motion=true;1`);
  const coins0 = await js(`${K}.run.coins`);
  await tap('#btn-browse', 'Open up');
  check('the customers pay and the wholesaler offers stock with prices', await waitFor(`${shown('modal-offer')}&&${K}.run.coins>${coins0}&&document.querySelectorAll('.offer .cost').length>0`, 5000));
  shot('offer');
  const pick = await js(`[].findIndex.call(document.querySelectorAll('.offer'),function(b){return !b.disabled})`);
  if (pick >= 0) {
    const [n, c, cost] = await js(`[${K}.run.stock.length,${K}.run.coins,${K}.E.buyPrice(${K}.run,${K}.run.offers[${pick}])]`);
    await tap(`.offer:nth-child(${pick + 1})`, 'an offer the tin can cover');
    check('it is bought for its price and laid out', await waitFor(`${hidden('modal-offer')}&&${K}.run.stock.length===${n + 1}&&${K}.run.coins===${c - cost}&&${onStall}===${Math.min(15, n + 1)}`));
  } else {
    check('every offer is too dear and says so', await js(`/short/.test(document.querySelector('.offer .cost').textContent)`));
    await tap('#btn-offer-skip', 'Nothing today');
  }
  for (let i = 0; i < 4; i++) {
    await tap('#btn-browse', `Open up again (${i + 2})`);
    if (!(await waitFor(shown('modal-offer'), 5000))) { check('the wholesaler comes after each browse', false); break; }
    await tap('#btn-offer-skip', 'Nothing today');
    await waitFor(hidden('modal-offer'));
  }
  check('after the day\'s browses the dusk ledger opens', await waitFor(shown('modal-dusk'), 5000));
  shot('dusk');

  // 6. Sell at dusk, pay the fee.
  const n0 = await js(`${K}.run.stock.length`);
  await tap('#dusk-sell .item', 'an item to sell');
  check('its sheet offers the sale', await waitFor(`${shown('modal-info')}&&!document.getElementById('btn-info-sell').hidden`));
  await tap('#btn-info-sell', 'Sell');
  check('it is sold', await waitFor(`${K}.run.stock.length===${n0 - 1}&&${hidden('modal-info')}`));
  await tap('#btn-pay', 'Pay the fee and go home');
  check('week two starts with the layout kept', await waitFor(`${K}.run.week===2&&${hidden('modal-dusk')}&&document.querySelectorAll('#stall .cell:not(.empty)').length===${Math.min(15, n0 - 1)}`));

  // 7. The tabs and a setting.
  for (const t of ['stock', 'charms', 'journal', 'more', 'stall']) {
    await tap(`.tab[data-tab="${t}"]`, `${t} tab`);
    check(`the ${t} tab opens`, await waitFor(tabOpen(t)));
  }
  await tap('.tab[data-tab="more"]', 'more tab');
  check('More offers the full game', await waitFor(`/Harbour Market/.test(document.getElementById('unlock-card').textContent)`));
  check('Large text turns on', await tapToggle('#opt-large', 'Large text', `document.documentElement.classList.contains('large')`));
  check('Large text turns off', await tapToggle('#opt-large', 'Large text again', `!document.documentElement.classList.contains('large')`));
  await tap('.tab[data-tab="stall"]', 'stall tab');

  // 8. Back leaves without a crash, and the season and its layout are there on relaunch.
  const kept = await js(`(function(){var r=${K}.run;${K}.save();return {week:r.week,coins:r.coins,layout:r.layout.join(',')}})()`);
  adb('shell', 'input', 'keyevent', '4');
  await sleep(1500);
  const log1 = adb('logcat', '-d');
  check('Back leaves without a crash', !new RegExp(`FATAL EXCEPTION[\\s\\S]{0,200}Process: ${PKG.replace(/\./g, '\\.')}`).test(log1));
  try { ws.close(); } catch (e) { /* reconnecting */ } ws = null;
  adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1');
  await connect();
  await sleep(1000);
  check('the week, the tin and the layout are kept on relaunch', await waitFor(`(function(){var r=${K}.run;return !!r&&r.week===${kept.week}&&r.coins===${kept.coins}&&r.layout.join(',')===${JSON.stringify(kept.layout)}&&!document.getElementById('screen-market').hidden})()`));
  shot('relaunch');

  // 9. Buy the shop at the Green (the tin topped up through the page), then the Free Market asks for the unlock.
  await js(`(function(){var k=${K};k.run.coins=5000;k.run.phase='dusk';k.run.spin=k.run.spinsToday;k.pay()})();1`);
  check('buying the shop ends the season', await waitFor(`${shown('modal-end')}&&/yours/.test(document.getElementById('end-title').textContent)`));
  await tap('#btn-end-free', 'Keep trading: Free Market');
  check('the Free Market opens the unlock sheet', await waitFor(`${shown('modal-unlock')}&&document.getElementById('u-sub').textContent==='The Free Market'&&!${K}.run.endless`));
  await tap('#u-later', 'Not now');
  await tap('#btn-end-ok', 'Back to the market gate');
  check('back at the market gate', await waitFor(shown('screen-title')));
  shot('gate');

  const log = adb('logcat', '-d');
  check('no crash', !new RegExp(`FATAL EXCEPTION[\\s\\S]{0,200}Process: ${PKG.replace(/\./g, '\\.')}`).test(log));
  check(`no "app not responding"`, !log.includes(`ANR in ${PKG}`));
  check('no errors in the page', pageErrors.length === 0, pageErrors.join(' | '));
  check('the app is still running', alive());
  finish(false);
})().catch(e => { console.log('FAIL tap-through stopped: ' + (e && e.stack || e)); finish(true); });
