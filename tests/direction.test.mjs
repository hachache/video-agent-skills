import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { DIRECTIONS, COMPONENTS, motionConfig, motionEvents, makeMotion, direct } from '../skills/short-editing/engine/direction.mjs';

const temporary = t => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'motion-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir; };
const fixture = t => { const dir = temporary(t); fs.mkdirSync(path.join(dir, 'source')); fs.writeFileSync(path.join(dir, 'source/spec.js'), 'window.SPEC = {};'); return dir; };
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));

test('direction switches replace visual settings and preserve project identity', t => {
  t.mock.method(console, 'log', () => {});
  const project = fixture(t), file = path.join(project, 'source/style.json');
  const original = { creator: { name: 'Creator', lang: 'fr' }, colors: { paper: '#FFFFFF', ink: '#121212', accent: '#F00000' }, font: { family: 'Inter', src: 'assets/brand.ttf' }, captions: { emph: ['proof'], style: 'sticker' }, camera: { eyes: [200, 250] } };
  fs.writeFileSync(file, JSON.stringify(original));
  direct(project, ['kinetic']); direct(project, ['documentary']);
  const style = read(file), archives = fs.readdirSync(path.join(project, 'files/direction-history')).map(name => read(path.join(project, 'files/direction-history', name)));
  assert.deepEqual(style.creator, original.creator); assert.deepEqual(style.camera, original.camera);
  assert.deepEqual(style.colors, DIRECTIONS.documentary.style.colors);
  assert.equal(style.captions.bg, undefined); assert.equal(style.font.src, undefined);
  assert.deepEqual(style.captions.emph, ['proof']); assert.equal(archives.length, 2);
  assert.ok(archives.some(archive => JSON.stringify(archive.style) === JSON.stringify(original)));
  assert.equal(read(path.join(project, 'source/direction.json')).name, 'documentary');
});

test('keep-brand preserves creator colors and fonts, including custom font files', t => {
  t.mock.method(console, 'log', () => {});
  const project = fixture(t), file = path.join(project, 'source/style.json');
  const brand = { colors: { paper: '#FFEEDD', ink: '#201020', accent: '#A01860' }, font: { family: 'Custom', src: 'assets/brand.woff2' }, display: { font: 'Custom Display' } };
  fs.writeFileSync(file, JSON.stringify(brand)); direct(project, ['studio', '--keep-brand']);
  const result = read(file); for (const key of ['colors', 'font', 'display']) assert.deepEqual(result[key], brand[key]);
});

test('invalid directions, options and output paths do not replace existing files', t => {
  t.mock.method(console, 'log', () => {});
  const project = fixture(t), file = path.join(project, 'source/spec.js'), before = fs.readFileSync(file);
  assert.throws(() => direct(project, ['missing']), /unknown direction/);
  assert.throws(() => direct(project, ['kinetic', '--brief']), /missing value/);
  assert.throws(() => makeMotion(project, ['title-reveal', '--out', '../outside.html']), /inside the project/);
  const result = makeMotion(project, ['title-reveal']);
  assert.throws(() => makeMotion(project, ['title-reveal']), /exists/);
  assert.ok(fs.existsSync(result.sidecar)); assert.deepEqual(fs.readFileSync(file), before);
});

test('content validation rejects non-finite charts and invalid frame sizes', () => {
  for (const input of [{ values: [0, 0] }, { values: [2, NaN] }, { values: [2, -1] }, { title: [] }, { title: [42] }, { duration: Infinity }, { width: 541 }, { labels: ['Only one'] }, { transparent: 'yes' }]) assert.throws(() => motionConfig('proof-chart', input));
  for (const name of Object.keys(DIRECTIONS)) for (const component of COMPONENTS) {
    const cfg = motionConfig(component, {}, name), events = motionEvents(cfg);
    assert.ok(events.every((e, i) => Number.isFinite(e.at) && e.at >= 0 && e.at < cfg.duration && (!i || e.at >= events[i - 1].at)));
    assert.ok(events.every(e => component === 'showcase' || e.kind === ({ 'title-reveal': 'title', 'word-relay': 'phrase', 'proof-chart': 'proof', compare: 'compare' })[component]));
  }
});

