import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-embedded-rendering-'));
let sequence = 0;

function render(type, document) {
  const id = sequence++;
  const input = path.join(tmp, `${id}.${type}.json`);
  const output = path.join(tmp, `${id}.${type}.html`);
  fs.writeFileSync(input, JSON.stringify(document));
  execFileSync(process.execPath, [
    path.join(skillRoot, `renderers/${type}/render-${type}.mjs`), input, output,
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  return fs.readFileSync(output, 'utf8');
}

function svg(html) {
  return html.match(/<svg\b[\s\S]*?<\/svg>/)?.[0] || '';
}

function attrs(source, name) {
  return [...source.matchAll(new RegExp(`${name}="([^"]+)"`, 'g'))].map((match) => match[1]);
}

function architectureTypes() {
  const types = ['software', 'process', 'thread', 'task', 'isr', 'hardware', 'buffer', 'memory', 'bus'];
  return {
    schema_version: 1,
    diagram_type: 'architecture',
    meta: { title: 'Embedded types' },
    components: types.map((type, index) => ({
      id: `${type}Node`,
      type,
      label: type,
      pos: [60 + (index % 3) * 190, 80 + Math.floor(index / 3) * 120],
    })),
    connections: [],
  };
}

test('new embedded types render without a profile as exact node kinds, sigils, and auto legend facts', () => {
  const output = svg(render('architecture', architectureTypes()));
  const expected = ['software', 'process', 'thread', 'task', 'isr', 'hardware', 'buffer', 'memory', 'bus'];
  for (const type of expected) {
    assert.ok(attrs(output, 'data-node-kind').includes(type), type);
    assert.ok(attrs(output, 'data-semantic-sigil').includes(type), type);
    assert.ok(attrs(output, 'data-legend-semantic-kind').includes(type), type);
  }
});

test('pure legacy documents keep the old all legend catalog', () => {
  const document = {
    schema_version: 1,
    diagram_type: 'architecture',
    meta: { title: 'Legacy all legend', legend: { mode: 'all' }, viewBox: [900, 520] },
    components: [{ id: 'api', type: 'backend', label: 'API', pos: [120, 120] }],
    connections: [],
  };
  assert.deepEqual(attrs(svg(render('architecture', document)), 'data-legend-semantic-kind'), [
    'frontend', 'backend', 'database', 'cloud', 'security', 'messagebus', 'external',
  ]);
});

const MECHANISM_CASES = {
  architecture: {
    schema_version: 1,
    diagram_type: 'architecture',
    meta: { title: 'Architecture mechanism', viewBox: [680, 380] },
    execution_domains: [{ id: 'linux', label: 'Linux A-class', environment: 'linux' }],
    components: [
      { id: 'app', type: 'process', label: 'App', execution_domain: 'linux', execution_context: 'linux-user', pos: [80, 100] },
      { id: 'driver', type: 'software', label: 'Driver', execution_domain: 'linux', execution_context: 'linux-kernel', pos: [400, 100] },
    ],
    connections: [{ id: 'app-driver-call', from: 'app', to: 'driver', label: 'read()', mechanism: 'system-call' }],
  },
  workflow: {
    schema_version: 1,
    diagram_type: 'workflow',
    meta: { title: 'Workflow mechanism', viewBox: [720, 360] },
    execution_domains: [{ id: 'rtos', label: 'Control core', environment: 'rtos' }],
    lanes: [{ id: 'main', label: 'Control' }],
    nodes: [
      { id: 'isr', lane: 'main', col: 0, type: 'isr', label: 'ISR', execution_domain: 'rtos', execution_context: 'rtos-isr' },
      { id: 'task', lane: 'main', col: 3, type: 'task', label: 'Task', execution_domain: 'rtos', execution_context: 'rtos-task' },
    ],
    edges: [{ id: 'isr-task-notify', from: 'isr', to: 'task', label: 'wake', mechanism: 'notification' }],
  },
  sequence: {
    schema_version: 1,
    diagram_type: 'sequence',
    meta: { title: 'Sequence mechanism', viewBox: [720, 560], column_fit: 'spread' },
    execution_domains: [{ id: 'rtos', label: 'Control core', environment: 'rtos' }],
    participants: [
      { id: 'peripheral', type: 'hardware', label: 'Peripheral', execution_domain: 'rtos', execution_context: 'hardware' },
      { id: 'isr', type: 'isr', label: 'ISR', execution_domain: 'rtos', execution_context: 'rtos-isr' },
    ],
    messages: [{ id: 'peripheral-isr-irq', from: 'peripheral', to: 'isr', y: 220, label: 'sample ready', mechanism: 'irq' }],
  },
  dataflow: {
    schema_version: 1,
    diagram_type: 'dataflow',
    meta: { title: 'Dataflow mechanism', viewBox: [720, 520] },
    execution_domains: [{ id: 'linux', label: 'Linux core', environment: 'linux' }],
    stages: [{ label: 'Device' }, { label: 'Kernel' }],
    nodes: [
      { id: 'peripheral', type: 'hardware', label: 'Peripheral', stage: 0, row: 0, execution_domain: 'linux', execution_context: 'hardware' },
      { id: 'buffer', type: 'buffer', label: 'Kernel buffer', stage: 1, row: 0, execution_domain: 'linux', execution_context: 'linux-kernel' },
    ],
    flows: [{ id: 'peripheral-buffer-dma', from: 'peripheral', to: 'buffer', label: 'samples', mechanism: 'dma', route: 'straight' }],
  },
  lifecycle: {
    schema_version: 1,
    diagram_type: 'lifecycle',
    meta: { title: 'Lifecycle mechanism', viewBox: [720, 566] },
    execution_domains: [{ id: 'linux', label: 'Linux core', environment: 'linux' }],
    lanes: [{ id: 'main', label: 'Image' }],
    states: [
      { id: 'trial', type: 'active', label: 'Trial', lane: 'main', col: 0 },
      { id: 'confirmed', type: 'success', label: 'Confirmed', lane: 'main', col: 2 },
    ],
    transitions: [{ id: 'trial-confirmed-control', from: 'trial', to: 'confirmed', label: 'confirm', mechanism: 'lifecycle-control' }],
  },
};

const EXPECTED = {
  architecture: ['system-call', 'System call · read()'],
  workflow: ['notification', 'Notification · wake'],
  sequence: ['irq', 'IRQ · sample ready'],
  dataflow: ['dma', 'DMA · samples'],
  lifecycle: ['lifecycle-control', 'Lifecycle control · confirm'],
};

test('all five renderers expose authored mechanisms as machine facts, native titles, and visible SVG text', () => {
  for (const [type, document] of Object.entries(MECHANISM_CASES)) {
    const output = svg(render(type, document));
    const [mechanism, visible] = EXPECTED[type];
    assert.ok(attrs(output, 'data-edge-mechanism').includes(mechanism), type);
    assert.ok(output.includes(visible), `${type}: missing visible mechanism`);
    assert.ok(output.includes(`<title>${visible}</title>`), `${type}: missing mechanism title`);
  }
});

test('execution domain and context remain visible in static SVG and searchable Viewer facts', () => {
  const html = render('sequence', MECHANISM_CASES.sequence);
  const output = svg(html);
  assert.match(output, /Control core · RTOS ISR/);
  assert.match(output, /data-node-execution-domain="rtos"/);
  assert.match(output, /data-node-execution-domain-label="Control core"/);
  assert.match(output, /data-node-execution-context="rtos-isr"/);
  assert.match(html, /executionDomain/);
  assert.match(html, /executionContext/);
});

process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
