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
const examplesRoot = path.join(skillRoot, 'examples');
const evidenceRoot = path.join(examplesRoot, 'evidence');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-embedded-examples-'));

const CASES = [
  {
    id: 'embedded-runtime-map',
    type: 'architecture',
    file: 'embedded-runtime-map.architecture.json',
    domains: { 'rtos-control': 'rtos', 'linux-service': 'linux' },
    roles: {
      sensor: ['hardware', 'rtos-control', 'hardware'],
      controlTask: ['task', 'rtos-control', 'rtos-task'],
      sharedBuffer: ['buffer', 'rtos-control', 'unknown'],
      linuxService: ['process', 'linux-service', 'linux-user'],
      watchdog: ['hardware', 'rtos-control', 'hardware'],
    },
    relations: [
      ['sensor', 'controlTask', 'irq'],
      ['controlTask', 'sharedBuffer', 'shared-memory'],
      ['sharedBuffer', 'linuxService', 'shared-memory'],
      ['watchdog', 'controlTask', 'lifecycle-control'],
    ],
  },
  {
    id: 'bare-metal-boot',
    type: 'workflow',
    file: 'bare-metal-boot.workflow.json',
    domains: { 'bare-firmware': 'bare-metal' },
    roles: {
      reset: ['software', 'bare-firmware', 'boot'],
      runtimeInit: ['software', 'bare-firmware', 'boot'],
      boardInit: ['software', 'bare-firmware', undefined],
      calibrate: ['software', 'bare-firmware', undefined],
      mainLoop: ['software', 'bare-firmware', undefined],
      safeState: ['software', 'bare-firmware', undefined],
    },
    relations: [
      ['reset', 'runtimeInit', 'call'],
      ['runtimeInit', 'boardInit', 'call'],
      ['boardInit', 'calibrate', 'call'],
      ['calibrate', 'mainLoop', 'call'],
      ['boardInit', 'safeState', 'lifecycle-control'],
    ],
  },
  {
    id: 'rtos-irq-handoff',
    type: 'sequence',
    file: 'rtos-irq-handoff.sequence.json',
    domains: { 'rtos-control': 'rtos' },
    roles: {
      peripheral: ['hardware', 'rtos-control', 'hardware'],
      isr: ['isr', 'rtos-control', 'rtos-isr'],
      queue: ['buffer', 'rtos-control', undefined],
      worker: ['task', 'rtos-control', 'rtos-task'],
      recovery: ['software', 'rtos-control', 'rtos-task'],
    },
    relations: [
      ['peripheral', 'isr', 'irq'],
      ['isr', 'queue', 'task-sync'],
      ['queue', 'worker', 'task-sync'],
      ['queue', 'recovery', 'notification'],
    ],
  },
  {
    id: 'linux-device-data-path',
    type: 'dataflow',
    file: 'linux-device-data-path.dataflow.json',
    domains: { 'linux-device': 'linux' },
    roles: {
      peripheral: ['hardware', 'linux-device', 'hardware'],
      dma: ['hardware', 'linux-device', 'hardware'],
      kernelBuffer: ['buffer', 'linux-device', 'linux-kernel'],
      drop: ['software', 'linux-device', 'linux-kernel'],
      userProcess: ['process', 'linux-device', 'linux-user'],
      output: ['hardware', 'linux-device', 'hardware'],
    },
    relations: [
      ['peripheral', 'dma', 'bus'],
      ['dma', 'kernelBuffer', 'dma'],
      ['kernelBuffer', 'userProcess', 'data-transfer'],
      ['userProcess', 'output', 'data-transfer'],
      ['kernelBuffer', 'drop', 'notification'],
    ],
  },
  {
    id: 'firmware-update-state',
    type: 'lifecycle',
    file: 'firmware-update-state.lifecycle.json',
    domains: { 'linux-update': 'linux' },
    roles: {},
    relations: [
      ['downloading', 'verifying', 'data-transfer'],
      ['verifying', 'trial', 'lifecycle-control'],
      ['trial', 'confirmed', 'lifecycle-control'],
      ['verifying', 'recovery', 'notification'],
      ['trial', 'rollback', 'lifecycle-control'],
      ['rollback', 'recovery', 'lifecycle-control'],
    ],
  },
];

function relationById(doc, type, id) {
  return relationshipCollection(doc, type).find((relation) => relation.id === id);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(examplesRoot, file), 'utf8'));
}

function entityCollection(doc, type) {
  return doc[type === 'architecture' ? 'components'
    : type === 'workflow' ? 'nodes'
      : type === 'sequence' ? 'participants'
        : type === 'dataflow' ? 'nodes'
          : 'states'];
}

