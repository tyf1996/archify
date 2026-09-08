import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const embedded = path.join(root, 'references', 'embedded');

function read(relative) {
  return fs.readFileSync(path.join(embedded, relative), 'utf8');
}

const domainFiles = ['embedded-linux.md', 'rtos.md', 'bare-metal.md'];
const ecosystemFiles = [
  'freertos.md',
  'zephyr.md',
  'rt-thread.md',
  'buildroot.md',
  'yocto.md',
];

test('embedded reference tree contains the bounded authoring entrypoints', () => {
  for (const file of [
    'README.md',
    'evidence-template.md',
    ...domainFiles,
    ...ecosystemFiles.map((file) => `ecosystems/${file}`),
  ]) {
    assert.equal(fs.existsSync(path.join(embedded, file)), true, file);
  }
});

test('domain references preserve the four environment boundaries', () => {
  const sources = Object.fromEntries(domainFiles.map((file) => [file, read(file)]));
  assert.match(sources['embedded-linux.md'], /设备描述.*构建.*匹配.*绑定.*probe.*可用性/s);
  assert.match(sources['embedded-linux.md'], /构建依赖图与运行时拓扑分开/);
  assert.match(sources['rtos.md'], /task.*thread.*ISR.*回调.*deferred work/s);
  assert.match(sources['rtos.md'], /wake 不等于 run/);
  assert.match(sources['bare-metal.md'], /Reset.*运行时初始化.*主循环.*ISR.*DMA/s);
  assert.match(sources['bare-metal.md'], /不凭空引入 task.*scheduler.*mutex/s);
  const readme = read('README.md');
  assert.match(readme, /Linux、RTOS 和裸机共存时组合读取/);
  assert.match(readme, /不新增图种、IR 字段/);
});

test('Linux evidence distinguishes binding attempts, completed probe, and userspace readiness', () => {
  const linux = read('embedded-linux.md');
  const template = read('evidence-template.md');
  assert.match(linux, /开始绑定或临时 `driver`／sysfs 关联也不证明 `probe\(\)` 成功/);
  assert.match(linux, /只有 `probe\(\)` 成功后才记录绑定完成/);
  assert.match(linux, /手工绑定等特殊入口按目标源码说明/);
  assert.match(linux, /绑定或 `probe\(\)` 成功仍不单独证明用户态接口 ready/);
  assert.match(linux, /drivers\/base\/dd\.c/);
  assert.match(template, /匹配、开始绑定或临时 driver\/sysfs 关联不证明 probe 成功/);
  assert.match(template, /成功 probe 后才记为绑定完成/);
  assert.match(template, /绑定\/probe 成功仍不证明用户态接口 ready/);
});

test('entry guidance distinguishes execution entities from callback mechanisms', () => {
  const readme = read('README.md');
  assert.match(readme, /区分执行实体与回调／延后处理机制/);
  assert.match(readme, /callback 和 work handler 的实际上下文由对应内核、配置及注册／调用链确定/);
  assert.match(readme, /task、thread 也可能只是同一生态中的命名差异/);
  assert.match(readme, /不强制拆成不同调度实体/);
});

test('embedded interface documentation stays internally consistent', () => {
  const readme = read('README.md');
  const schema = fs.readFileSync(path.join(root, 'schemas', 'README.md'), 'utf8');
  for (const role of ['software', 'process', 'thread', 'task', 'isr', 'hardware', 'buffer', 'memory', 'bus']) {
    const rolePattern = new RegExp('`' + role + '`');
    assert.match(schema, rolePattern, role);
  }
  assert.match(readme, /完整角色目录与 `embedded-runtime` 画像执行实体支持表以 \[Schema 说明\]/);
  assert.match(readme, /\[Schema 说明中的支持表\]/);
  assert.match(schema, /\| `process` \| `linux-user` \|/);
  assert.match(schema, /\| `thread` \/ `task` \| `linux-user`, `linux-kernel`, `rtos-task` \|/);
  assert.match(schema, /\| `isr` \| `linux-irq`, `rtos-isr`, `bare-isr` \|/);
  assert.match(schema, /`software` is not required to declare an execution context/);
  assert.match(schema, /empty `execution_domains` array is rejected by the core validator/);
  assert.match(readme, /`embedded-runtime` 可用于五种既有图种/);
  assert.match(readme, /`deployment-ownership` 仅用于 Architecture/);
  assert.match(readme, /execution domain 的 `id` 必须唯一，`label` 只要求非空/);
  assert.match(readme, /`linux-kernel` 表示内核线程／进程上下文/);
  assert.match(readme, /`linux-irq` 表示非线程化中断上下文/);
  assert.match(readme, /threaded IRQ 不自动归为 `linux-irq`/);
  assert.match(readme, /`software` 可以跨多个执行上下文/);
  assert.match(readme, /runtime\/version 表示固件身份/);
  assert.match(schema, /`embedded-runtime` engineering profile is opt-in for all five diagram types/);
  assert.match(schema, /`deployment-ownership`, which remains Architecture-only/);
});

test('references state version, configuration, and unknown boundaries', () => {
  for (const file of [...domainFiles, ...ecosystemFiles.map((name) => `ecosystems/${name}`)]) {
    const source = read(file);
    assert.match(source, /适用范围|版本与确认点|确认点/);
    assert.match(source, /固定|核对|目标项目/);
    assert.match(source, /不等于|不能|不要|不证明/);
  }
  assert.match(read('rtos.md'), /实时性或可调度性/);
  assert.match(read('bare-metal.md'), /VMA.*LMA/s);
});

test('ecosystem references cite official sources without claiming automation', () => {
  const expected = {
    'freertos.md': /github\.com\/FreeRTOS\/FreeRTOS-Kernel\/blob\/V11\.1\.0/,
    'zephyr.md': /docs\.zephyrproject\.org\/latest\/build\/dts\/howtos\.html/,
    'rt-thread.md': /rt-thread\.github\.io\/rt-thread\/page_thread_management\.html/,
    'buildroot.md': /buildroot\.org\/downloads\/manual\/manual\.html/,
    'yocto.md': /docs\.yoctoproject\.org\/current\/overview-manual\/concepts\.html/,
  };
  for (const [file, pattern] of Object.entries(expected)) {
    assert.match(read(`ecosystems/${file}`), pattern, file);
  }
  for (const file of ecosystemFiles) {
    assert.doesNotMatch(read(`ecosystems/${file}`), /自动验证|自动证明|guarantee/i, file);
  }
});

test('evidence template keeps the approved manual columns and no new IR field', () => {
  const template = read('evidence-template.md');
  assert.match(template, /fact_id \| diagram_ids \| claim \| class \| reference \| status \| limits/);
  assert.match(template, /不是新增 Schema/);
  assert.match(template, /运行值、设计预算、配置值和最坏界限分开/);
  assert.match(template, /未知.*不要用零值或默认行为代替/s);
  assert.doesNotMatch(template, /components\[\]|meta\.|schema_version|new field/i);
});

test('references do not introduce unapproved schema fields or implementation hooks', () => {
  const files = [
    'README.md',
    'evidence-template.md',
    ...domainFiles,
    ...ecosystemFiles.map((file) => `ecosystems/${file}`),
  ];
  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /新增字段定义|自动检查承诺|修改 Schema|renderer implementation/i, file);
  }
});
