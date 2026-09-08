import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  embeddedDiagnostics,
  validateEmbeddedContracts,
} from '../renderers/shared/embedded.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(__dirname, '..');
const cli = path.join(skillRoot, 'bin', 'archify.mjs');

function architecture(overrides = {}) {
  return {
    schema_version: 1,
    diagram_type: 'architecture',
    meta: { title: 'Embedded contract', ...(overrides.meta || {}) },
    execution_domains: overrides.execution_domains || [
      { id: 'linux', label: 'Linux domain', environment: 'linux' },
      { id: 'rtos', label: 'RTOS domain', environment: 'rtos' },
    ],
    components: overrides.components || [
      { id: 'app', type: 'process', label: 'App', execution_domain: 'linux', execution_context: 'linux-user', pos: [60, 100] },
      { id: 'worker', type: 'task', label: 'Worker', execution_domain: 'rtos', execution_context: 'rtos-task', pos: [300, 100] },
    ],
    connections: overrides.connections || [
      { id: 'app-worker-notify', from: 'app', to: 'worker', label: 'notify', mechanism: 'notification' },
    ],
    ...(overrides.semanticChecks ? { semanticChecks: overrides.semanticChecks } : {}),
  };
}

function codes(diagramType, diagram) {
  return new Set(embeddedDiagnostics(diagramType, diagram).map((diagnostic) => diagnostic.code));
}

test('embedded fields enforce domain identity, references, and context compatibility without a profile', () => {
  const duplicate = architecture({
    execution_domains: [
      { id: 'same', label: 'One', environment: 'linux' },
      { id: 'same', label: 'Two', environment: 'rtos' },
    ],
    components: [{ id: 'app', type: 'process', label: 'App', execution_domain: 'missing', execution_context: 'linux-user' }],
    connections: [],
  });
  const duplicateCodes = codes('architecture', duplicate);
  assert.ok(duplicateCodes.has('embedded/domain-id-duplicate'));
  assert.ok(duplicateCodes.has('embedded/domain-reference'));

  const noDomain = architecture({
    components: [{ id: 'handler', type: 'software', label: 'Handler', execution_context: 'linux-kernel' }],
    connections: [],
  });
  assert.ok(codes('architecture', noDomain).has('embedded/execution-owner'));

  const mismatch = architecture({
    components: [{ id: 'task', type: 'task', label: 'Task', execution_domain: 'linux', execution_context: 'rtos-task' }],
    connections: [],
  });
  assert.ok(codes('architecture', mismatch).has('embedded/context-environment'));
});

test('requiredRelations validate references and exact authored mechanisms without a profile', () => {
  const missing = architecture({
    semanticChecks: { requiredRelations: [{ from: 'app', to: 'worker', mechanism: 'ipc' }] },
  });
  assert.ok(codes('architecture', missing).has('embedded/required-relation'));

  const unknown = architecture({
    semanticChecks: { requiredRelations: [{ from: 'app', to: 'ghost' }] },
  });
  assert.ok(codes('architecture', unknown).has('embedded/required-relation'));

  const present = architecture({
    semanticChecks: { requiredRelations: [{ from: 'app', to: 'worker', mechanism: 'notification' }] },
  });
  assert.deepEqual(embeddedDiagnostics('architecture', present), []);
});

test('embedded-runtime requires only supported execution entities and cross-context mechanisms', () => {
  const profile = architecture({ meta: { engineering_profile: 'embedded-runtime' } });
  assert.deepEqual(embeddedDiagnostics('architecture', profile), []);

  const software = architecture({
    meta: { engineering_profile: 'embedded-runtime' },
    components: [{ id: 'driver', type: 'software', label: 'Driver', pos: [60, 100] }],
    connections: [],
  });
  assert.deepEqual(embeddedDiagnostics('architecture', software), []);

  const missing = architecture({
    meta: { engineering_profile: 'embedded-runtime' },
    components: [{ id: 'worker', type: 'task', label: 'Worker', pos: [60, 100] }],
    connections: [],
  });
  assert.ok(codes('architecture', missing).has('embedded/execution-owner'));

  const unknown = architecture({
    meta: { engineering_profile: 'embedded-runtime' },
    components: [{ id: 'worker', type: 'task', label: 'Worker', execution_domain: 'rtos', execution_context: 'unknown', pos: [60, 100] }],
    connections: [],
  });
  assert.ok(codes('architecture', unknown).has('embedded/unknown-required-fact'));

  const noMechanism = architecture({
    meta: { engineering_profile: 'embedded-runtime' },
    connections: [{ id: 'cross-domain', from: 'app', to: 'worker', label: 'handoff' }],
  });
  assert.ok(codes('architecture', noMechanism).has('embedded/mechanism-required'));
});