function relationshipCollection(doc, type) {
  return doc[type === 'architecture' ? 'connections'
    : type === 'workflow' ? 'edges'
      : type === 'sequence' ? 'messages'
        : type === 'dataflow' ? 'flows'
          : 'transitions'];
}

function validate(type, input) {
  return spawnSync(process.execPath, [cli, 'validate', type, input, '--quality', 'showcase', '--json'], {
    cwd: skillRoot,
    encoding: 'utf8',
  });
}

function diagnostics(result) {
  return JSON.parse(result.stdout).diagnostics || [];
}

function writeCandidate(id, doc) {
  const candidate = path.join(tmp, `${id}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  fs.writeFileSync(candidate, `${JSON.stringify(doc, null, 2)}\n`);
  return candidate;
}

function relationExists(doc, type, from, to, mechanism) {
  return relationshipCollection(doc, type).some((relation) => (
    relation.from === from && relation.to === to && relation.mechanism === mechanism
  ));
}

test('embedded examples freeze five A1 fixture IDs, environments, execution facts, relations, and three views', () => {
  for (const spec of CASES) {
    const doc = readJson(spec.file);
    assert.equal(doc.diagram_type, spec.type, spec.id);
    assert.equal(doc.meta.locale, 'en', spec.id);
    assert.equal(doc.meta.quality_profile, 'showcase', spec.id);
    assert.equal(doc.meta.engineering_profile, 'embedded-runtime', spec.id);
    assert.equal('animation' in doc.meta, false, `${spec.id}: static is the default`);
    assert.equal('visual_preset' in doc.meta, false, `${spec.id}: classic is the default`);
    assert.deepEqual(doc.meta.views.map((view) => view.id), ['main-path', 'recovery-path', 'evidence-gaps']);

    assert.deepEqual(
      Object.fromEntries(doc.execution_domains.map((domain) => [domain.id, domain.environment])),
      spec.domains,
      `${spec.id}: exact execution domains`,
    );

    const entities = new Map(entityCollection(doc, spec.type).map((entity) => [entity.id, entity]));
    for (const view of doc.meta.views) {
      assert.ok(view.focus.every((id) => entities.has(id)), `${spec.id}: ${view.id} has an unknown focus ID`);
    }
    for (const [id, [type, domain, context]] of Object.entries(spec.roles)) {
      const entity = entities.get(id);
      assert.ok(entity, `${spec.id}: missing ${id}`);
      assert.deepEqual(
        [entity.type, entity.execution_domain, entity.execution_context],
        [type, domain, context],
        `${spec.id}: ${id} role`,
      );
    }
    for (const [from, to, mechanism] of spec.relations) {
      assert.ok(relationExists(doc, spec.type, from, to, mechanism), `${spec.id}: ${from}→${to} ${mechanism}`);
    }
    assert.deepEqual(
      doc.semanticChecks.requiredRelations.map(({ from, to, mechanism }) => [from, to, mechanism]),
      spec.relations,
      `${spec.id}: required relations`,
    );

    const evidence = fs.readFileSync(path.join(evidenceRoot, `${spec.id}.md`), 'utf8');
    assert.match(evidence, /\| fact_id \| diagram_ids \| claim \| class \| reference \| status \| limits \|/);
    assert.match(evidence, /vendor-neutral|厂商中立|设计 fixture/i);
    assert.match(evidence, /不声称|不代表|does not claim/i);
    assert.match(evidence, /\| unknown \|/);
  }
});

test('R3 semantic fixes keep type, mechanism, condition, and evidence assertions explicit', () => {
  const rtos = readJson('rtos-irq-handoff.sequence.json');
  const rtosMessages = new Map(rtos.messages.map((message) => [message.id, message]));
  assert.equal(rtosMessages.get('isr-queue-enqueue').label, 'try non-blocking enqueue');
  assert.equal(rtosMessages.get('queue-recovery-full').label, '[rejected: full] request recovery');
  assert.equal(rtosMessages.get('queue-worker-dequeue').label, '[accepted; later scheduled] receive sample');
  assert.equal(rtosMessages.get('worker-peripheral-complete').label, '[accepted path] processing complete');
  assert.deepEqual(rtos.messages.map((message) => message.y), [180, 235, 295, 355, 415]);
  assert.deepEqual(rtos.segments.map((segment) => segment.label), [
    'Non-blocking enqueue attempt',
    'Rejected branch (mutually exclusive)',
    'Accepted branch (worker later scheduled)',
  ]);
  const rtosEvidence = fs.readFileSync(path.join(evidenceRoot, 'rtos-irq-handoff.md'), 'utf8');
  assert.match(rtosEvidence, /非阻塞入队尝试/);
  assert.match(rtosEvidence, /入队被接受且 worker 随后获得调度/);
  assert.match(rtosEvidence, /被拒绝的 sample 不进入 worker 成功消费路径/);

  const linux = readJson('linux-device-data-path.dataflow.json');
  const delivery = relationById(linux, 'dataflow', 'kernelBuffer-userProcess-read');
  assert.deepEqual(
    [delivery.from, delivery.to, delivery.mechanism, delivery.label],
    ['kernelBuffer', 'userProcess', 'data-transfer', 'deliver buffered sample; access API unspecified'],
  );
  assert.ok(linux.semanticChecks.requiredRelations.some((relation) => (
    relation.from === 'kernelBuffer' && relation.to === 'userProcess' && relation.mechanism === 'data-transfer'
  )));
  assert.match(fs.readFileSync(path.join(evidenceRoot, 'linux-device-data-path.md'), 'utf8'), /访问 API 未指定/);

  const bareMetal = readJson('bare-metal-boot.workflow.json');
  const reset = bareMetal.nodes.find((node) => node.id === 'reset');
  assert.deepEqual(
    [reset.type, reset.label, reset.sublabel, reset.execution_context],
    ['software', 'Reset handler', 'vector entry', 'boot'],
  );
  assert.match(fs.readFileSync(path.join(evidenceRoot, 'bare-metal-boot.md'), 'utf8'), /Reset handler\/vector entry/);

  const runtimeMap = readJson('embedded-runtime-map.architecture.json');
  const irqHandoff = relationById(runtimeMap, 'architecture', 'sensor-controlTask-sample');
  assert.deepEqual(
    [irqHandoff.mechanism, irqHandoff.label],
    ['irq', 'IRQ-triggered handoff; ISR/read omitted'],
  );
  const runtimeEvidence = fs.readFileSync(path.join(evidenceRoot, 'embedded-runtime-map.md'), 'utf8');
  assert.match(runtimeEvidence, /IRQ 触发的概览 handoff/);
  assert.match(runtimeEvidence, /IRQ 不表示数据搬运或 task 立即执行/);

  const lifecycle = readJson('firmware-update-state.lifecycle.json');
  const timeout = relationById(lifecycle, 'lifecycle', 'trial-rollback-timeout');
  assert.deepEqual(
    [timeout.mechanism, timeout.label],
    ['lifecycle-control', 'confirmation timeout; threshold unknown'],
  );
  const lifecycleEvidence = fs.readFileSync(path.join(evidenceRoot, 'firmware-update-state.md'), 'utf8');
  assert.match(lifecycleEvidence, /confirmation timeout 是 trial→rollback 的设计条件/);
  assert.match(lifecycleEvidence, /超时阈值数值未知/);
});

test('all five embedded fixtures validate only through the approved core interface', () => {
  for (const spec of CASES) {
    const result = validate(spec.type, path.join(examplesRoot, spec.file));
    assert.equal(result.status, 0, `${spec.id}: ${result.stderr || result.stdout}`);
    const receipt = JSON.parse(result.stdout);
    assert.equal(receipt.ok, true, spec.id);
    assert.equal(receipt.composition.profile, 'showcase', spec.id);
    assert.equal(receipt.composition.status, 'pass', spec.id);
  }
});

test('embedded profile rejects a missing execution owner without deleting the declared role label', () => {
  const doc = readJson('embedded-runtime-map.architecture.json');
  const controlTask = doc.components.find((component) => component.id === 'controlTask');
  const originalLabel = controlTask.label;
  delete controlTask.execution_domain;
  assert.equal(controlTask.label, originalLabel);

  const result = validate('architecture', writeCandidate('missing-owner', doc));
  assert.notEqual(result.status, 0);
  assert.ok(diagnostics(result).some((entry) => entry.code === 'embedded/execution-owner'));
});

test('embedded profile rejects an environment-incompatible context while retaining the authored label', () => {
  const doc = readJson('embedded-runtime-map.architecture.json');
  const controlTask = doc.components.find((component) => component.id === 'controlTask');
  const originalLabel = controlTask.label;
  controlTask.execution_context = 'linux-user';
  assert.equal(controlTask.label, originalLabel);

  const result = validate('architecture', writeCandidate('context-environment', doc));
  assert.notEqual(result.status, 0);
  assert.ok(diagnostics(result).some((entry) => entry.code === 'embedded/context-environment'));
});

test('required relation rejects a swapped mechanism while retaining its concrete relationship label', () => {
  const doc = readJson('embedded-runtime-map.architecture.json');
  const relation = doc.connections.find((connection) => connection.id === 'controlTask-sharedBuffer-produce');
  const originalLabel = relation.label;
  relation.mechanism = 'notification';
  assert.equal(relation.label, originalLabel);

  const result = validate('architecture', writeCandidate('swapped-mechanism', doc));
  assert.notEqual(result.status, 0);
  assert.ok(diagnostics(result).some((entry) => entry.code === 'embedded/required-relation'));
});

process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
