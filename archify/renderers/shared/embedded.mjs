import { throwDiagnosticError } from './diagnostics.mjs';
import { translateMessage } from './i18n.mjs';

export const EMBEDDED_COMPONENT_TYPES = Object.freeze([
  'software',
  'process',
  'thread',
  'task',
  'isr',
  'hardware',
  'buffer',
  'memory',
  'bus',
]);

const EMBEDDED_TYPE_SET = new Set(EMBEDDED_COMPONENT_TYPES);
const EXECUTION_ENTITY_TYPES = new Set(['process', 'thread', 'task', 'isr']);
const CONTEXT_ENVIRONMENT = new Map([
  ['linux-user', 'linux'],
  ['linux-kernel', 'linux'],
  ['linux-irq', 'linux'],
  ['rtos-task', 'rtos'],
  ['rtos-isr', 'rtos'],
  ['bare-main', 'bare-metal'],
  ['bare-isr', 'bare-metal'],
]);
const CONTEXTS_BY_KIND = new Map([
  ['process', new Set(['linux-user'])],
  ['thread', new Set(['linux-user', 'linux-kernel', 'rtos-task'])],
  ['task', new Set(['linux-user', 'linux-kernel', 'rtos-task'])],
  ['isr', new Set(['linux-irq', 'rtos-isr', 'bare-isr'])],
]);