test('embedded-runtime distinguishes Linux IRQ and supported execution kinds without endpoint inference', () => {
  const valid = architecture({
    meta: { engineering_profile: 'embedded-runtime' },
    execution_domains: [
      { id: 'linux', label: 'Linux', environment: 'linux' },
      { id: 'rtos', label: 'RTOS', environment: 'rtos' },
    ],
    components: [
      { id: 'irq', type: 'isr', label: 'IRQ', execution_domain: 'linux', execution_context: 'linux-irq', pos: [60, 100] },
      { id: 'kthread', type: 'thread', label: 'Thread', execution_domain: 'linux', execution_context: 'linux-kernel', pos: [300, 100] },
      { id: 'buffer', type: 'buffer', label: 'Buffer', pos: [540, 100] },
    ],
    connections: [
      { id: 'irq-thread-notify', from: 'irq', to: 'kthread', label: 'wake', mechanism: 'notification' },
      { id: 'peripheral-buffer-dma', from: 'irq', to: 'buffer', label: 'samples', mechanism: 'dma' },
    ],
  });
  assert.deepEqual(embeddedDiagnostics('architecture', valid), []);

  const invalid = architecture({
    meta: { engineering_profile: 'embedded-runtime' },
    components: [{ id: 'threaded', type: 'thread', label: 'Threaded IRQ', execution_domain: 'linux', execution_context: 'linux-irq', pos: [60, 100] }],
    connections: [],
  });
  assert.ok(codes('architecture', invalid).has('embedded/context-kind'));
});

test('lifecycle applies domain and required relation checks without treating states as execution entities', () => {
  const lifecycle = {
    schema_version: 1,
    diagram_type: 'lifecycle',
    meta: { title: 'Image state', engineering_profile: 'embedded-runtime' },
    execution_domains: [{ id: 'linux', label: 'Linux', environment: 'linux' }],
    semanticChecks: { requiredRelations: [{ from: 'trial', to: 'rollback', mechanism: 'lifecycle-control' }] },
    lanes: [{ id: 'main', label: 'Image' }],
    states: [
      { id: 'trial', type: 'active', label: 'Trial', lane: 'main', col: 0 },
      { id: 'rollback', type: 'failure', label: 'Rollback', lane: 'main', col: 1 },
    ],
    transitions: [{ id: 'trial-rollback', from: 'trial', to: 'rollback', label: 'health failure', mechanism: 'lifecycle-control' }],
  };
  assert.doesNotThrow(() => validateEmbeddedContracts('lifecycle', lifecycle));
});

test('architecture compare rejects unsupported embedded context before replacing trusted outputs', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-embedded-delta-'));
  try {
    const base = architecture();
    const head = architecture();
    head.components[0].execution_context = 'linux-kernel';
    const basePath = path.join(tmp, 'base.json');
    const headPath = path.join(tmp, 'head.json');
    const output = path.join(tmp, 'delta.html');
    const receipt = path.join(tmp, 'delta.receipt.json');
    fs.writeFileSync(basePath, JSON.stringify(base));
    fs.writeFileSync(headPath, JSON.stringify(head));
    fs.writeFileSync(output, 'trusted artifact');
    fs.writeFileSync(receipt, 'trusted receipt');

    const result = spawnSync(process.execPath, [
      cli, 'compare', 'architecture', basePath, headPath, output, '--receipt', receipt, '--json',
    ], { cwd: skillRoot, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    const failure = JSON.parse(result.stdout);
    assert.equal(failure.diagnostics[0].code, 'delta/embedded-context-unsupported');
    assert.equal(fs.readFileSync(output, 'utf8'), 'trusted artifact');
    assert.equal(fs.readFileSync(receipt, 'utf8'), 'trusted receipt');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
