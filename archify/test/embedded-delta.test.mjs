import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(__dirname, '..');
const cli = path.join(skillRoot, 'bin', 'archify.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-embedded-delta-'));

function run(args, options = {}) {
  return spawnSync(process.execPath, [...(options.require ? ['--require', options.require] : []), cli, ...args], {
    cwd: skillRoot,
    encoding: 'utf8',
    env: { ...process.env, ...(options.env || {}) },
  });
}

function write(name, value) {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`);
  return file;
}

function architecture({ mechanism, label } = {}) {
  return {
    schema_version: 1,
    diagram_type: 'architecture',
    meta: { title: 'Delta relationship fixture', quality_profile: 'showcase', viewBox: [900, 500] },
    components: [
      { id: 'source', type: 'software', label: 'Source', pos: [80, 150], size: [160, 76] },
      { id: 'target', type: 'hardware', label: 'Target', pos: [560, 150], size: [160, 76] },
    ],
    connections: [{
      id: 'source-target-handoff',
      from: 'source',
      to: 'target',
      ...(mechanism === undefined ? {} : { mechanism }),
      ...(label === undefined ? {} : { label }),
    }],
  };
}

function receipt(result) {
  assert.notEqual(result.stdout.trim(), '', `missing JSON stdout: ${result.stderr}`);
  return JSON.parse(result.stdout);
}

test('compare accepts mechanism-only relationship additions, removals, and changes with renderer-equivalent label signatures', () => {
  const cases = [
    { id: 'add', base: architecture(), head: architecture({ mechanism: 'call' }) },
    { id: 'remove', base: architecture({ mechanism: 'call' }), head: architecture() },
    { id: 'change', base: architecture({ mechanism: 'call' }), head: architecture({ mechanism: 'notification' }) },
    { id: 'labeled-change', base: architecture({ mechanism: 'call', label: 'handoff' }), head: architecture({ mechanism: 'notification', label: 'handoff' }) },
  ];

  for (const entry of cases) {
    const base = write(`${entry.id}.base.json`, entry.base);
    const head = write(`${entry.id}.head.json`, entry.head);
    const output = path.join(tmp, `${entry.id}.html`);
    const result = run(['compare', 'architecture', base, head, output, '--json']);
    assert.equal(result.status, 0, `${entry.id}: ${result.stderr || result.stdout}`);
    const compared = receipt(result);
    const change = compared.changes.connections.find((candidate) => candidate.id === 'source-target-handoff');
    assert.deepEqual(change.changedFields, ['/mechanism'], entry.id);
    assert.deepEqual(change.classifications, ['semantic'], entry.id);
    assert.equal(change.base.mechanism, entry.base.connections[0].mechanism || '', entry.id);
    assert.equal(change.head.mechanism, entry.head.connections[0].mechanism || '', entry.id);
    assert.ok(fs.existsSync(output), `${entry.id}: output missing`);
    assert.match(fs.readFileSync(output, 'utf8'), /data-change-key="relationship:source-target-handoff"/);
  }
});

test('malformed compare inputs retain one structured schema receipt instead of throwing during embedded precheck', () => {
  const valid = write('valid.json', architecture());
  const shapes = [
    { id: 'object', value: { schema_version: 1, diagram_type: 'architecture', meta: { title: 'Malformed' }, components: {} } },
    { id: 'string', value: { schema_version: 1, diagram_type: 'architecture', meta: { title: 'Malformed' }, components: 'not-an-array' } },
    { id: 'null', value: { schema_version: 1, diagram_type: 'architecture', meta: { title: 'Malformed' }, components: null } },
    { id: 'root-primitive', value: 'true' },
  ];

  for (const shape of shapes) {
    const base = write(`${shape.id}.json`, shape.value);
    const output = path.join(tmp, `${shape.id}.html`);
    const result = run(['compare', 'architecture', base, valid, output, '--json']);
    assert.notEqual(result.status, 0, shape.id);
    const failed = receipt(result);
    assert.equal(failed.ok, false, shape.id);
    assert.match(failed.diagnostics[0].code, /^schema\//, shape.id);
    assert.doesNotMatch(result.stderr, /TypeError|\.entries is not a function/, shape.id);
    assert.equal(fs.existsSync(output), false, shape.id);
  }
});

test('unsupported embedded compare rejects before output-path probes or candidate writes and preserves trusted targets', () => {
  const monitored = path.join(tmp, 'monitored-output');
  fs.mkdirSync(monitored);
  const output = path.join(monitored, 'review.html');
  const receiptPath = path.join(monitored, 'review.receipt.json');
  fs.writeFileSync(output, 'trusted output\n');
  fs.writeFileSync(receiptPath, 'trusted receipt\n');
  const base = write('unsupported.base.json', {
    ...architecture(),
    execution_domains: [{ id: 'linux', label: 'Linux', environment: 'linux' }],
  });
  const head = write('unsupported.head.json', architecture());
  const preload = write('trace-writes.cjs', `
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.env.DELTA_MONITOR_ROOT);
const writes = [];
const inside = (target) => {
  try { return path.resolve(String(target)).startsWith(root + path.sep); } catch { return false; }
};
const openSync = fs.openSync;
const mkdirSync = fs.mkdirSync;
fs.openSync = function(target, flags, ...rest) {
  if (inside(target) && typeof flags === 'string' && /[wax+]/.test(flags)) writes.push({ kind: 'open', target: String(target), flags });
  return openSync.call(this, target, flags, ...rest);
};
fs.mkdirSync = function(target, ...rest) {
  if (inside(target)) writes.push({ kind: 'mkdir', target: String(target) });
  return mkdirSync.call(this, target, ...rest);
};
process.on('exit', () => process.stderr.write('D2_WRITE_TRACE ' + JSON.stringify(writes) + '\\n'));
`);

  const result = run([
    'compare', 'architecture', base, head, output,
    '--receipt', receiptPath, '--json',
  ], {
    require: preload,
    env: { DELTA_MONITOR_ROOT: monitored },
  });
  assert.notEqual(result.status, 0);
  const failed = receipt(result);
  assert.equal(failed.diagnostics[0].code, 'delta/embedded-context-unsupported');
  assert.equal(fs.readFileSync(output, 'utf8'), 'trusted output\n');
  assert.equal(fs.readFileSync(receiptPath, 'utf8'), 'trusted receipt\n');
  const trace = result.stderr.match(/D2_WRITE_TRACE (\[[^\n]*\])/);
  assert.ok(trace, result.stderr);
  assert.deepEqual(JSON.parse(trace[1]), []);
  assert.deepEqual(fs.readdirSync(monitored).sort(), ['review.html', 'review.receipt.json']);
});

test('supported comparisons still execute output-path extension validation', () => {
  const base = write('path-safe.base.json', architecture());
  const head = write('path-safe.head.json', architecture({ mechanism: 'call' }));
  const output = path.join(tmp, 'invalid-extension.txt');
  const result = run(['compare', 'architecture', base, head, output, '--json']);
  assert.notEqual(result.status, 0);
  const failed = receipt(result);
  assert.equal(failed.stage, 'prepare');
  assert.equal(failed.diagnostics[0].code, 'output/cli-extension');
  assert.equal(fs.existsSync(output), false);
});

process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
