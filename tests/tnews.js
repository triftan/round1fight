// Title-screen BREAKING ticker: it exists, carries NEWS[0], never blocks taps, fits phones, and goes static under reduced motion.
// Run: NODE_PATH=<global node_modules> node tests/tnews.js   (R1F_URL overrides the page URL, SHOTS a screenshot folder)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const URL = process.env.R1F_URL || 'file://' + path.resolve(__dirname, '../index.html');
const SHOTS = process.env.SHOTS || path.join(require('os').tmpdir(), 'r1f_news_shots');
fs.mkdirSync(SHOTS, { recursive: true });
const results = [], errs = [];
const ok = (name, cond, info) => results.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
(async () => {
  const b = await chromium.launch();
  try {
    for (const [vp, reduce] of [[{ width: 1280, height: 720 }, 'no-preference'], [{ width: 390, height: 844 }, 'no-preference'], [{ width: 844, height: 390 }, 'no-preference'], [{ width: 390, height: 844 }, 'reduce']]) {
      const tag = `${vp.width}x${vp.height}${reduce === 'reduce' ? ' reduced-motion' : ''}`;
      const ctx = await b.newContext({ viewport: vp, reducedMotion: reduce }); const p = await ctx.newPage();
      p.on('pageerror', e => errs.push(e.message)); await p.goto(URL); await p.waitForTimeout(1200);
      const r = await p.evaluate(() => {
        const n = document.getElementById('news'), t = document.getElementById('ntrack'), s = document.getElementById('screen').getBoundingClientRect(), nr = n.getBoundingClientRect();
        const btns = [...document.querySelectorAll('#title .btn, #title .rankb')].map(e => e.getBoundingClientRect());
        const NEWS0 = __R1F.NEWS ? __R1F.NEWS[0] : null;
        return { has: !!n, text: t.textContent, n0: NEWS0, anim: getComputedStyle(t).animationName, pe: getComputedStyle(n).pointerEvents, inside: nr.left >= s.left - 1 && nr.right <= s.right + 1,
          overlap: btns.some(b => b.top < nr.bottom && b.bottom > nr.top && b.left < nr.right && b.right > nr.left), count: t.querySelectorAll('i').length, h: nr.height };
      });
      ok(`ticker exists and starts with NEWS[0] ${tag}`, r.has && r.n0 && r.text.startsWith(r.n0), r);
      ok(`ticker never covers buttons, stays in the screen, passes taps through ${tag}`, !r.overlap && r.inside && r.pe === 'none', r);
      if (reduce === 'reduce') ok('reduced motion: static, newest headline only', r.anim === 'none' && r.count === 0, r); else ok('motion: scrolls through all headlines', r.anim === 'nscroll' && r.count >= 2, r);
      const tap = await p.evaluate(() => { const n = document.getElementById('news').getBoundingClientRect(); return document.elementFromPoint(n.left + n.width / 2, n.top + n.height / 2).closest('#news') === null; });
      ok(`tap-through: the element under the ticker is not the ticker ${tag}`, tap);
      await p.screenshot({ path: path.join(SHOTS, `title_ticker_${vp.width}x${vp.height}${reduce === 'reduce' ? '_static' : ''}.png`) });
      await ctx.close();
    }
  } catch (e) { errs.push('test crashed: ' + e.message.split('\n')[0]); }
  await b.close();
  for (const r of results) console.log(r);
  if (errs.length) console.log(errs.join('\n'));
  const fails = results.filter(r => r.startsWith('FAIL')).length + errs.length;
  console.log(fails ? `TNEWS ${fails} FAILED of ${results.length}` : `TNEWS OK ${results.length}`);
  process.exit(fails ? 1 : 0);
})();
