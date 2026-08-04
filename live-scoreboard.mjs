import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
const failures = [];
await page.goto('https://kebabom.awislabs.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);

const gameover = () => page.evaluate(() => !document.getElementById('gameover').hidden);
const paused = () => page.evaluate(() => !document.getElementById('pause').hidden);

let threw = 0;
let dets = 0;
for (let i = 0; i < 110 && !(await gameover()); i++) {
  if (await paused()) {
    await page.click('#resume');
    await page.waitForTimeout(400);
    continue;
  }
  const t = await page.evaluate(() => window.__kebaboom.player());
  if (t.hp < 40) {
    const away = await page.evaluate(() => {
      const h = window.__kebaboom;
      const p = h.player();
      let best = null, bd = Infinity;
      for (const e of h.enemies()) { const d = (e.x - p.x) ** 2 + (e.z - p.z) ** 2; if (d < bd) { bd = d; best = e; } }
      if (!best) return 'W';
      const dx = p.x - best.x, dz = p.z - best.z;
      if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? 'D' : 'A';
      return dz > 0 ? 'S' : 'W';
    });
    await page.keyboard.down('ShiftLeft');
    await page.keyboard.down('Key' + away);
    await page.waitForTimeout(800);
    await page.keyboard.up('Key' + away);
    await page.keyboard.up('ShiftLeft');
    continue;
  }
  if (t.bombs > 0) {
    await page.evaluate(() => {
      const h = window.__kebaboom;
      const p = h.player();
      const es = h.enemies();
      if (es.length) {
        let best = null, bd = Infinity;
        for (const e of es) { const d = (e.x - p.x) ** 2 + (e.z - p.z) ** 2; if (d < bd) { bd = d; best = e; } }
        h.aimAt(best.x, best.z);
      } else {
        h.aimAt(p.x, p.z);
      }
    });
    await page.evaluate(() => window.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 400, clientY: 300 })));
    await page.evaluate(() => window.dispatchEvent(new MouseEvent('mouseup', { button: 0, clientX: 400, clientY: 300 })));
    threw++;
  }
  dets += await page.evaluate(() => window.__kebaboom.detonateNearEnemy());
  await page.waitForTimeout(700);
}

if (!(await gameover())) {
  failures.push('game did not end within test window');
  console.log(`bombs thrown: ${threw}, detonations: ${dets}`);
} else {
  const final = await page.evaluate(() => ({
    score: parseInt(document.getElementById('final-score').textContent, 10),
    wave: parseInt(document.getElementById('final-wave').textContent, 10),
    formHidden: document.getElementById('score-form').hidden,
    boardsHidden: document.getElementById('boards').hidden,
  }));
  console.log(JSON.stringify({ threw, dets, final }, null, 2));
  if (!(final.score > 0)) failures.push('final score is 0 — no kills in bot run');
  else {
    if (final.formHidden) failures.push('score form not shown for qualifying score');
    if (final.boardsHidden) failures.push('boards not shown');
    await page.click('#initials');
    await page.type('#initials', 'xz9');
    const value = await page.inputValue('#initials');
    if (value !== 'XZ9') failures.push(`initials not sanitized to XZ9 (got "${value}")`);
    await page.click('#submit-score');
    await page.waitForTimeout(1500);
    const me = await page.evaluate(() => ({
      today: [...document.querySelectorAll('#today-board li.me')].map((li) => li.textContent),
      all: [...document.querySelectorAll('#all-board li.me')].map((li) => li.textContent),
    }));
    console.log(JSON.stringify(me, null, 2));
    if (!me.today.length) failures.push('no highlighted entry on today board');
    if (!me.all.length) failures.push('no highlighted entry on all board');
    for (const li of [...me.today, ...me.all]) {
      if (!li.includes('XZ9')) failures.push(`highlighted entry missing XZ9: "${li}"`);
    }
  }
}

await browser.close();
console.log(failures.length ? 'FAILURES:\n' + failures.join('\n') : 'LIVE SCOREBOARD E2E PASSED');
process.exit(failures.length ? 1 : 0);
