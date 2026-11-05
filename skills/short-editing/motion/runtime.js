// Frame-driven DOM adaptation of the lead-word reveal and per-word clip wipe.
// Source revisions and complete licenses: motion/SOURCES.md and motion/licenses/.
(() => {
  'use strict';
  const cfg = window.MOTION_CONFIG, p = cfg.preset, H = cfg.height * 1080 / cfg.width;
  const stage = document.getElementById('stage');
  const el = (tag, cls, value, parent) => { const node = document.createElement(tag); node.className = cls; if (value != null) node.textContent = value; if (parent) parent.appendChild(node); return node; };
  const canvas = el('div', cfg.transparent ? 'transparent' : '', null, stage); canvas.id = 'canvas';
  Object.entries({ bg: p.palette.background, ink: p.palette.ink, accent: p.palette.accent, muted: p.palette.muted, surface: p.palette.surface, display: `'${p.type.display}'`, body: `'${p.type.body}'`, weight: p.type.weight }).forEach(([key, value]) => canvas.style.setProperty(`--${key}`, value));
  Object.assign(stage.style, { width: cfg.width + 'px', height: cfg.height + 'px' });
  Object.assign(canvas.style, { height: H + 'px', transform: `scale(${cfg.width / 1080})` });
  if (H < 1250) canvas.classList.add('compact');
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => 1 - (1 - clamp(x)) ** 3;
  const segment = (t, start, duration) => ease((t - start) / duration);
  const scenes = [];
  function base(kind) {
    const root = el('section', `scene scene-${kind} ${cfg.direction}`, null, canvas);
    el('div', 'eyebrow', cfg.eyebrow, root); el('div', 'rule', null, root);
    el('div', 'footer', cfg.footer, root);
    const scene = { root, kind }; scenes.push(scene); return scene;
  }
  function fit(node, max, width = 856) {
    node.style.fontSize = max + 'px';
    // Measure in logical pixels: the whole composition may be exported at half size.
    const measured = node.scrollWidth;
    if (measured > width) node.style.fontSize = Math.max(24, max * width / measured) + 'px';
  }
  function title() {
    const s = base('title'), root = s.root;
    if (cfg.direction === 'studio') s.plane = el('div', 'backplane', null, root);
    const box = el('div', 'headline', null, root);
    const size = Math.min(cfg.direction === 'kinetic' ? 182 : cfg.direction === 'documentary' ? 184 : 158, H * .11);
    s.lines = cfg.title.map(line => { const n = el('span', 'headline-line', line, box); n.style.fontSize = size + 'px'; return n; });
    s.subtitle = el('div', 'subtitle', cfg.subtitle, root); s.mark = el('div', 'mark', null, root);
    s.measure = () => s.lines.forEach(node => fit(node, size, cfg.direction === 'studio' ? 800 : 856));
    s.set = t => {
      s.lines.forEach((node, i) => {
        const entry = segment(t, i * p.motion.stagger, p.motion.enter);
        // The first line is present on frame zero. It recedes as the rest assembles.
        const maxScale = Math.min(p.motion.leadScale, (cfg.direction === 'studio' ? 800 : 856) / Math.max(1, node.scrollWidth));
        const lead = i === 0 ? 1 + (maxScale - 1) * (1 - segment(t, .16, p.motion.enter * 1.5)) : 1;
        node.style.opacity = i ? String(entry) : '1';
        node.style.transform = `translateY(${i ? (1 - entry) * p.motion.travel : 0}px) scale(${lead})`;
        node.style.clipPath = i && cfg.direction === 'kinetic' ? `inset(0 ${(1 - entry) * 100}% 0 0)` : 'none';
      });
      const detail = segment(t, .45 + cfg.title.length * p.motion.stagger, p.motion.enter);
      s.subtitle.style.opacity = String(detail); s.subtitle.style.transform = `translateY(${(1 - detail) * 18}px)`;
      s.mark.style.transform = `scaleX(${segment(t, .25, p.motion.enter * 1.4)})`;
      if (s.plane) s.plane.style.transform = `perspective(1800px) rotateX(${(1 - segment(t, 0, 1.1)) * 8}deg) translateY(${(1 - segment(t, 0, 1.1)) * 36}px)`;
    }; return s;
  }
  function relay() {
    const s = base('relay'); s.words = cfg.phrases.map(phrase => el('div', 'relay-word', phrase, s.root));
    const track = el('div', 'relay-track', null, s.root); s.ticks = cfg.phrases.map(() => el('div', 'relay-tick', null, track));
    s.measure = () => s.words.forEach(node => fit(node, Math.min(178, H * .13)));
    s.set = (t, duration) => {
      const span = duration / cfg.phrases.length, index = Math.min(cfg.phrases.length - 1, Math.floor(Math.max(0, t) / span));
      s.words.forEach((node, i) => {
        const enter = segment(t, i * span, Math.min(p.motion.enter, span * .55));
        node.style.visibility = i === index ? 'visible' : 'hidden';
        node.style.opacity = i === 0 ? '1' : String(enter);
        node.style.transform = `translateY(${i ? (1 - enter) * p.motion.travel : 0}px)`;
        // Clip wipe adapted from HyperFrames: deterministic seeking replaces GSAP.
        node.style.clipPath = i ? `inset(0 ${(1 - enter) * 100}% 0 0)` : 'none';
        node.style.color = i === cfg.phrases.length - 1 ? p.palette.accent : p.palette.ink;
        s.ticks[i].classList.toggle('active', i <= index);
      });
    }; return s;
  }
  const svgEl = (tag, attrs, parent) => { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.entries(attrs).forEach(([key, value]) => n.setAttribute(key, value)); if (parent) parent.appendChild(n); return n; };
  function proof() {
    const s = base('proof'); s.heading = el('div', 'proof-title', cfg.metric, s.root);
    s.counter = el('div', 'metric', '', s.root); s.counter.style.fontSize = Math.min(210, H * .14) + 'px';
    const graph = svgEl('svg', { class: 'chart', viewBox: '0 0 928 320', 'aria-label': cfg.metric }, s.root);
    const max = Math.max(...cfg.values) * 1.12, points = cfg.values.map((v, i) => [i * 928 / (cfg.values.length - 1), 296 - v / max * 266]);
    [30, 163, 296].forEach(y => svgEl('line', { x1: 0, x2: 928, y1: y, y2: y, stroke: p.palette.ink, opacity: .14 }, graph));
    const d = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
    s.area = svgEl('path', { d: d + ' L928,296 L0,296 Z', fill: p.palette.accent, opacity: .07 }, graph);
    s.path = svgEl('path', { d, fill: 'none', stroke: p.palette.accent, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1 }, graph);
    s.dot = svgEl('circle', { r: 10, fill: p.palette.accent }, graph);
    el('div', 'source', cfg.source, s.root);
    const axis = svgEl('g', { fill: p.palette.muted, 'font-size': 38, 'font-family': p.type.body }, graph);
    for (const [i, label] of cfg.labels.entries()) { const n = svgEl('text', { x: i ? 928 : 0, y: 336, 'text-anchor': i ? 'end' : 'start' }, axis); n.textContent = label; }
    s.measure = () => fit(s.heading, Math.min(82, H * .057));
    s.set = t => {
      const draw = segment(t, .08, 1.55), f = draw * (points.length - 1), i = Math.min(points.length - 2, Math.floor(f)), local = f - i;
      const x = points[i][0] + (points[i + 1][0] - points[i][0]) * local, y = points[i][1] + (points[i + 1][1] - points[i][1]) * local;
      s.path.style.strokeDasharray = '1'; s.path.style.strokeDashoffset = String(1 - draw);
      s.area.style.opacity = String(.07 * draw); s.dot.setAttribute('cx', x); s.dot.setAttribute('cy', y);
      const value = cfg.values[i] + (cfg.values[i + 1] - cfg.values[i]) * local;
      s.counter.textContent = Math.round(value).toLocaleString('fr-FR') + cfg.unit;
      fit(s.counter, Math.min(210, H * .14));
    }; return s;
  }
  function compare() {
    const s = base('compare'), row = el('div', 'comparison', null, s.root);
    s.sides = [cfg.before, cfg.after].map((value, i) => {
      const side = el('div', 'compare-side' + (i ? ' after' : ''), null, row);
      el('div', 'compare-label', i ? 'APRÈS' : 'AVANT', side); el('div', 'compare-copy', value, side); return side;
    });
    s.measure = () => {};
    s.set = t => s.sides.forEach((node, i) => { const e = i ? segment(t, .45, p.motion.enter) : 1; node.style.opacity = String(e); node.style.transform = `translateY(${(1 - e) * p.motion.travel}px)`; });
    return s;
  }
  const builds = { 'title-reveal': title, 'word-relay': relay, 'proof-chart': proof, compare };
  const active = cfg.component === 'showcase' ? [title(), relay(), proof()] : [builds[cfg.component]()];
  window.setT = value => {
    const t = Math.max(0, Math.min(cfg.duration - .000001, Number.isFinite(value) ? value : 0));
    const duration = cfg.duration / active.length, index = Math.min(active.length - 1, Math.floor(t / duration));
    // Opacity hides the entire subtree. Child visibility is used by the phrase
    // relay and must never make a word from an inactive scene appear on top.
    active.forEach((scene, i) => { scene.root.style.opacity = i === index ? '1' : '0'; scene.root.setAttribute('aria-hidden', String(i !== index)); scene.set(Math.max(0, t - i * duration), duration); });
  };
  window.MOTION_READY = document.fonts.ready.then(() => { scenes.forEach(scene => scene.measure()); window.setT(0); window.READY = true; });
  window.setT(0);
})();
