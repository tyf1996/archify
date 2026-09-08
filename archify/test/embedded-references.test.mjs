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
