import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-embedded-rendering-'));
let sequence = 0;

function validate(type, document) {
  const id = sequence++;
  const input = path.join(tmp, `${id}.${type}.json`);
  fs.writeFileSync(input, JSON.stringify(document));
  const result = spawnSync(process.execPath, [
    path.join(skillRoot, 'bin/archify.mjs'), 'validate', type, input, '--quality', 'showcase', '--json',
  ], { cwd: skillRoot, encoding: 'utf8' });
  return {
    ...result,
    receipt: result.stdout.trim() ? JSON.parse(result.stdout) : null,
  };
}

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

function nodeRect(source, id) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(
    `<g[^>]*data-node-id="${escapedId}"[^>]*>[\\s\\S]*?<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"`,
  ));
  assert.ok(match, `missing rendered node ${id}`);
  return {
    x: Number(match[1]),
    y: Number(match[2]),
    width: Number(match[3]),
    height: Number(match[4]),
  };
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

test('legacy authored compact heights remain exact in Architecture, Dataflow, and Workflow v1/v2', () => {
  const cases = [
    ['architecture', {
      schema_version: 1,
      diagram_type: 'architecture',
      meta: { title: 'Compact architecture', viewBox: [500, 300] },
      components: [{ id: 'compact', type: 'backend', label: 'API', pos: [100, 100], size: [120, 40] }],
      connections: [],
    }],
    ['dataflow', {
      schema_version: 1,
      diagram_type: 'dataflow',
      meta: { title: 'Compact dataflow', viewBox: [500, 360] },
      stages: [{ label: 'Input' }, { label: 'Output' }],
      nodes: [
        { id: 'compact', type: 'backend', label: 'API', stage: 0, row: 0, height: 40 },
        { id: 'peer', type: 'backend', label: 'Peer', stage: 1, row: 0, height: 40 },
      ],
      flows: [],
    }],
    ['workflow', {
      schema_version: 1,
      diagram_type: 'workflow',
      meta: { title: 'Compact workflow v1' },
      lanes: [{ id: 'main', label: 'Main' }],
      nodes: [{ id: 'compact', type: 'backend', label: 'API', lane: 'main', col: 0, height: 40 }],
      edges: [],
    }],
    ['workflow', {
      schema_version: 2,
      diagram_type: 'workflow',
      meta: { title: 'Compact workflow v2' },
      lanes: [{ id: 'main', label: 'Main' }],
      nodes: [{ id: 'compact', type: 'backend', label: 'API', lane: 'main', col: 0, height: 40 }],
      edges: [],
    }],
  ];

  for (const [type, document] of cases) {
    assert.equal(nodeRect(svg(render(type, document)), 'compact').height, 40, `${type} v${document.schema_version}`);
  }
});

test('legacy compact Architecture neighbors retain their authored clearance', () => {
  const document = {
    schema_version: 1,
    diagram_type: 'architecture',
    meta: { title: 'Compact neighbors', viewBox: [500, 300], legend: { mode: 'hidden' } },
    components: [
      { id: 'first', type: 'backend', label: 'A', pos: [100, 100], size: [120, 40] },
      { id: 'second', type: 'backend', label: 'B', pos: [100, 151], size: [120, 40] },
    ],
    connections: [],
  };
  const output = svg(render('architecture', document));
  const first = nodeRect(output, 'first');
  const second = nodeRect(output, 'second');
  assert.equal(second.y - (first.y + first.height), 11);
});

