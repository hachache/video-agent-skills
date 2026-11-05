import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mapper, mapSpec } from './lib/timeline.js';
import { FFPROBE } from './platform.mjs';

const ENGINE = path.dirname(fileURLToPath(import.meta.url));
const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const bounded = (value, duration) => Math.max(0, Math.min(duration, value));

export function reviewModel(raw, timeline) {
  const duration = Number(timeline.duration);
  if (!Number.isFinite(duration) || duration <= 0 || !Array.isArray(timeline.keeps)) {
    throw new Error('Invalid timeline. Run prepare before reviewing.');
  }
  const spec = mapSpec(raw, mapper(timeline));
  if (!Number.isFinite(timeline.speed ?? 1) || (timeline.speed ?? 1) <= 0 || timeline.keeps.some(range =>
    !Array.isArray(range) || range.length !== 3 || !range.every(Number.isFinite) || range[0] < 0 || range[1] <= range[0] || range[2] < 0)) {
    throw new Error('Invalid source ranges or playback speed in the timeline.');
  }
  const sceneList = (spec.scenes || []).map(scene => ({
    ...scene, from: bounded(Number(scene.from ?? 0), duration), to: bounded(Number(scene.to ?? duration), duration),
  })).filter(scene => Number.isFinite(scene.from) && Number.isFinite(scene.to) && scene.to > scene.from);
  const keys = (spec.layout?.keys || []).filter(key => Number.isFinite(key[0])).toSorted((a, b) => a[0] - b[0]);
  const boundaries = [...new Set([0, duration, ...sceneList.flatMap(scene => [scene.from, scene.to]),
    ...keys.map(key => bounded(key[0], duration))])].sort((a, b) => a - b);
  const words = (timeline.words || []).filter(word => Number.isFinite(word.start) && Number.isFinite(word.end));
  const height = ['wide', 'youtube', 'square'].includes(spec.format) ? 1080 : 1920;
  const scenes = boundaries.slice(0, -1).flatMap((start, index) => {
    const end = boundaries[index + 1];
    if (end - start < 0.00001) return [];
    const middle = (start + end) / 2;
    const seam = spec.layout?.seam ?? keys.filter(key => key[0] <= middle).at(-1)?.[1] ?? 1160;
    const layout = spec.silent || seam >= height ? 'paper' : seam <= 0 ? 'camera' : spec.format === 'youtube' ? 'side-by-side' : 'split';
    const active = sceneList.filter(scene => scene.from <= middle && scene.to > middle);
    return [{ id: `s${String(index + 1).padStart(2, '0')}`, start, end, layout,
      visual: active.map(scene => scene.type || 'visual').join(' + ') || layout,
      spoken: words.filter(word => word.end > start && word.start < end).map(word => word.text).join(' ') }];
  });
  return { duration, fps: timeline.fps || 30, scenes, words, timeline };
}

async function digest(file) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

export async function exportReview(project, spec, options = {}) {
  const root = fs.realpathSync(project);
  const output = path.join(root, 'output'), slug = path.basename(root);
  let video;
  if (options.video) video = path.resolve(root, options.video);
  else {
    const candidates = [path.join(output, `${slug}-draft.mp4`), path.join(output, `${slug}.mp4`)].filter(file => fs.existsSync(file));
    video = candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
  }
  if (!video || !fs.existsSync(video)) throw new Error('No finished render. Run all first, or pass --video output/FILE.mp4.');
  const timelineFile = path.join(root, 'assets/timeline.json');
  const timeline = readJSON(timelineFile);
  const model = reviewModel(spec, timeline);
  const info = JSON.parse(execFileSync(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
    'stream=avg_frame_rate:format=duration', '-of', 'json', video], { encoding: 'utf8' }));
  const [num, den] = String(info.streams?.[0]?.avg_frame_rate || '30/1').split('/').map(Number);
  const fps = num / den;
  if (!Number.isFinite(fps) || fps <= 0 || Math.abs(Number(info.format?.duration) - model.duration) > Math.max(0.1, 2 / fps)) {
    throw new Error('The render does not match the prepared timeline. Render the current edit again.');
  }
  for (const relative of ['source/spec.js', 'source/style.json', 'assets/timeline.json']) {
    const file = path.join(root, relative);
    if (fs.existsSync(file) && fs.statSync(file).mtimeMs > fs.statSync(video).mtimeMs + 1000) {
      throw new Error('The edit changed after this render. Render again before collecting feedback.');
    }
  }
  model.fps = fps;
  model.version = crypto.createHash('sha256').update(JSON.stringify({ spec, timeline, video: await digest(video) })).digest('hex').slice(0, 20);
  const directory = path.join(root, 'files/review/versions', model.version);
  fs.mkdirSync(directory, { recursive: true });
  const snapshot = path.join(directory, 'video.mp4');
  if (!fs.existsSync(snapshot)) fs.copyFileSync(video, snapshot, fs.constants.COPYFILE_EXCL | fs.constants.COPYFILE_FICLONE);
  model.video = snapshot;
  model.originalVideo = path.basename(video);
  model.project = root;
  const modelFile = path.join(directory, 'model.json');
  fs.writeFileSync(modelFile, JSON.stringify(model, null, 2) + '\n');
  fs.writeFileSync(path.join(directory, 'spec.json'), JSON.stringify(spec, null, 2) + '\n');
  return modelFile;
}

export async function review(project, spec, args = []) {
  const allowed = new Set(['--video', '--port', '--timeout', '--no-open', '--export']);
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (!allowed.has(key)) throw new Error(`Unknown review option: ${key}`);
    if (key === '--no-open' || key === '--export') options[key.slice(2)] = true;
    else {
      if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing value for ${key}`);
      options[key.slice(2)] = args[++index];
    }
  }
  const model = await exportReview(project, spec, options);
  console.log(`[review] immutable draft: ${model}`);
  if (options.export) return model;
  const command = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const childArgs = [path.join(ENGINE, '../review/review.py'), model];
  for (const key of ['port', 'timeout']) if (options[key]) childArgs.push(`--${key}`, String(options[key]));
  if (options['no-open']) childArgs.push('--no-open');
  await new Promise((resolve, reject) => {
    const child = spawn(command, childArgs, { stdio: 'inherit' });
    child.once('error', error => reject(new Error(`Review needs Python 3: ${error.message}`)));
    child.once('close', code => code === 0 ? resolve() : reject(new Error(`Review exited with status ${code}`)));
  });
  return model;
}
