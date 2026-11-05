import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { reviewModel, exportReview, review } from '../skills/short-editing/engine/review.mjs';

const timeline = { duration: 4, source: 20, speed: 2, fps: 30, keeps: [[2, 6, 0], [10, 14, 2]], words: [
  { text: 'Hello', start: 0, end: .5 }, { text: 'again', start: 2, end: 2.5 },
] };

test('scene boundaries and layout changes use the actual cut timeline', () => {
  const model = reviewModel({ layout: { keys: [[2, 1160], [10, 0]] }, scenes: [{ type: 'stat', from: 4, to: 12 }] }, timeline);
  assert.deepEqual(model.scenes.map(scene => [scene.start, scene.end, scene.layout]), [
    [0, 1, 'split'], [1, 2, 'split'], [2, 3, 'camera'], [3, 4, 'camera'],
  ]);
  assert.equal(model.scenes[0].spoken, 'Hello');
  assert.equal(model.scenes[2].spoken, 'again');
  assert.equal(model.scenes[1].visual, 'stat');
});

test('empty visual lists still produce complete review coverage', () => {
  assert.deepEqual(reviewModel({ silent: true }, timeline).scenes.map(scene => [scene.start, scene.end, scene.layout]), [[0, 4, 'paper']]);
});

test('removed scenes do not create zero-length review bands', () => {
  const model = reviewModel({ scenes: [{ type: 'stat', from: 7, to: 9 }] }, timeline);
  assert.equal(model.scenes.length, 1);
  assert.equal(model.scenes[0].visual, 'split');
});

test('invalid timelines and unknown options fail before starting a service', async () => {
  assert.throws(() => reviewModel({}, { duration: 0, keeps: [] }), /Invalid timeline/);
  assert.throws(() => reviewModel({}, { ...timeline, speed: -1 }), /playback speed/);
  await assert.rejects(review('.', {}, ['--unknown']), /Unknown review option/);
  await assert.rejects(review('.', {}, ['--video']), /Missing value/);
});

test('changed renders get immutable snapshots without replacing previous drafts', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'short-review-'));
  try {
    for (const directory of ['assets', 'source', 'output']) fs.mkdirSync(path.join(root, directory));
    fs.writeFileSync(path.join(root, 'source/spec.js'), 'window.SPEC = {silent:true,duration:2};');
    fs.writeFileSync(path.join(root, 'assets/timeline.json'), JSON.stringify({ duration: 2, speed: 1, fps: 30, keeps: [[0, 2, 0]], words: [] }));
    const video = path.join(root, 'output/test.mp4');
    const render = color => execFileSync(process.env.FFMPEG_PATH || 'ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=${color}:s=160x280:r=30:d=2`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', video]);
    render('navy');
    const firstFile = await exportReview(root, { silent: true }, { video });
    const first = JSON.parse(fs.readFileSync(firstFile));
    const before = fs.readFileSync(first.video);
    assert.equal(await exportReview(root, { silent: true }, { video }), firstFile);
    render('teal');
    const secondFile = await exportReview(root, { silent: true }, { video });
    assert.notEqual(firstFile, secondFile);
    assert.deepEqual(fs.readFileSync(first.video), before);
    assert.equal(JSON.parse(fs.readFileSync(secondFile)).fps, 30);
    await assert.rejects(exportReview(root, {}, { video: 'missing.mp4' }), /No finished render/);
    fs.writeFileSync(path.join(root, 'assets/timeline.json'), JSON.stringify({ duration: 6, keeps: [[0, 6, 0]] }));
    await assert.rejects(exportReview(root, {}, { video }), /does not match/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