const SEMANTIC_COLLECTIONS = {
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function diagnostic(code, message, subject, evidence, supportedFixes) {
  return {
    code,
    severity: 'error',
    message,
    subject,
    evidence,
    supportedFixes,
  };
}

function domainsFor(diagram) {
  return asArray(diagram.execution_domains);
}

export function executionDomainMap(diagram) {
  return new Map(domainsFor(diagram).map((domain) => [domain.id, domain]));
}

export function hasEmbeddedComponentTypes(items) {
  return asArray(items).some((item) => EMBEDDED_TYPE_SET.has(item?.type));
}

export function embeddedNodeHeight(node, authoredHeight, ordinaryHeight) {
  if (!node?.execution_domain && !node?.execution_context) return authoredHeight;
  return Math.max(authoredHeight, ordinaryHeight + 16);
}

export function executionContextLabel(locale, context) {
  if (!context) return '';
  return translateMessage(locale, `embedded.context.${context}`);
}

export function relationMechanismLabel(locale, mechanism) {
  if (!mechanism) return '';
  return translateMessage(locale, `embedded.mechanism.${mechanism}`);
}

export function relationDisplayLabel(relation, locale) {
  const label = typeof relation?.label === 'string' ? relation.label : '';
  const mechanism = relationMechanismLabel(locale, relation?.mechanism);
  if (mechanism && label) return `${mechanism} · ${label}`;
  return mechanism || label;
}

export function embeddedNodeDetail(diagram, node, locale) {
  const domain = node?.execution_domain ? executionDomainMap(diagram).get(node.execution_domain) : null;
  const domainLabel = domain?.label || node?.execution_domain || '';
  const contextLabel = executionContextLabel(locale, node?.execution_context);
  return [domainLabel, contextLabel].filter(Boolean).join(' · ');
}

export function embeddedNodeMetadata(diagram, node, locale) {
  const domain = node?.execution_domain ? executionDomainMap(diagram).get(node.execution_domain) : null;
  return {
    executionDomain: node?.execution_domain,
    executionDomainLabel: domain?.label,
    executionContext: node?.execution_context,
    embeddedDetail: embeddedNodeDetail(diagram, node, locale),
  };
}

export function embeddedDiagnostics(diagramType, diagram) {
  const diagnostics = [];
  const semanticCollection = SEMANTIC_COLLECTIONS[diagramType];
  const relationshipCollection = RELATIONSHIP_COLLECTIONS[diagramType];
  const nodes = asArray(diagram?.[semanticCollection]);
  const relationships = asArray(diagram?.[relationshipCollection]);
  const domains = domainsFor(diagram);
  const domainIndex = new Map();

  domains.forEach((domain, index) => {
    if (domainIndex.has(domain.id)) {
      diagnostics.push(diagnostic(
        'embedded/domain-id-duplicate',
        `Execution domain ${JSON.stringify(domain.id)} is declared more than once.`,
        { diagramType, collection: 'execution_domains', index, id: domain.id, path: `/execution_domains/${index}/id` },
        { id: domain.id, firstIndex: domainIndex.get(domain.id).index, duplicateIndex: index },
        ['give every execution domain a unique stable id'],
      ));
    } else {
      domainIndex.set(domain.id, { ...domain, index });
    }
  });

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  nodes.forEach((node, index) => {
    const path = `/${semanticCollection}/${index}`;
    if (node.execution_context && !node.execution_domain) {
      diagnostics.push(diagnostic(
        'embedded/execution-owner',
        `Node ${JSON.stringify(node.id)} declares execution_context without an execution_domain.`,
        { diagramType, collection: semanticCollection, index, id: node.id, path },
        { executionContext: node.execution_context, executionDomain: null },
        [`set ${path}/execution_domain to the real declared execution domain`],
      ));
    }
    if (node.execution_domain && !domainIndex.has(node.execution_domain)) {
      diagnostics.push(diagnostic(
        'embedded/domain-reference',
        `Node ${JSON.stringify(node.id)} references unknown execution domain ${JSON.stringify(node.execution_domain)}.`,
        { diagramType, collection: semanticCollection, index, id: node.id, path: `${path}/execution_domain` },
        { executionDomain: node.execution_domain, availableDomains: [...domainIndex.keys()] },
        ['declare the referenced execution domain or correct the node reference'],
      ));
    }
    const expectedEnvironment = CONTEXT_ENVIRONMENT.get(node.execution_context);
    const domain = domainIndex.get(node.execution_domain);
    if (expectedEnvironment && domain && domain.environment !== expectedEnvironment) {
      diagnostics.push(diagnostic(
        'embedded/context-environment',
        `Node ${JSON.stringify(node.id)} uses ${JSON.stringify(node.execution_context)} in a ${JSON.stringify(domain.environment)} execution domain.`,
        { diagramType, collection: semanticCollection, index, id: node.id, path: `${path}/execution_context` },
        { executionContext: node.execution_context, executionDomain: domain.id, actualEnvironment: domain.environment, expectedEnvironment },
        ['use the context that matches the declared environment or correct the execution-domain reference'],
      ));
    }
  });

  for (const [index, required] of asArray(diagram?.semanticChecks?.requiredRelations).entries()) {
    const path = `/semanticChecks/requiredRelations/${index}`;
    const missingEndpoints = ['from', 'to'].filter((key) => !nodesById.has(required[key]));
    if (missingEndpoints.length) {
      diagnostics.push(diagnostic(
        'embedded/required-relation',
        `Required relation ${JSON.stringify(required.from)} -> ${JSON.stringify(required.to)} references an unknown node.`,
        { diagramType, collection: 'semanticChecks.requiredRelations', index, path },
        { missingEndpoints, from: required.from, to: required.to, availableNodeIds: [...nodesById.keys()] },
        ['correct the required relation to reference existing node ids'],
      ));
      continue;
    }
    const match = relationships.some((relationship) => (
      relationship.from === required.from
      && relationship.to === required.to
      && (required.mechanism === undefined || relationship.mechanism === required.mechanism)
    ));
    if (!match) {
      diagnostics.push(diagnostic(
        'embedded/required-relation',
        `Required relation ${JSON.stringify(required.from)} -> ${JSON.stringify(required.to)} is not present with the declared mechanism.`,
        { diagramType, collection: 'semanticChecks.requiredRelations', index, path },
        { from: required.from, to: required.to, mechanism: required.mechanism ?? null, authoredRelationCount: relationships.length },
        [`add the exact authored relation ${JSON.stringify(required.from)} -> ${JSON.stringify(required.to)} with the declared mechanism`],
      ));
    }
  }

  if (diagram?.meta?.engineering_profile !== 'embedded-runtime') return diagnostics;

  nodes.forEach((node, index) => {
    if (!EXECUTION_ENTITY_TYPES.has(node.type)) return;
    const path = `/${semanticCollection}/${index}`;
    const missing = [];
    if (!node.execution_domain) missing.push('execution_domain');
    if (!node.execution_context) missing.push('execution_context');
    if (missing.length) {
      diagnostics.push(diagnostic(
        'embedded/execution-owner',
        `Execution entity ${JSON.stringify(node.id)} is missing required execution ownership.`,
        { diagramType, profile: 'embedded-runtime', collection: semanticCollection, index, id: node.id, path },
        { entityType: node.type, missing },
        missing.map((field) => `set ${path}/${field} from the target system evidence`),
      ));
      return;
    }
    if (node.execution_context === 'unknown') {
      diagnostics.push(diagnostic(
        'embedded/unknown-required-fact',
        `Execution entity ${JSON.stringify(node.id)} has an unknown context required by embedded-runtime.`,
        { diagramType, profile: 'embedded-runtime', collection: semanticCollection, index, id: node.id, path: `${path}/execution_context` },
        { entityType: node.type, executionDomain: node.execution_domain, executionContext: node.execution_context },
        ['establish the real execution context from the target configuration or implementation'],
      ));
      return;
    }
    const allowed = CONTEXTS_BY_KIND.get(node.type);
    if (allowed && !allowed.has(node.execution_context)) {
      diagnostics.push(diagnostic(
        'embedded/context-kind',
        `Execution entity ${JSON.stringify(node.id)} of type ${JSON.stringify(node.type)} cannot use context ${JSON.stringify(node.execution_context)} in embedded-runtime.`,
        { diagramType, profile: 'embedded-runtime', collection: semanticCollection, index, id: node.id, path: `${path}/execution_context` },
        { entityType: node.type, executionContext: node.execution_context, supportedContexts: [...allowed] },
        ['use the execution entity type and context that match the target execution model'],
      ));
    }
  });

  relationships.forEach((relationship, index) => {
    const from = nodesById.get(relationship.from);
    const to = nodesById.get(relationship.to);
    if (!from || !to) return;
    const domainsDiffer = from.execution_domain && to.execution_domain
      && from.execution_domain !== to.execution_domain;
    const contextsDiffer = from.execution_context && to.execution_context
      && from.execution_context !== 'unknown' && to.execution_context !== 'unknown'
      && from.execution_context !== to.execution_context;
    if ((!domainsDiffer && !contextsDiffer) || relationship.mechanism) return;
    diagnostics.push(diagnostic(
      'embedded/mechanism-required',
      `Cross-context relation ${JSON.stringify(relationship.id || `${relationship.from}->${relationship.to}`)} does not declare its mechanism.`,
      { diagramType, profile: 'embedded-runtime', collection: relationshipCollection, index, id: relationship.id, path: `/${relationshipCollection}/${index}/mechanism` },
      {
        from: relationship.from,
        to: relationship.to,
        fromDomain: from.execution_domain ?? null,
        toDomain: to.execution_domain ?? null,
        fromContext: from.execution_context ?? null,
        toContext: to.execution_context ?? null,
      },
      [`set /${relationshipCollection}/${index}/mechanism to the authored cross-context mechanism`],
    ));
  });

  return diagnostics;
}

export function validateEmbeddedContracts(diagramType, diagram) {
  const diagnostics = embeddedDiagnostics(diagramType, diagram);
  if (!diagnostics.length) return;
  throwDiagnosticError(
    `Embedded contract validation failed:\n${diagnostics.map((entry) => `- ${entry.message}`).join('\n')}`,
    diagnostics,
  );
}
