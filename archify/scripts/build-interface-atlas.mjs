#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {atlasUi, interfaceMarkup, nodeInterfaceRuntime} from '../assets/interface-atlas/viewer.mjs';
import {renderDocuments} from '../assets/interface-atlas/documents.mjs';

const script = fileURLToPath(import.meta.url);
const assetRoot = path.resolve(path.dirname(script), '../assets/interface-atlas');
const receiptName = 'interface-atlas.receipt.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = value => value.replace(/\r\n?/g, '\n').trim();
const json = value => JSON.stringify(value, null, 2) + '\n';
const fail = message => { throw new Error('interface-atlas: ' + message); };
const text = (v, at, empty = false) => {
  if (typeof v !== 'string' || (!empty && !v.trim())) fail(at + ' must be a string' + (empty ? '' : ' with content'));
};
const id = (v, at) => {
  if (typeof v !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(v)) fail(at + ' must be a stable ID');
};
const object = (v, required, optional, at) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail(at + ' must be an object');
  for (const k of required) if (!Object.hasOwn(v, k)) fail(at + '.' + k + ' is required');
  for (const k of Object.keys(v)) if (![...required, ...optional].includes(k)) fail('unknown field ' + at + '.' + k);
};
const array = (v, at, nonempty = false) => {
  if (!Array.isArray(v) || (nonempty && !v.length)) fail(at + ' must be ' + (nonempty ? 'a nonempty' : 'an') + ' array');
};
const unique = (values, at) => {
  if (new Set(values).size !== values.length) fail('duplicate ' + at);
};
const localPath = (v, at) => {
  text(v, at);
  if (path.isAbsolute(v) || /[\\:\u0000-\u001f]/.test(v) || v.split('/').includes('..')) fail(at + ' must stay within its input root');
};
function span(v, at) {
  object(v, ['source', 'startLine', 'endLine'], ['label'], at);
  id(v.source, at + '.source');
  if (!Number.isSafeInteger(v.startLine) || !Number.isSafeInteger(v.endLine) || v.startLine < 1 || v.endLine < v.startLine) fail('invalid source span ' + at);
  if (v.label !== undefined) text(v.label, at + '.label');
}

// Deliberately small runtime validator for this sidecar, not a diagram-schema fork.
export function validateCatalog(c) {
  object(c, ['version', 'title', 'locale', 'interfaces', 'diagrams'], ['context', 'sources'], 'catalog');
  if (c.version !== 1) fail('unsupported catalog version');
  if (!['en', 'zh-CN'].includes(c.locale)) fail('locale must be en or zh-CN');
  text(c.title, 'title');
  if (c.context !== undefined) text(c.context, 'context', true);
  array(c.sources === undefined ? [] : c.sources, 'sources');
  for (const s of c.sources || []) {
    object(s, ['id', 'path', 'sha256'], [], 'source');
    id(s.id, 'source.id'); localPath(s.path, 'source.path');
    if (typeof s.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(s.sha256)) fail('source.sha256 must be a full SHA-256');
  }
  unique((c.sources || []).map(s => s.id), 'source IDs');
  array(c.interfaces, 'interfaces', true);
  for (const f of c.interfaces) {
    object(f, ['id', 'name', 'kind', 'summary', 'signature', 'parameters', 'returns'], ['callers', 'calls', 'notes', 'sources', 'signatureSource'], 'interface');
    id(f.id, 'interface.id');
    for (const k of ['name', 'kind', 'summary', 'signature', 'returns']) text(f[k], f.id + '.' + k);
    for (const k of ['parameters', 'callers', 'calls', 'notes']) {
      if (f[k] !== undefined) { array(f[k], f.id + '.' + k); f[k].forEach(v => text(v, f.id + '.' + k)); }
    }
    array(f.sources === undefined ? [] : f.sources, f.id + '.sources');
    (f.sources || []).forEach(v => span(v, f.id + '.sources'));
    if (f.signatureSource !== undefined) span(f.signatureSource, f.id + '.signatureSource');
  }
  unique(c.interfaces.map(f => f.id), 'interface IDs');
  array(c.diagrams, 'diagrams', true);
  for (const d of c.diagrams) {
    object(d, ['id', 'title', 'specification', 'base', 'delivery', 'nodes'], [], 'diagram');
    id(d.id, 'diagram.id'); text(d.title, d.id + '.title');
    if (['index', 'interfaces'].includes(d.id.toLowerCase())) fail('reserved diagram ID ' + d.id);
    for (const k of ['specification', 'base', 'delivery']) localPath(d[k], d.id + '.' + k);
    if (!d.specification.endsWith('.json') || !d.base.endsWith('.html') || !d.delivery.endsWith('.json')) fail('unexpected input extension for ' + d.id);
    array(d.nodes, d.id + '.nodes', true);
    for (const n of d.nodes) {
      object(n, ['id', 'interfaces'], ['note'], d.id + '.node');
      id(n.id, 'node.id'); array(n.interfaces, 'node.interfaces', true);
      n.interfaces.forEach(v => id(v, 'node.interfaces'));
      unique(n.interfaces, 'interface references for ' + n.id);
      if (n.note !== undefined) text(n.note, n.id + '.note', true);
    }
    unique(d.nodes.map(n => n.id), 'node IDs in ' + d.id);
  }
  unique(c.diagrams.map(d => d.id.toLowerCase()), 'diagram IDs (case-insensitive filenames)');
  const ids = new Set(c.interfaces.map(f => f.id));
  const used = new Set(c.diagrams.flatMap(d => d.nodes.flatMap(n => n.interfaces)));
  for (const ref of used) if (!ids.has(ref)) fail('unknown interface reference ' + ref);
  for (const ref of ids) if (!used.has(ref)) fail('unmapped interface ' + ref);
  return c;
}