const MECHANISM_CASES = {
  architecture: {
    schema_version: 1,
    diagram_type: 'architecture',
    meta: { title: 'Architecture mechanism', viewBox: [680, 380], engineering_profile: 'embedded-runtime' },
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
    meta: { title: 'Workflow mechanism', viewBox: [720, 360], engineering_profile: 'embedded-runtime' },
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
    meta: { title: 'Sequence mechanism', viewBox: [720, 560], column_fit: 'spread', engineering_profile: 'embedded-runtime' },
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
    meta: { title: 'Dataflow mechanism', viewBox: [720, 520], engineering_profile: 'embedded-runtime' },
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
    meta: { title: 'Lifecycle mechanism', viewBox: [720, 566], engineering_profile: 'embedded-runtime' },
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

test('Lifecycle renders execution domains as a measured document caption without assigning them to states', () => {
  const document = structuredClone(MECHANISM_CASES.lifecycle);
  document.execution_domains[0].label = 'DomainNeedle';
  const output = svg(render('lifecycle', document));
  assert.match(output, />Execution domains</);
  assert.match(output, />DomainNeedle · linux</);
  assert.match(output, /data-execution-domain-id="linux"/);
  assert.match(output, /data-execution-domain-environment="linux"/);
  assert.doesNotMatch(output, /data-node-execution-domain=/);

  const chinese = structuredClone(document);
  chinese.meta.locale = 'zh-CN';
  assert.match(svg(render('lifecycle', chinese)), />执行域</);

  delete document.execution_domains;
  const legacyOutput = svg(render('lifecycle', document));
  assert.doesNotMatch(legacyOutput, /data-execution-domains|data-execution-domain-id|>Execution domains</);

  const crowded = structuredClone(MECHANISM_CASES.lifecycle);
  crowded.execution_domains = Array.from({ length: 8 }, (_, index) => ({
    id: `domain-${index}`,
    label: `Execution domain ${index}`,
    environment: index % 2 ? 'rtos' : 'linux',
  }));
  assert.throws(() => render('lifecycle', crowded), /fixed band layout and .*execution-domain caption/);
  crowded.meta.viewBox[1] = 640;
  assert.match(svg(render('lifecycle', crowded)), /data-execution-domain-id="domain-7"/);
});

test('Lifecycle rejects transition labels and routes that cross measured execution-domain caption text', () => {
  const base = {
    schema_version: 1,
    diagram_type: 'lifecycle',
    meta: { title: 'Caption collision', viewBox: [720, 660], quality_profile: 'showcase' },
    execution_domains: [{ id: 'linux', label: 'DomainNeedle', environment: 'linux' }],
    lanes: [{ id: 'main', label: 'Main' }],
    states: [
      { id: 'a', type: 'active', label: 'A', lane: 'main', col: 0 },
      { id: 'b', type: 'success', label: 'B', lane: 'main', col: 2 },
    ],
    transitions: [{ id: 'ab', from: 'a', to: 'b', label: 'TransitionNeedle', labelAt: [140, 576] }],
  };
  const labelCollision = validate('lifecycle', base);
  assert.notEqual(labelCollision.status, 0);
  const labelDiagnostic = labelCollision.receipt.diagnostics.find((entry) => entry.code === 'lifecycle/caption-label-overlap');
  assert.ok(labelDiagnostic);
  assert.match(labelDiagnostic.supportedFixes.join(' '), /increase meta\.viewBox\[1\].*labelAt/);

  const routeCollisionDocument = structuredClone(base);
  routeCollisionDocument.execution_domains[0].label = 'Firmware execution and recovery domain';
  routeCollisionDocument.transitions = [{
    id: 'ab',
    from: 'a',
    to: 'b',
    label: 'Recovery',
    route: 'bottom-channel',
    channelY: 576,
    fromSide: 'bottom',
    toSide: 'bottom',
  }];
  const routeCollision = validate('lifecycle', routeCollisionDocument);
  assert.notEqual(routeCollision.status, 0);
  const routeDiagnostic = routeCollision.receipt.diagnostics.find((entry) => entry.code === 'lifecycle/caption-route-overlap');
  assert.ok(routeDiagnostic);
  assert.match(routeDiagnostic.supportedFixes.join(' '), /increase meta\.viewBox\[1\].*channelX\/channelY/);
});

test('Lifecycle execution-domain height guidance is sufficient when applied without another repair', () => {
  const document = {
    schema_version: 1,
    diagram_type: 'lifecycle',
    meta: { title: 'Caption guidance', viewBox: [720, 566], quality_profile: 'showcase' },
    execution_domains: Array.from({ length: 8 }, (_, index) => ({
      id: `domain${index}`,
      label: `Execution domain ${index}`,
      environment: index % 2 ? 'rtos' : 'linux',
    })),
    lanes: [{ id: 'main', label: 'Main' }],
    states: [
      { id: 'a', type: 'active', label: 'A', lane: 'main', col: 0 },
      { id: 'b', type: 'success', label: 'B', lane: 'main', col: 2 },
    ],
    transitions: [{ id: 'ab', from: 'a', to: 'b', label: 'TransitionNeedle' }],
  };
  const initial = validate('lifecycle', document);
  assert.notEqual(initial.status, 0);
  const heightDiagnostic = initial.receipt.diagnostics.find((entry) => /viewBox height .*too short/.test(entry.message));
  assert.ok(heightDiagnostic);
  const suggested = Number(heightDiagnostic.message.match(/at least (\d+)/)?.[1]);
  assert.equal(suggested, 576);
  assert.doesNotMatch(initial.receipt.diagnostics.map((entry) => entry.message).join('\n'), /at least 566/);

  document.meta.viewBox[1] = suggested;
  const repaired = validate('lifecycle', document);
  assert.equal(repaired.status, 0, repaired.stdout || repaired.stderr);
  assert.equal(repaired.receipt.ok, true);
});

test('embedded implicit legends stay semantic across renderers while hidden remains explicit', () => {
  const expectedKinds = {
    architecture: ['process', 'software'],
    workflow: ['isr', 'task'],
    sequence: ['hardware', 'isr'],
    dataflow: ['hardware', 'buffer'],
  };
  for (const [type, kinds] of Object.entries(expectedKinds)) {
    const document = structuredClone(MECHANISM_CASES[type]);
    const output = svg(render(type, document));
    for (const kind of kinds) {
      assert.ok(attrs(output, 'data-legend-semantic-kind').includes(kind), `${type}: ${kind}`);
    }
    document.meta.legend = { mode: 'hidden' };
    assert.deepEqual(attrs(svg(render(type, document)), 'data-legend-semantic-kind'), [], type);
  }
});

test('Sequence budgets multi-row embedded legends for implicit and explicit auto modes', () => {
  const base = {
    schema_version: 1,
    diagram_type: 'sequence',
    meta: { title: 'Multi-row embedded legend', viewBox: [720, 900], column_fit: 'spread' },
    participants: [
      { id: 'software', type: 'software', label: 'Software' },
      { id: 'process', type: 'process', label: 'Process' },
      { id: 'task', type: 'task', label: 'Task' },
      { id: 'hardware', type: 'hardware', label: 'Hardware' },
      { id: 'buffer', type: 'buffer', label: 'Buffer' },
    ],
    messages: [
      { id: 'default', from: 'software', to: 'process', y: 220, label: 'default' },
      { id: 'emphasis', from: 'process', to: 'task', y: 300, label: 'emphasis', variant: 'emphasis' },
      { id: 'security', from: 'task', to: 'hardware', y: 380, label: 'security', variant: 'security' },
      { id: 'return', from: 'hardware', to: 'buffer', y: 460, label: 'return', variant: 'return' },
    ],
  };
  const expected = ['emphasis', 'return', 'security', 'default', 'software', 'process', 'task', 'hardware', 'buffer'];
  assert.deepEqual(attrs(svg(render('sequence', base)), 'data-legend-semantic-kind'), expected);

  const explicit = structuredClone(base);
  explicit.meta.legend = { mode: 'auto' };
  assert.deepEqual(attrs(svg(render('sequence', explicit)), 'data-legend-semantic-kind'), expected);

  const hidden = structuredClone(base);
  hidden.meta.legend = { mode: 'hidden' };
  assert.deepEqual(attrs(svg(render('sequence', hidden)), 'data-legend-semantic-kind'), []);
});

process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
