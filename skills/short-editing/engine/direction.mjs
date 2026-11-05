import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import os from 'node:os';

const ENGINE = path.dirname(fileURLToPath(import.meta.url));
const MOTION = path.resolve(ENGINE, '../motion');
export const DIRECTIONS = JSON.parse(fs.readFileSync(path.join(MOTION, 'directions.json'), 'utf8'));
export const COMPONENTS = ['title-reveal', 'word-relay', 'proof-chart', 'compare', 'showcase'];
const FONTS = { Inter: 'Inter.ttf', 'DM Sans': 'DMSans.ttf', 'Instrument Serif': 'InstrumentSerif-Regular.ttf', 'Archivo Black': 'ArchivoBlack.ttf', 'Bricolage Grotesque': 'BricolageGrotesque.ttf' };
const clone = value => JSON.parse(JSON.stringify(value));
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
export function merge(base, patch) {
  const result = clone(base);
  for (const [key, value] of Object.entries(patch)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('unsupported configuration key');
    result[key] = plain(value) && plain(result[key]) ? merge(result[key], value) : clone(value);
  }
  return result;
}
export function directionPreset(name) {
  if (!Object.hasOwn(DIRECTIONS, name)) throw new Error(`unknown direction "${name}"; choose ${Object.keys(DIRECTIONS).join(', ')}`);
  return clone(DIRECTIONS[name]);
}
const number = (value, name, min, max) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${name} must be a number from ${min} to ${max}`);
  return value;
};
const text = (value, name, max = 100) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${name} must contain 1 to ${max} characters`);
  return value;
};
export function motionConfig(component, input = {}, direction = 'documentary', projectStyle = null) {
  if (!COMPONENTS.includes(component)) throw new Error(`unknown component "${component}"; choose ${COMPONENTS.join(', ')}`);
  if (!plain(input)) throw new Error('motion config must be a JSON object');
  const preset = directionPreset(direction);
  if (projectStyle) {
    for (const [key, source] of [['background', 'paper'], ['ink', 'ink'], ['accent', 'accent'], ['surface', 'sheet'], ['muted', 'ink2']]) {
      if (projectStyle.colors?.[source]) preset.palette[key] = projectStyle.colors[source];
    }
    if (projectStyle.display?.font) preset.type.display = projectStyle.display.font;
    if (projectStyle.display?.weight) preset.type.weight = projectStyle.display.weight;
    if (projectStyle.font?.family) preset.type.body = projectStyle.font.family;
  }
  const cfg = merge({ component, direction, preset, duration: component === 'showcase' ? 9 : 3.6, width: 1080, height: 1920,
    eyebrow: 'LE FOND / LA FORME', title: ['Fais passer', "l’idée."], subtitle: 'Un message. Une intention. Un mouvement.',
    phrases: ['Une idée.', 'Un rythme.', 'Une preuve.'], labels: ['DÉPART', 'ARRIVÉE'],
    values: [12, 24, 20, 46, 70], unit: '%', source: 'Données d’exemple', metric: 'Une progression visible',
    before: 'Tout montrer.', after: 'Guider le regard.', footer: 'LE MESSAGE DONNE LE RYTHME', transparent: false }, input);
  // A component config supplies content, never executable code or a replacement runtime.
  cfg.component = component; cfg.direction = direction; cfg.preset = preset;
  number(cfg.duration, 'duration', 1.5, 60);
  for (const key of ['width', 'height']) { number(cfg[key], key, 320, 3840); if (cfg[key] % 2) throw new Error(`${key} must be even`); }
  for (const key of ['eyebrow', 'subtitle', 'source', 'metric', 'before', 'after', 'footer']) text(cfg[key], key, 140);
  text(cfg.unit, 'unit', 16);
  for (const key of ['title', 'phrases', 'labels']) {
    const max = key === 'title' ? 3 : key === 'labels' ? 2 : 6;
    if (!Array.isArray(cfg[key]) || cfg[key].length < (key === 'labels' ? 2 : 1) || cfg[key].length > max) throw new Error(`${key} needs ${key === 'labels' ? '2' : `1 to ${max}`} entries`);
    cfg[key].forEach(value => text(value, key, 70));
  }
  if (!Array.isArray(cfg.values) || cfg.values.length < 2 || cfg.values.length > 12) throw new Error('values needs 2 to 12 entries');
  cfg.values.forEach(value => number(value, 'value', 0, 1000000000));
  if (Math.max(...cfg.values) === 0) throw new Error('values must include a positive value');
  if (typeof cfg.transparent !== 'boolean') throw new Error('transparent must be true or false');
  for (const color of Object.values(preset.palette)) if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('direction colors must be six-digit hex values');
  for (const family of [preset.type.display, preset.type.body]) if (!/^[\p{L}\p{N} ._-]{1,80}$/u.test(family)) throw new Error('font family contains unsupported characters');
  return cfg;
}
export function motionEvents(cfg) {
  const titleDuration = cfg.component === 'showcase' ? cfg.duration / 3 : cfg.duration;
  const events = ['title-reveal', 'showcase'].includes(cfg.component) ? cfg.title.map((line, i) => ({ at: +(i * cfg.preset.motion.stagger).toFixed(3), kind: 'title', label: line, sound: i ? 'none' : 'optional soft impact' })) : [];
  if (cfg.component === 'word-relay' || cfg.component === 'showcase') {
    const start = cfg.component === 'showcase' ? titleDuration : 0;
    events.push(...cfg.phrases.map((label, i) => ({ at: +(start + i * titleDuration / cfg.phrases.length).toFixed(3), kind: 'phrase', label, sound: 'none' })));
  }
  if (cfg.component === 'proof-chart' || cfg.component === 'showcase') events.push({ at: +(cfg.component === 'showcase' ? 2 * titleDuration : 0).toFixed(3), kind: 'proof', label: cfg.metric, sound: 'none' });
  if (cfg.component === 'compare') events.push({ at: 0, kind: 'compare', label: cfg.before, sound: 'none' }, { at: .45, kind: 'compare', label: cfg.after, sound: 'none' });
  return events.filter(event => event.at < cfg.duration).sort((a, b) => a.at - b.at);
}
function parseArgs(args) {
  const values = {}, positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) { positional.push(arg); continue; }
    const name = arg.slice(2);
    if (['list', 'keep-brand', 'replace'].includes(name)) values[name] = true;
    else if (['brief', 'direction', 'config', 'out'].includes(name) && args[i + 1] && !args[i + 1].startsWith('--')) values[name] = args[++i];
    else throw new Error(`unknown option or missing value: ${arg}`);
  }
  return { values, positional };
}
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function safeOutput(project, relative) {
  const out = path.resolve(project, relative), source = path.resolve(project, 'source') + path.sep;
  if (!out.startsWith(source) || path.extname(out) !== '.html') throw new Error('--out must be an HTML file inside the project source directory');
  return out;
}
export function direct(project, args) {
  const { values, positional } = parseArgs(args);
  if (values.list) { console.log(Object.entries(DIRECTIONS).map(([name, p]) => `${name}: ${p.intent}`).join('\n')); return; }
  const name = positional[0];
  if (!name) throw new Error('usage: direct <project> <paper|documentary|kinetic|studio> [--keep-brand] [--brief "..."]');
  const preset = directionPreset(name), styleFile = path.join(project, 'source/style.json');
  if (!fs.existsSync(path.join(project, 'source/spec.js'))) throw new Error('initialize the project before choosing a direction');
  const current = fs.existsSync(styleFile) ? read(styleFile) : {};
  const patch = clone(preset.style);
  if (values['keep-brand']) {
    delete patch.colors; delete patch.font; delete patch.display;
    for (const key of ['font', 'color', 'hi', 'bg']) delete patch.captions[key];
  }
  const base = clone(current);
  // Presets replace their visual vocabulary, so switching away from Kinetic does
  // not leave its dark caption band or sheet colors in a light direction.
  for (const key of ['colors', 'font', 'paper', 'display']) if (patch[key]) delete base[key];
  if (base.captions) for (const key of ['style', 'font', 'size', 'weight', 'bg', 'color', 'hi', 'shadow', 'pill', 'dimWeight']) {
    if (!(values['keep-brand'] && ['font', 'color', 'hi', 'bg'].includes(key))) delete base.captions[key];
  }
  const updated = merge(base, patch);
  const brief = values.brief ? text(values.brief, 'brief', 2000) : preset.intent;
  const archive = path.join(project, 'files/direction-history'); fs.mkdirSync(archive, { recursive: true });
  const previous = path.join(archive, `${Date.now()}-${randomUUID()}.json`);
  fs.writeFileSync(previous, JSON.stringify({ style: current, direction: fs.existsSync(path.join(project, 'source/direction.json')) ? read(path.join(project, 'source/direction.json')) : null }, null, 2) + '\n', { flag: 'wx' });
  fs.writeFileSync(styleFile, JSON.stringify(updated, null, 2) + '\n');
  fs.writeFileSync(path.join(project, 'source/direction.json'), JSON.stringify({ version: 1, name, brief, preset }, null, 2) + '\n');
  console.log(`[short] direction ${name}: ${brief}\nPrevious style: ${previous}\nSpec overrides still win. Rebuild captured components after a direction change.`);
}
export function makeMotion(project, args) {
  const { values, positional } = parseArgs(args);
  if (values.list) { console.log(COMPONENTS.join('\n')); return; }
  const component = positional[0];
  const styleFile = path.join(project, 'source/style.json'), directionFile = path.join(project, 'source/direction.json');
  const direction = values.direction || (fs.existsSync(directionFile) ? read(directionFile).name : 'documentary');
  const input = values.config ? read(path.resolve(project, values.config)) : {};
  const projectStyle = values.direction ? null : fs.existsSync(styleFile) ? read(styleFile) : null;
  const cfg = motionConfig(component, input, direction, projectStyle);
  const out = safeOutput(project, values.out || `source/${component}.html`), sidecar = out.replace(/\.html$/, '.motion.json');
  if (!values.replace && (fs.existsSync(out) || fs.existsSync(sidecar))) throw new Error(`${out} exists; use a new --out or --replace after reviewing changes`);
  const fontDir = path.join(project, 'assets/motion-fonts'); fs.mkdirSync(fontDir, { recursive: true });
  const fontCSS = [...new Set([cfg.preset.type.display, cfg.preset.type.body])].map(family => {
    let filename = FONTS[family], source = filename && path.join(ENGINE, 'fonts', filename);
    if (projectStyle?.font?.family === family && projectStyle.font.src) {
      const src = projectStyle.font.src;
      if (/^https?:/i.test(src)) throw new Error('copy the brand font into the project before building an offline component');
      source = path.resolve(project, src.replace(/^~(?=[/\\])/, os.homedir()));
      filename = 'brand' + path.extname(source).toLowerCase();
      if (!['.ttf', '.otf', '.woff', '.woff2'].includes(path.extname(source).toLowerCase())) throw new Error('brand font must be TTF, OTF, WOFF or WOFF2');
    }
    if (!source || !fs.existsSync(source)) throw new Error(`no local font file for "${family}"; set font.src or use a bundled family`);
    fs.copyFileSync(source, path.join(fontDir, filename));
    const url = path.relative(path.dirname(out), path.join(fontDir, filename)).split(path.sep).map(encodeURIComponent).join('/');
    return `@font-face{font-family:'${family}';src:url('${url}');font-weight:100 1000}`;
  }).join('\n');
  const json = JSON.stringify(cfg).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const css = fs.readFileSync(path.join(MOTION, 'motion.css'), 'utf8'), js = fs.readFileSync(path.join(MOTION, 'runtime.js'), 'utf8');
  const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=${cfg.width}"><link rel="icon" href="data:,"><title>Motion preview</title><style>${fontCSS}\n${css}</style></head><body><main id="stage" aria-label="Motion composition"></main><script>window.MOTION_CONFIG=${json};</script><script>${js}</script></body></html>\n`;
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, html);
  const events = motionEvents(cfg); fs.writeFileSync(sidecar, JSON.stringify({ version: 1, duration: cfg.duration, width: cfg.width, height: cfg.height, direction, events, config: cfg }, null, 2) + '\n');
  console.log(`[short] ${component} / ${direction}: ${out}\n${cfg.duration}s, ${cfg.width}x${cfg.height}; events: ${sidecar}\nCapture with --dur ${cfg.duration} --size ${cfg.width}x${cfg.height}${cfg.transparent ? ' --alpha' : ''}`);
  return { out, sidecar, config: cfg, events };
}
