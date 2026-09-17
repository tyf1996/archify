import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import {buildInterfaceAtlas, validateCatalog, svgOf} from '../scripts/build-interface-atlas.mjs';
import {createAtlasFixture} from './helpers/interface-atlas.mjs';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = p => fs.readFileSync(p, 'utf8');
const catalogExample = () => JSON.parse(read(path.join(skillRoot, 'examples/interface-atlas/catalog.json')));

test('catalog schema and runtime accept the example and reject structural errors', () => {
  const validate = new Ajv2020({strict: true}).compile(JSON.parse(read(path.join(skillRoot, 'assets/interface-atlas/catalog.schema.json'))));
  assert.equal(validate(catalogExample()), true, JSON.stringify(validate.errors));
  for (const mutate of [
    c => { c.unrecognized = 1; },
    c => { c.locale = 'de'; },
    c => { c.sources = null; },
    c => { c.interfaces[0].sources = null; },
    c => { c.interfaces[0].signatureSource = null; },
    c => { c.interfaces[0].parameters = 'one'; },
    c => { c.diagrams[0].nodes[0].interfaces.push('worker-open'); },
    c => { c.sources[0].path = '../worker.h'; },
    c => { c.diagrams[0].base = 'javascript:alert(1)'; },
    c => { c.diagrams[0].nodes[0].id = 'bad" onclick="x'; },
  ]) {
    const c = catalogExample(); mutate(c);
    assert.equal(validate(c), false);
    assert.throws(() => validateCatalog(c));
  }
});

test('all five diagram types produce deterministic standalone readers with unchanged native SVG', () => {
  const f = createAtlasFixture({allTypes: true});
  try {
    const originals = new Map(f.catalog.diagrams.map(d => [d.id, read(path.join(f.inputs, d.base))]));
    const receipt = f.build();
    assert.deepEqual(receipt.coverage, {diagrams: 5, nodes: 5, interfaces: 3});
    assert.deepEqual(receipt.signatureChecks.verified, f.catalog.interfaces.map(f => f.id));
    assert.equal(receipt.signatureChecks.authoredOnly.length, 0);
    for (const d of f.catalog.diagrams) {
      const output = read(path.join(f.out, d.id + '.html'));
      const data = JSON.parse(output.match(/<script type="application\/json" id="aia-data">([\s\S]*?)<\/script>/)[1]);
      assert.equal(data.nodes[0].id, d.nodes[0].id);
      assert.equal(data.interfaces.length, 3);
      assert.equal(svgOf(output), svgOf(originals.get(d.id)));
      assert.equal(read(path.join(f.inputs, d.base)), originals.get(d.id));
      assert.equal(output.includes(f.root), false);
      assert.equal(output.includes(skillRoot), false);
    }
    assert.deepEqual(f.build({check: true}), receipt);
    assert.deepEqual(f.build(), receipt);
    assert.match(read(path.join(f.out, 'interfaces.md')), /worker\\_run/);
  } finally { f.cleanup(); }
});

test('authored signatures without source files are explicitly distinguished', () => {
  const f = createAtlasFixture();
  try {
    delete f.catalog.sources;
    f.catalog.interfaces.forEach(i => { delete i.sources; delete i.signatureSource; });
    f.save();
    const r = f.build({sourceRoot: undefined});
    assert.equal(r.sources.length, 0);
    assert.equal(r.signatureChecks.verified.length, 0);
    assert.equal(r.signatureChecks.authoredOnly.length, 3);
  } finally { f.cleanup(); }
});

