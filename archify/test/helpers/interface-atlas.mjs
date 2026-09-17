import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildInterfaceAtlas} from '../../scripts/build-interface-atlas.mjs';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export function createAtlasFixture({locale = 'en', allTypes = false} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-interface-atlas-'));
  const inputs = path.join(root, 'inputs');
  const out = path.join(root, 'atlas');
  fs.mkdirSync(inputs);
  const example = path.join(skillRoot, 'examples/interface-atlas');
  fs.copyFileSync(path.join(example, 'worker.h'), path.join(inputs, 'worker.h'));
  const catalog = JSON.parse(fs.readFileSync(path.join(example, 'catalog.json')));
  catalog.locale = locale;
  const specimens = allTypes ? [
    ['architecture', 'examples/interface-atlas/structure.json'],
    ['workflow', 'examples/agent-tool-call.workflow.json'],
    ['sequence', 'examples/cache-miss-request.sequence.json'],
    ['dataflow', 'examples/product-analytics.dataflow.json'],
    ['lifecycle', 'examples/agent-run.lifecycle.json'],
  ] : [['architecture', 'examples/interface-atlas/structure.json']];
  const keys = {architecture: 'components', workflow: 'nodes', sequence: 'participants', dataflow: 'nodes', lifecycle: 'states'};
  catalog.diagrams = specimens.map(([type, file], i) => {
    const spec = JSON.parse(fs.readFileSync(path.join(skillRoot, file)));
    spec.meta.locale = locale;
    const id = allTypes ? type : 'structure';
    const specPath = path.join(inputs, id + '.json');
    fs.writeFileSync(specPath, JSON.stringify(spec, null, 2) + '\n');
    const receipt = execFileSync(process.execPath, [path.join(skillRoot, 'bin/archify.mjs'), 'deliver', type,
      specPath, path.join(inputs, id + '.archify.html'), '--quality', 'showcase', '--json'], {encoding: 'utf8'});
    fs.writeFileSync(path.join(inputs, id + '.archify.delivery.json'), receipt);
    const node = i === 0 ? 'worker' : spec[keys[type]][0].id;
    return {id, title: spec.meta.title, specification: id + '.json', base: id + '.archify.html', delivery: id + '.archify.delivery.json',
      nodes: [{id: node, interfaces: catalog.interfaces.map(f => f.id), note: 'Fixture association, not a new graph edge.'}]};
  });
  const catalogPath = path.join(inputs, 'catalog.json');
  const save = () => fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  save();
  return {root, inputs, out, catalog, catalogPath, save,
    build: (options = {}) => buildInterfaceAtlas({catalogPath, outputDirectory: out, sourceRoot: inputs, ...options}),
    cleanup: () => fs.rmSync(root, {recursive: true, force: true})};
}
