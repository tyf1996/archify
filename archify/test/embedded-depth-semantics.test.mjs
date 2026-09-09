import test from 'node:test';
import assert from 'node:assert/strict';

import { EMBEDDED_DEPTH_FIXTURES } from './fixtures/embedded-depth-semantics.mjs';
import { embeddedDiagnostics } from '../renderers/shared/embedded.mjs';
import { validateSchema } from '../renderers/shared/validator.mjs';

const ENTITY_COLLECTIONS = {
  architecture: 'components',
  workflow: 'nodes',
  sequence: 'participants',
  dataflow: 'nodes',
  lifecycle: 'states',
};
const RELATIONSHIP_COLLECTIONS = {
  architecture: 'connections',
  workflow: 'edges',
  sequence: 'messages',
  dataflow: 'flows',
  lifecycle: 'transitions',
};
const SEMANTIC_ROLES = new Set([
  'data-movement',
  'control',
  'irq-notification',
  'buffer-handoff',
  'recovery',
]);

function entities(view) {
  return view.document[ENTITY_COLLECTIONS[view.type]];
}

function relationships(view) {
  return view.document[RELATIONSHIP_COLLECTIONS[view.type]];
}

function byId(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function identity(entity) {
  return {
    type: entity.type,
    execution_domain: entity.execution_domain,
    execution_context: entity.execution_context,
  };
}

function relationIdentity(relation) {
  return {
    from: relation.from,
    to: relation.to,
    mechanism: relation.mechanism,
  };
}

function crossViewMismatches(bundle) {
  const overviewEntities = byId(entities(bundle.overview));
  const mechanismEntities = byId(entities(bundle.mechanism));
  const overviewRelations = byId(relationships(bundle.overview));
  const mechanismRelations = byId(relationships(bundle.mechanism));
  const problems = [];

  for (const id of bundle.sharedEntities) {
    const overview = overviewEntities.get(id);
    const mechanism = mechanismEntities.get(id);
    if (!overview || !mechanism || JSON.stringify(identity(overview)) !== JSON.stringify(identity(mechanism))) {
      problems.push(`entity:${id}`);
    }
  }
  for (const id of bundle.sharedRelations) {
    const overview = overviewRelations.get(id);
    const mechanism = mechanismRelations.get(id);
    if (!overview || !mechanism || JSON.stringify(relationIdentity(overview)) !== JSON.stringify(relationIdentity(mechanism))) {
      problems.push(`relationship:${id}`);
    }
  }
  return problems;
}

function requiredRelationSet(view) {
  return new Set((view.document.semanticChecks?.requiredRelations || []).map(({ from, to, mechanism }) => (
    `${from}\u0000${to}\u0000${mechanism || ''}`
  )));
}

function relationKey(relation) {
  return `${relation.from}\u0000${relation.to}\u0000${relation.mechanism || ''}`;
}

test('embedded depth fixtures cover Linux, RTOS, bare-metal, and mixed runtime without changing the five schemas', () => {
  assert.deepEqual(
    EMBEDDED_DEPTH_FIXTURES.map(({ environment }) => environment),
    ['linux', 'rtos', 'bare-metal', 'mixed'],
  );

  for (const bundle of EMBEDDED_DEPTH_FIXTURES) {
    assert.equal(bundle.overview.type, 'architecture', bundle.id);
    assert.notEqual(bundle.mechanism.type, undefined, bundle.id);
    for (const view of [bundle.overview, bundle.mechanism]) {
      assert.doesNotThrow(() => validateSchema(view.type, view.document), `${bundle.id}:${view.type}:schema`);
      assert.deepEqual(embeddedDiagnostics(view.type, view.document), [], `${bundle.id}:${view.type}:embedded`);
      assert.equal(view.document.meta.engineering_profile, 'embedded-runtime', `${bundle.id}:${view.type}:profile`);
    }
  }
});

test('cross-view entity and relationship identities stay stable while overview remains bounded', () => {
  for (const bundle of EMBEDDED_DEPTH_FIXTURES) {
    assert.ok(entities(bundle.overview).length <= 12, `${bundle.id}: overview exceeds 12 primary entities`);
    assert.ok(bundle.overviewMainPath.length >= 3, `${bundle.id}: overview main path is too short`);
    assert.ok(bundle.overviewMainPath.length <= 12, `${bundle.id}: overview main path exceeds the overview budget`);
    assert.equal(new Set(bundle.overviewMainPath).size, bundle.overviewMainPath.length, `${bundle.id}: overview main path repeats an entity`);
    const overviewPairs = new Set(relationships(bundle.overview).map(({ from, to }) => `${from}\u0000${to}`));
    for (let index = 1; index < bundle.overviewMainPath.length; index += 1) {
      assert.ok(
        overviewPairs.has(`${bundle.overviewMainPath[index - 1]}\u0000${bundle.overviewMainPath[index]}`),
        `${bundle.id}: overview main path lacks ${bundle.overviewMainPath[index - 1]} -> ${bundle.overviewMainPath[index]}`,
      );
    }
    assert.deepEqual(crossViewMismatches(bundle), [], bundle.id);

    const overviewIds = new Set(entities(bundle.overview).map(({ id }) => id));
    const mechanismIds = new Set(entities(bundle.mechanism).map(({ id }) => id));
    for (const group of bundle.distinctEntities) {
      assert.equal(new Set(group).size, group.length, `${bundle.id}: duplicate stable ID in distinct group`);
      assert.ok(group.every((id) => overviewIds.has(id)), `${bundle.id}: overview merged or omitted a required distinct entity`);
      assert.ok(group.every((id) => mechanismIds.has(id)), `${bundle.id}: mechanism merged or omitted a required distinct entity`);
    }
  }
});

test('cross-view regression detects a changed entity kind instead of accepting name-only identity', () => {
  for (const fixture of EMBEDDED_DEPTH_FIXTURES) {
    const bundle = structuredClone(fixture);
    const target = entities(bundle.mechanism).find(({ id }) => id === bundle.sharedEntities[0]);
    target.type = target.type === 'software' ? 'hardware' : 'software';
    assert.ok(crossViewMismatches(bundle).includes(`entity:${target.id}`), bundle.id);
  }
});

test('semantic roles use separate critical relations covered by requiredRelations', () => {
  const coveredRoles = new Set();
  for (const bundle of EMBEDDED_DEPTH_FIXTURES) {
    const relationIndex = byId(relationships(bundle.mechanism));
    const required = requiredRelationSet(bundle.mechanism);
    const roleRelations = new Set();
    for (const { role, relationId } of bundle.semanticRoles) {
      assert.ok(SEMANTIC_ROLES.has(role), `${bundle.id}:${role}`);
      assert.equal(roleRelations.has(relationId), false, `${bundle.id}:${relationId} must not collapse two semantic roles`);
      roleRelations.add(relationId);
      coveredRoles.add(role);
      const relation = relationIndex.get(relationId);
      assert.ok(relation, `${bundle.id}: missing ${relationId}`);
      assert.ok(relation.mechanism, `${bundle.id}:${relationId}: missing mechanism`);
      assert.ok(required.has(relationKey(relation)), `${bundle.id}:${relationId}: not protected by requiredRelations`);
    }
  }
  assert.deepEqual(coveredRoles, SEMANTIC_ROLES);
});

test('requiredRelations fail when a critical mechanism changes without weakening the authored label', () => {
  for (const fixture of EMBEDDED_DEPTH_FIXTURES) {
    const bundle = structuredClone(fixture);
    const relationId = bundle.semanticRoles[0].relationId;
    const relation = relationships(bundle.mechanism).find(({ id }) => id === relationId);
    const label = relation.label;
    relation.mechanism = relation.mechanism === 'call' ? 'notification' : 'call';
    assert.equal(relation.label, label, bundle.id);
    const codes = new Set(embeddedDiagnostics(bundle.mechanism.type, bundle.mechanism.document).map(({ code }) => code));
    assert.ok(codes.has('embedded/required-relation'), bundle.id);
  }
});

test('fixture evidence gaps remain unknown and never become timing, scheduling, coherence, or safety claims', () => {
  for (const bundle of EMBEDDED_DEPTH_FIXTURES) {
    assert.ok(bundle.unknowns.length > 0, bundle.id);
    for (const unknown of bundle.unknowns) {
      assert.equal(unknown.status, 'unknown', `${bundle.id}:${unknown.item}`);
      assert.ok(unknown.limits.length > 20, `${bundle.id}:${unknown.item}: limits`);
    }
    const source = JSON.stringify(bundle);
    assert.doesNotMatch(
      source,
      /guaranteed real[- ]?time|schedulable|worst[- ]case proven|cache coherent|race free|electrically safe|functionally safe/i,
      bundle.id,
    );
  }
});