function within(root, relative) {
  const target = fs.realpathSync(path.resolve(root, relative));
  const rel = path.relative(root, target);
  if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) fail('input symlink escapes root: ' + relative);
  if (!fs.statSync(target).isFile()) fail('input is not a regular file: ' + relative);
  return target;
}
function noSymlinks(target) {
  for (let current = target; ; current = path.dirname(current)) {
    try { if (fs.lstatSync(current).isSymbolicLink()) fail('output path uses a symlink: ' + current); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (path.dirname(current) === current) break;
  }
}
export const svgOf = html => {
  const matches = html.match(/<svg\b[\s\S]*?<\/svg>/g);
  if (matches?.length !== 1) fail('native base must contain exactly one canonical SVG');
  return matches[0];
};
const safeJson = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const hrefPath = value => value.split(path.sep).map(s =>
  encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())).join('/');

export function buildInterfaceAtlas({catalogPath, outputDirectory, sourceRoot, check = false}) {
  if (!catalogPath || !outputDirectory) fail('catalog path and --out are required');
  const manifestPath = fs.realpathSync(path.resolve(catalogPath));
  const inputRoot = path.dirname(manifestPath);
  const out = path.resolve(outputDirectory);
  noSymlinks(out);
  const catalogBytes = fs.readFileSync(manifestPath);
  const catalog = validateCatalog(JSON.parse(catalogBytes));
  const inputs = new Map([[manifestPath, catalogBytes]]);
  const read = (root, p) => {
    const actual = within(root, p);
    if (!inputs.has(actual)) inputs.set(actual, fs.readFileSync(actual));
    return {actual, bytes: inputs.get(actual)};
  };
  const bind = (actual, bytes) => ({path: path.relative(out, actual).split(path.sep).join('/'), sha256: hash(bytes), bytes: bytes.length});
  const sourceFiles = new Map();
  if (catalog.sources?.length && !sourceRoot) fail('--source-root is required for source checks');
  const resolvedSourceRoot = sourceRoot ? fs.realpathSync(path.resolve(sourceRoot)) : null;
  for (const s of catalog.sources || []) {
    const snapshot = read(resolvedSourceRoot, s.path);
    if (hash(snapshot.bytes) !== s.sha256) fail('stale source SHA-256: ' + s.path);
    const lines = snapshot.bytes.toString('utf8').replace(/\r\n?/g, '\n').split('\n');
    if (lines.at(-1) === '') lines.pop();
    sourceFiles.set(s.id, {...s, ...snapshot, lines});
  }
  const resolveSpan = s => {
    const file = sourceFiles.get(s.source);
    if (!file || s.endLine > file.lines.length) fail('missing source or out-of-range span: ' + s.source);
    return {...s, path: file.path, href: hrefPath(path.relative(out, file.actual)) + '#L' + s.startLine,
      excerpt: file.lines.slice(s.startLine - 1, s.endLine).join('\n')};
  };
  const verifiedSignatures = [];
  const interfaces = catalog.interfaces.map(f => {
    if (f.signatureSource) {
      const checked = resolveSpan(f.signatureSource);
      if (normalize(checked.excerpt) !== normalize(f.signature)) fail('signature does not match source span: ' + f.id);
      verifiedSignatures.push(f.id);
    }
    const spans = [...(f.sources || [])];
    if (f.signatureSource && !spans.some(s => s.source === f.signatureSource.source && s.startLine === f.signatureSource.startLine && s.endLine === f.signatureSource.endLine)) spans.push(f.signatureSource);
    return {...f, callers: f.callers || [], calls: f.calls || [], notes: f.notes || [],
      sources: spans.map(s => { const {excerpt, ...link} = resolveSpan(s); return link; })};
  });
  const interfaceMap = new Map(interfaces.map(f => [f.id, f]));
  const assetPaths = ['viewer.mjs', 'viewer.css', 'documents.mjs', 'catalog.schema.json'].map(p => path.join(assetRoot, p));
  const assets = [...assetPaths, script].map(actual => {
    const bytes = fs.readFileSync(actual); inputs.set(actual, bytes); return bind(actual, bytes);
  });
  const styles = fs.readFileSync(path.join(assetRoot, 'viewer.css'), 'utf8');
  const files = new Map();
  const diagrams = [];
  const bases = [];
  const collection = {architecture: 'components', workflow: 'nodes', sequence: 'participants', dataflow: 'nodes', lifecycle: 'states'};
  for (const d of catalog.diagrams) {
    const specification = read(inputRoot, d.specification);
    const base = read(inputRoot, d.base);
    const delivery = read(inputRoot, d.delivery);
    const spec = JSON.parse(specification.bytes);
    const receipt = JSON.parse(delivery.bytes);
    const v = receipt.validation;
    if (!receipt.ok || receipt.command !== 'deliver' || receipt.type !== spec.diagram_type ||
      receipt.specification?.sha256 !== hash(specification.bytes) || receipt.specification?.bytes !== specification.bytes.length ||
      receipt.artifact?.sha256 !== hash(base.bytes) || receipt.artifact?.bytes !== base.bytes.length ||
      v?.checksPassed !== 9 || v?.checkCount !== 9 || v?.compositionProfile !== 'showcase' || v?.compositionStatus !== 'pass' || v?.errors !== 0 || v?.warnings !== 0) fail('untrusted or stale 9/9 native delivery: ' + d.id);
    if ((spec.meta?.locale || 'en') !== catalog.locale) fail('catalog and native viewer locale differ: ' + d.id);
    const entities = spec[collection[spec.diagram_type]];
    if (!Array.isArray(entities)) fail('unsupported diagram entity collection: ' + d.id);
    const nodeMap = new Map(entities.map(n => [n.id, n]));
    const html = base.bytes.toString('utf8');
    if (html.includes('id="aia-data"') || !html.includes('id="btn-export"')) fail('already enriched or unsupported native viewer: ' + d.id);
    const svg = svgOf(html);
    const renderedIds = Array.from(svg.matchAll(/\bdata-node-id="([^"]+)"/g), m => m[1]);
    const nodes = d.nodes.map(n => {
      const entity = nodeMap.get(n.id);
      if (!entity || renderedIds.filter(id => id === n.id).length !== 1) fail('node missing or ambiguous in native SVG: ' + d.id + '/' + n.id);
      const apiTag = ((entity.tag || '') + ' ' + (entity.sublabel || '')).match(/\bAPI (\d+)\b/);
      if (apiTag && Number(apiTag[1]) !== n.interfaces.length) fail('stale API count for ' + d.id + '/' + n.id);
      return {...n, label: entity.label, note: n.note || ''};
    });
    const used = new Set(nodes.flatMap(n => n.interfaces));
    const data = {id: d.id, title: d.title, locale: catalog.locale, context: catalog.context || '', nodes,
      interfaces: [...used].map(id => interfaceMap.get(id))};
    const head = '<style id="aia-styles">\n' + styles + '\n</style>\n';
    const tail = '\n<!-- Optional derived interface reader; native delivery remains separate. -->\n<script type="application/json" id="aia-data">' +
      safeJson(data) + '</script>\n<script id="aia-runtime">(' + nodeInterfaceRuntime.toString() +
      ')(JSON.parse(document.getElementById("aia-data").textContent),' + safeJson(atlasUi[catalog.locale]) + ',' + interfaceMarkup.toString() + ');</script>\n';
    if ((html.match(/<\/head>/g) || []).length !== 1 || (html.match(/<\/body>/g) || []).length !== 1) fail('unsupported HTML envelope: ' + d.id);
    const enriched = html.replace('</head>', () => head + '</head>').replace('</body>', () => tail + '</body>');
    if (svgOf(enriched) !== svg) fail('canonical SVG changed: ' + d.id);
    files.set(d.id + '.html', Buffer.from(enriched));
    diagrams.push({...data, type: spec.diagram_type});
    bases.push({id: d.id, type: spec.diagram_type, specification: bind(specification.actual, specification.bytes),
      base: bind(base.actual, base.bytes), delivery: bind(delivery.actual, delivery.bytes),
      svgSha256: hash(svg), canonicalSvgUnchanged: true, nodes: nodes.length, interfaces: used.size});
  }
  const data = {title: catalog.title, locale: catalog.locale, context: catalog.context || '', interfaces, diagrams};
  for (const [name, body] of Object.entries(renderDocuments(data, styles))) files.set(name, Buffer.from(body));
  const outputs = [...files].map(([name, bytes]) => ({path: name, sha256: hash(bytes), bytes: bytes.length}));
  const receipt = {format: 'archify-interface-atlas-v1', status: 'pass', evidenceKind: 'deterministic-derived-interface-atlas',
    catalog: bind(manifestPath, catalogBytes), assets, sources: [...sourceFiles.values()].map(s => bind(s.actual, s.bytes)),
    signatureChecks: {verified: verifiedSignatures, authoredOnly: interfaces.filter(f => !verifiedSignatures.includes(f.id)).map(f => f.id)},
    bases, outputs, coverage: {diagrams: diagrams.length, nodes: diagrams.reduce((n, d) => n + d.nodes.length, 0), interfaces: interfaces.length},
    limits: ['Native 9/9 delivery applies only to the separately preserved base HTML, not these derived readers.',
      'SHA-256 and explicit signature spans are mechanically checked; descriptions, calls and authored provenance are not semantic or Git-revision validation.',
      'Canonical SVG strings are unchanged. Browser behavior, exports and perceptual review require separate evidence.',
      'No source files were copied, built or executed.']};
  files.set(receiptName, Buffer.from(json(receipt)));
  for (const name of files.keys()) {
    const target = path.join(out, name);
    noSymlinks(target);
    if (inputs.has(target) || (fs.existsSync(target) && inputs.has(fs.realpathSync(target)))) fail('output aliases an input: ' + target);
  }
  if (check) {
    for (const [name, bytes] of files) {
      if (!fs.existsSync(path.join(out, name)) || !fs.readFileSync(path.join(out, name)).equals(bytes)) fail('stale or missing generated file: ' + name);
    }
    return receipt;
  }
  if (fs.existsSync(out) && fs.readdirSync(out).length) {
    const previousPath = path.join(out, receiptName);
    if (!fs.existsSync(previousPath)) fail('refusing to overwrite a nonempty unrelated output directory');
    const previous = JSON.parse(fs.readFileSync(previousPath));
    if (previous.format !== receipt.format || !Array.isArray(previous.outputs)) fail('unrecognized previous output receipt');
    const expectedNames = [...files.keys()].filter(n => n !== receiptName).sort();
    if (JSON.stringify(previous.outputs.map(o => o.path).sort()) !== JSON.stringify(expectedNames)) fail('output set changed; choose a new output directory');
    for (const o of previous.outputs) {
      const target = path.join(out, o.path);
      if (!fs.existsSync(target) || hash(fs.readFileSync(target)) !== o.sha256) fail('generated file was edited; choose a new output directory: ' + o.path);
    }
  }
  fs.mkdirSync(out, {recursive: true});
  for (const [name, bytes] of files) {
    const target = path.join(out, name);
    const temp = target + '.' + randomBytes(8).toString('hex') + '.tmp';
    try { fs.writeFileSync(temp, bytes, {flag: 'wx'}); fs.renameSync(temp, target); }
    finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  }
  return receipt;
}

if (process.argv[1] && path.resolve(process.argv[1]) === script) {
  try {
    const args = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--check') options.check = true;
      else if (['--out', '--source-root'].includes(args[i])) {
        const key = args[i] === '--out' ? 'outputDirectory' : 'sourceRoot';
        if (!args[i + 1] || args[i + 1].startsWith('--') || options[key]) fail('missing or repeated option ' + args[i]);
        options[key] = args[++i];
      } else if (!options.catalogPath && !args[i].startsWith('--')) options.catalogPath = args[i];
      else fail('unknown argument ' + args[i]);
    }
    const receipt = buildInterfaceAtlas(options);
    process.stdout.write(json({status: receipt.status, mode: options.check ? 'check' : 'build', ...receipt.coverage, receipt: path.resolve(options.outputDirectory, receiptName)}));
  } catch (error) {
    process.stderr.write(error.message + '\n');
    process.exitCode = 1;
  }
}