test('local brand fonts are copied into portable motion pages', t => {
  t.mock.method(console, 'log', () => {});
  const project = fixture(t), source = path.resolve('skills/short-editing/engine/fonts/Inter.ttf');
  fs.mkdirSync(path.join(project, 'assets')); fs.copyFileSync(source, path.join(project, 'assets/brand.ttf'));
  fs.writeFileSync(path.join(project, 'source/style.json'), JSON.stringify({ font: { family: 'Brand Test', src: 'assets/brand.ttf' }, display: { font: 'Brand Test' } }));
  const result = makeMotion(project, ['title-reveal']);
  assert.equal(result.config.preset.type.display, 'Brand Test');
  assert.match(fs.readFileSync(result.out, 'utf8'), /font-family:'Brand Test'/);
  assert.deepEqual(fs.readFileSync(path.join(project, 'assets/motion-fonts/brand.ttf')), fs.readFileSync(source));
});

test('motion pages are offline, seekable and safe with HTML-shaped content', async t => {
  t.mock.method(console, 'log', () => {});
  const { chromium } = await import('../skills/short-editing/engine/node_modules/playwright-core/index.mjs');
  const { CHROME, FFMPEG } = await import('../skills/short-editing/engine/platform.mjs');
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--disable-extensions', '--allow-file-access-from-files'] });
  t.after(() => browser.close());
  const project = fixture(t), configFile = path.join(project, 'source/content.json');
  const literal = '</script><img src=x onerror="window.injected=1">';
  fs.writeFileSync(configFile, JSON.stringify({ title: [literal], width: 540, height: 960 }));
  const result = makeMotion(project, ['title-reveal', '--config', 'source/content.json', '--out', 'source/safe.html']);
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } }), errors = [], remote = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) remote.push(request.url()); });
  await page.goto(pathToFileURL(result.out).href); await page.evaluate(() => window.MOTION_READY);
  assert.equal(await page.locator('.headline-line').textContent(), literal); assert.equal(await page.evaluate(() => window.injected), undefined);
  await page.evaluate(() => window.setT(1.2)); const first = await page.screenshot();
  await page.evaluate(() => window.setT(2.8)); await page.evaluate(() => window.setT(0)); await page.evaluate(() => window.setT(1.2));
  const second = await page.screenshot();
  const pixels = png => execFileSync(FFMPEG, ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: png, maxBuffer: 8 * 1024 * 1024 });
  const a = pixels(first), b = pixels(second); assert.equal(a.length, b.length);
  let max = 0, changed = 0;
  for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); max = Math.max(max, d); changed += d > 0; }
  // Chromium may round fractional text antialiasing by one or two channel levels.
  assert.ok(max <= 2 && changed / a.length < .01, `seek raster differs: max=${max}, changed=${changed / a.length}`);
  assert.deepEqual(errors, []); assert.deepEqual(remote, []);
});

test('every component renders in every direction and common aspect ratios', async t => {
  t.mock.method(console, 'log', () => {});
  const { chromium } = await import('../skills/short-editing/engine/node_modules/playwright-core/index.mjs');
  const { CHROME } = await import('../skills/short-editing/engine/platform.mjs');
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--disable-extensions', '--allow-file-access-from-files'] });
  t.after(() => browser.close());
  const project = fixture(t), errors = [];
  const page = await browser.newPage(); page.on('pageerror', error => errors.push(error.message));
  for (const [width, height] of [[540, 960], [960, 540], [720, 720]]) for (const direction of Object.keys(DIRECTIONS)) for (const component of COMPONENTS) {
    const name = `${direction}-${component}-${width}`, contentFile = path.join(project, 'source/content.json');
    fs.writeFileSync(contentFile, JSON.stringify({ width, height }));
    const result = makeMotion(project, [component, '--direction', direction, '--config', 'source/content.json', '--out', `source/${name}.html`]);
    await page.setViewportSize({ width, height }); await page.goto(pathToFileURL(result.out).href); await page.evaluate(() => window.MOTION_READY);
    for (const time of [0, 1.4, result.config.duration - 1 / 30]) {
      await page.evaluate(t => window.setT(t), time);
      const info = await page.evaluate(() => {
        const stage = document.getElementById('stage').getBoundingClientRect();
        return { width: stage.width, height: stage.height, active: [...document.querySelectorAll('.scene')].filter(n => n.style.opacity === '1').length,
          stylesheet: [...document.styleSheets].reduce((n, sheet) => n + sheet.cssRules.length, 0) > 50 && getComputedStyle(document.getElementById('canvas')).position === 'absolute' && getComputedStyle(document.querySelector('.eyebrow')).fontSize === '34px',
          invalid: [...document.querySelectorAll('*')].some(n => /NaN|Infinity/.test(n.getAttribute('style') || '')) };
      });
      assert.deepEqual(info, { width, height, active: 1, stylesheet: true, invalid: false }, name);
    }
  }
  assert.deepEqual(errors, []);
});
