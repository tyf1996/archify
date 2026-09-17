#!/usr/bin/env node
// Materialize a small illustrative atlas without writing to the installed Skill.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildInterfaceAtlas} from './build-interface-atlas.mjs';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/demo-interface-atlas.mjs <new-directory>');
  const root = path.resolve(process.argv[2]);
  if (fs.existsSync(root)) throw new Error('Demo destination already exists; choose a new directory.');
  const native = path.join(root, 'native');
  const output = path.join(root, 'atlas');
  fs.mkdirSync(native, {recursive: true});
  for (const name of ['worker.h', 'catalog.json', 'structure.json']) {
    fs.copyFileSync(path.join(skillRoot, 'examples/interface-atlas', name), path.join(native, name));
  }
  const receipt = execFileSync(process.execPath, [path.join(skillRoot, 'bin/archify.mjs'), 'deliver', 'architecture',
    path.join(native, 'structure.json'), path.join(native, 'structure.archify.html'), '--quality', 'showcase', '--json'],
  {encoding: 'utf8'});
  fs.writeFileSync(path.join(native, 'structure.archify.delivery.json'), receipt);
  const result = buildInterfaceAtlas({catalogPath: path.join(native, 'catalog.json'), outputDirectory: output, sourceRoot: native});
  process.stdout.write(JSON.stringify({status: result.status, entry: path.join(output, 'index.html'), ...result.coverage,
    browserEvidence: 'not-run', visualReview: 'pending'}) + '\n');
} catch (error) {
  process.stderr.write(error.message + '\n');
  process.exitCode = 1;
}