for (const [name, mutate, error] of [
  ['unknown nodes', f => { f.catalog.diagrams[0].nodes[0].id = 'absent'; f.save(); }, /node missing/],
  ['unknown interfaces', f => { f.catalog.diagrams[0].nodes[0].interfaces.push('absent'); f.save(); }, /unknown interface/],
  ['unmapped interfaces', f => { f.catalog.diagrams[0].nodes[0].interfaces.pop(); f.save(); }, /unmapped interface/],
  ['duplicate IDs', f => { f.catalog.interfaces.push(f.catalog.interfaces[0]); f.save(); }, /duplicate interface/],
  ['stale source bytes', f => fs.appendFileSync(path.join(f.inputs, 'worker.h'), '\n/* changed */\n'), /stale source/],
  ['stale signature spans', f => { f.catalog.interfaces[0].signature = 'wrong signature'; f.save(); }, /signature does not match/],
  ['out-of-range source spans', f => { f.catalog.interfaces[0].signatureSource.endLine = 99; f.save(); }, /out-of-range/],
  ['reversed source spans', f => { f.catalog.interfaces[0].signatureSource.startLine = 4; f.save(); }, /invalid source span/],
  ['stale native HTML', f => fs.appendFileSync(path.join(f.inputs, 'structure.archify.html'), '\n'), /stale 9\/9/],
  ['stale native spec', f => fs.appendFileSync(path.join(f.inputs, 'structure.json'), '\n'), /stale 9\/9/],
  ['basic-only receipt', f => {
    const p = path.join(f.inputs, 'structure.archify.delivery.json'), r = JSON.parse(read(p));
    r.validation.checkCount = 4; fs.writeFileSync(p, JSON.stringify(r));
  }, /stale 9\/9/],
  ['mixed native locale', f => { f.catalog.locale = 'zh-CN'; f.save(); }, /locale differ/],
]) {
  test('rejects ' + name + ' before changing last-good outputs', () => {
    const f = createAtlasFixture();
    try {
      const r = f.build();
      mutate(f);
      assert.throws(() => f.build(), error);
      for (const o of r.outputs) assert.equal(hash(fs.readFileSync(path.join(f.out, o.path))), o.sha256);
    } finally { f.cleanup(); }
  });
}

test('source paths are encoded and hostile text cannot escape HTML or JSON script boundaries', () => {
  const f = createAtlasFixture();
  try {
    const bad = '</script><script>globalThis.pwned=1</script> $& $' + String.fromCharCode(96) + ' " & \u2028';
    const name = 'header space & <tag>).h';
    fs.renameSync(path.join(f.inputs, 'worker.h'), path.join(f.inputs, name));
    f.catalog.sources[0].path = name;
    f.catalog.context = bad;
    f.catalog.interfaces[0].summary = bad;
    f.save();
    f.build();
    const html = read(path.join(f.out, 'structure.html'));
    const data = JSON.parse(html.match(/<script type="application\/json" id="aia-data">([\s\S]*?)<\/script>/)[1]);
    assert.equal(data.context, bad);
    assert.equal(data.interfaces[0].summary, bad);
    assert.match(data.interfaces[0].sources[0].href, /header%20space%20%26%20%3Ctag%3E%29\.h/);
    const doc = read(path.join(f.out, 'interfaces.html'));
    assert.equal(doc.includes('<script>globalThis.pwned'), false);
    assert.match(doc, /&lt;\/script&gt;/);
  } finally { f.cleanup(); }
});

test('checks are read-only and edited or unrelated output files are preserved', () => {
  const f = createAtlasFixture();
  try {
    assert.throws(() => f.build({check: true}), /stale or missing/);
    assert.equal(fs.existsSync(f.out), false);
    fs.mkdirSync(f.out);
    fs.writeFileSync(path.join(f.out, 'index.html'), 'user content');
    assert.throws(() => f.build(), /unrelated/);
    assert.equal(read(path.join(f.out, 'index.html')), 'user content');
    const out = path.join(f.root, 'generated');
    f.build({outputDirectory: out});
    fs.appendFileSync(path.join(out, 'structure.html'), '<!-- edited -->');
    assert.throws(() => f.build({outputDirectory: out}), /was edited/);
    assert.throws(() => f.build({outputDirectory: out, check: true}), /stale/);
  } finally { f.cleanup(); }
});

test('source-root escape and output symlink aliases fail closed', () => {
  const f = createAtlasFixture();
  try {
    const outside = path.join(f.root, 'outside.h');
    fs.renameSync(path.join(f.inputs, 'worker.h'), outside);
    fs.symlinkSync(outside, path.join(f.inputs, 'worker.h'));
    assert.throws(() => f.build(), /escapes root/);
    fs.symlinkSync(f.inputs, f.out, 'dir');
    assert.throws(() => f.build(), /symlink/);
  } finally { f.cleanup(); }
});

test('CLI rejects unknown options and missing source authority without creating outputs', () => {
  const f = createAtlasFixture();
  try {
    const cli = path.join(skillRoot, 'scripts/build-interface-atlas.mjs');
    assert.throws(() => execFileSync(process.execPath, [cli, f.catalogPath, '--out', f.out], {stdio: 'pipe'}), /source-root/);
    assert.throws(() => execFileSync(process.execPath, [cli, '--surprise'], {stdio: 'pipe'}), /unknown argument/);
    assert.equal(fs.existsSync(f.out), false);
  } finally { f.cleanup(); }
});
