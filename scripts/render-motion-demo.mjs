import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { makeMotion } from '../skills/short-editing/engine/direction.mjs';
import { FFMPEG } from '../skills/short-editing/engine/platform.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const destination = path.resolve(process.argv[2] || '.test-output/motion-demo');
fs.mkdirSync(destination, { recursive: true });
const directions = ['paper', 'documentary', 'kinetic', 'studio'], duration = 9;
const run = (command, args) => { const result = spawnSync(command, args, { stdio: 'inherit' }); if (result.error) throw result.error; if (result.status) throw new Error(`${command} exited ${result.status}`); };
for (const direction of directions) {
  const project = path.join(destination, direction);
  fs.mkdirSync(path.join(project, 'source'), { recursive: true });
  fs.writeFileSync(path.join(project, 'source/demo.json'), JSON.stringify({ width: 540, height: 960, duration,
    eyebrow: 'LE FOND / LA FORME', title: ['Fais passer', "l’idée."], subtitle: 'Le message donne le rythme.',
    phrases: ['Une idée.', 'Un rythme.', 'Une preuve.'], metric: 'Donner forme au mouvement', source: 'Animation illustrative • mêmes données', footer: direction.toUpperCase() }, null, 2));
  makeMotion(project, ['showcase', '--direction', direction, '--config', 'source/demo.json', '--replace']);
  run(process.execPath, [path.join(root, 'skills/short-editing/engine/short.mjs'), 'capture', project, 'source/showcase.html', '--dur', String(duration), '--size', '540x960', '--at', '0,1.8,4.4,7.8', '--out', 'output/demo.mp4']);
}
run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...directions.flatMap(name => ['-i', path.join(destination, name, 'output/demo.mp4')]),
  '-filter_complex', '[0:v][1:v][2:v][3:v]hstack=inputs=4[v]', '-map', '[v]', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(destination, 'motion-comparison.mp4')]);
run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '1.8', '-i', path.join(destination, 'motion-comparison.mp4'), '-frames:v', '1', '-q:v', '2', path.join(destination, 'motion-comparison.jpg')]);
console.log(`Comparison: ${path.join(destination, 'motion-comparison.mp4')}`);
