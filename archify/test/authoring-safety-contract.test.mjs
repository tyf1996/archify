import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(__dirname, '..');
const skill = fs.readFileSync(path.join(skillRoot, 'SKILL.md'), 'utf8');
const authoringContract = fs.readFileSync(
  path.join(skillRoot, 'references', 'authoring-contract.md'),
  'utf8',
);
const schemaReadme = fs.readFileSync(path.join(skillRoot, 'schemas', 'README.md'), 'utf8');
const depthAndSemantics = fs.readFileSync(
  path.join(skillRoot, 'references', 'embedded', 'depth-and-semantics.md'),
  'utf8',
);
const evidenceTemplate = fs.readFileSync(
  path.join(skillRoot, 'references', 'embedded', 'evidence-template.md'),
  'utf8',
);

test('semantic relationship labels are preserved and deletion is not a geometry repair', () => {
  for (const [name, source] of [['SKILL.md', skill], ['authoring contract', authoringContract]]) {
    assert.match(source, /Relationship labels are semantic data/i, name);
    assert.match(source, /move the label[\s\S]*adjust the route or spacing[\s\S]*shorten/i, name);
    assert.match(source, /protocol[\s\S]*action[\s\S]*direction[\s\S]*synchronous[\s\S]*asynchronous[\s\S]*cross-boundary mechanism/i, name);
    assert.match(source, /Omit only wording[\s\S]*fully implied by both endpoints/i, name);
    assert.match(source, /Preserve every meaningful label/i, name);
    assert.match(source, /deleting it is not\s+a (?:geometry|spacing) repair/i, name);
  }
});

test('embedded authoring stays question-first, bounded, and profile-safe', () => {
  assert.match(skill, /target-firmware evidence/);
  assert.match(skill, /Inspect the target repository read-only/);
  assert.match(skill, /write only the diagram or its evidence\/delivery materials/);
  assert.match(skill, /missing build artifacts stay unknown/);
  assert.match(skill, /Do not default to building, downloading an SDK, launching a simulator, or accessing\/writing a device/);
  assert.match(skill, /Artifact first/);
  assert.match(skill, /OS name alone never chooses the diagram type/);
  assert.match(skill, /embedded-runtime/);
  assert.match(skill, /delta\/embedded-context-unsupported/);
  assert.match(authoringContract, /execution_context/);
  assert.match(authoringContract, /execution domain/);
  assert.match(authoringContract, /`embedded-runtime` is opt-in/);
  assert.match(authoringContract, /Inspect the target project read-only/);
  assert.match(authoringContract, /Missing build artifacts remain unknown/);
  assert.match(authoringContract, /do not default to building, downloading an SDK, launching a simulator, or accessing\/writing a device/);
  assert.match(authoringContract, /legacy compatibility types[\s\S]*Embedded interface \(A1\)/);
  assert.match(authoringContract, /complete role directory and the `embedded-runtime` execution-entity context matrix/);
  assert.match(schemaReadme, /full embedded role directory adds/);
  assert.match(schemaReadme, /empty `execution_domains` array is rejected by the core validator/);
  assert.match(schemaReadme, /\| `process` \| `linux-user` \|/);
  assert.match(schemaReadme, /Other diagram types do not expand `--repo-root`/);
  assert.match(schemaReadme, /embedded-runtime.*all five diagram types/s);
  assert.match(schemaReadme, /deployment-ownership.*Architecture-only/s);
  assert.match(schemaReadme, /unique non-empty `id`.*non-empty `label`/s);
});

test('embedded Authoring Depth stays separate from Viewer depth and diagram IR', () => {
  for (const source of [skill, depthAndSemantics, authoringContract]) {
    assert.match(source, /Authoring Depth/);
    assert.match(source, /overview/);
    assert.match(source, /mechanism/);
    assert.match(source, /source-interaction/);
    assert.match(source, /MAP[\s\S]*READ[\s\S]*FULL/);
  }
  assert.match(skill, /entities, boundaries, relationships, evidence, and unknowns/);
  assert.match(skill, /at most 12 primary nodes and no minimum/);
  assert.match(skill, /instead of merging independent hardware, execution, buffer\/memory, or recovery entities/);
  assert.match(depthAndSemantics, /不新增图种、Schema 字段或自动证明能力/);
  assert.match(depthAndSemantics, /同一真实实体在不同图中复用相同稳定 ID/);
  assert.match(depthAndSemantics, /data-movement[\s\S]*control[\s\S]*irq-notification[\s\S]*buffer-handoff[\s\S]*recovery/);
  assert.match(evidenceTemplate, /authoringDepth.*不是新增 IR 字段/s);
  assert.match(evidenceTemplate, /Entity inventory/);
  assert.match(evidenceTemplate, /Boundary inventory/);
  assert.match(evidenceTemplate, /Relationship inventory/);
  assert.match(evidenceTemplate, /Unknown／conflict list/);
});

test('guide authoringPlan contract is additive, bounded, and does not claim source verification', () => {
  assert.match(authoringContract, /`archify guide <query> --json` may add a top-level `authoringPlan`/);
  assert.match(authoringContract, /query guidance, not diagram IR/);
  assert.match(authoringContract, /Non-embedded queries and context-only keywords omit it/);
  for (const field of [
    'domain', 'authoringDepth', 'status', 'primaryType', 'matchedSignals',
    'inventory', 'sourceEvidenceRequired', 'prompt', 'clarification',
  ]) {
    assert.match(authoringContract, new RegExp('`' + field + '`'), field);
  }
  assert.match(authoringContract, /embedded\/question-kind-required/);
  assert.match(authoringContract, /does not claim that the guide has verified a repository/);
  assert.match(authoringContract, /16 recipe\/proof IDs, order, static guide data, and start data remain unchanged/);
});

test('schema policy documents the workflow v1/v2 compatibility boundary', () => {
  assert.match(schemaReadme, /Workflow[^\n]*schema versions? 1 and 2/i);
  assert.match(schemaReadme, /other four[^\n]*schema_version[^\n]*1/i);
  assert.doesNotMatch(schemaReadme, /schema_version` is `"const": 1`/);
});

test('deployment ownership stays explicit, fact-backed, and cannot be removed to pass', () => {
  assert.match(skill, /Omit `meta\.engineering_profile` by default/);
  assert.match(skill, /Region.*cluster.*security boundar.*do not.*enable/i);
  assert.match(skill, /production deployment topology.*ownership.*fail-closed deployment review/i);
  assert.match(skill, /must not remove.*engineering profile.*pass validation/i);
});

test('visual-check stays a pending sidecar receipt instead of a polish claim', () => {
  const deliveryContract = fs.readFileSync(
    path.join(skillRoot, 'references', 'delivery-contract.md'),
    'utf8',
  );
  assert.match(skill, /visual-check <output\.html> --json/);
  assert.match(skill, /automated browser evidence[\s\S]*perceptual visual review/i);
  assert.match(skill, /references\/delivery-contract\.md/);
  assert.match(skill, /without (?:rerendering or )?modifying/i);

  assert.match(deliveryContract, /visual-check <output\.html> --json/);
  assert.match(deliveryContract, /1440×900[\s\S]*1600×1000[\s\S]*1920×1080[\s\S]*2048×1320/);
  assert.match(deliveryContract, /visualReview: "pending"/);
  assert.match(deliveryContract, /never changes.*delivered|without (?:rerendering or )?modifying/i);
});
