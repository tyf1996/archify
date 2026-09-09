function requiredRelations(relations) {
  return relations.map(({ from, to, mechanism }) => ({ from, to, mechanism }));
}

function architecture({ title, domains, components, connections, boundaries = [] }) {
  return {
    schema_version: 1,
    diagram_type: 'architecture',
    meta: { title, engineering_profile: 'embedded-runtime' },
    execution_domains: domains,
    components,
    boundaries,
    connections,
    semanticChecks: { requiredRelations: requiredRelations(connections) },
  };
}

function dataflow({ title, domains, stages, nodes, flows }) {
  return {
    schema_version: 1,
    diagram_type: 'dataflow',
    meta: { title, engineering_profile: 'embedded-runtime' },
    execution_domains: domains,
    stages: stages.map((label) => ({ label })),
    nodes,
    flows,
    semanticChecks: { requiredRelations: requiredRelations(flows) },
  };
}

function sequence({ title, domains, participants, messages }) {
  return {
    schema_version: 1,
    diagram_type: 'sequence',
    meta: { title, engineering_profile: 'embedded-runtime' },
    execution_domains: domains,
    participants,
    messages,
    semanticChecks: { requiredRelations: requiredRelations(messages) },
  };
}

function workflow({ title, domains, lanes, nodes, edges }) {
  return {
    schema_version: 2,
    diagram_type: 'workflow',
    meta: { title, engineering_profile: 'embedded-runtime' },
    execution_domains: domains,
    lanes,
    nodes,
    edges,
    semanticChecks: { requiredRelations: requiredRelations(edges) },
  };
}

const linuxDomains = [
  { id: 'linuxIo', label: 'Linux I/O domain', environment: 'linux', runtime: 'Linux' },
];
const linuxComponents = [
  { id: 'inputDevice', type: 'hardware', label: 'Input device', execution_domain: 'linuxIo', execution_context: 'hardware', pos: [60, 100] },
  { id: 'dmaEngine', type: 'hardware', label: 'DMA engine', execution_domain: 'linuxIo', execution_context: 'hardware', pos: [260, 100] },
  { id: 'kernelModule', type: 'software', label: 'Kernel module', execution_domain: 'linuxIo', execution_context: 'linux-kernel', pos: [260, 260] },
  { id: 'kernelBuffer', type: 'buffer', label: 'Kernel buffer', execution_domain: 'linuxIo', execution_context: 'linux-kernel', pos: [460, 100] },
  { id: 'serviceProcess', type: 'process', label: 'Service process', execution_domain: 'linuxIo', execution_context: 'linux-user', pos: [660, 100] },
  { id: 'recoveryManager', type: 'software', label: 'Recovery manager', execution_domain: 'linuxIo', execution_context: 'linux-kernel', pos: [460, 260] },
];
const linuxRelations = [
  { id: 'inputDevice-dmaEngine-samples', from: 'inputDevice', to: 'dmaEngine', label: 'sample stream', mechanism: 'bus' },
  { id: 'serviceProcess-kernelModule-request', from: 'serviceProcess', to: 'kernelModule', label: 'request input', mechanism: 'system-call' },
  { id: 'kernelModule-dmaEngine-start', from: 'kernelModule', to: 'dmaEngine', label: 'start transfer', mechanism: 'call' },
  { id: 'dmaEngine-kernelBuffer-transfer', from: 'dmaEngine', to: 'kernelBuffer', label: 'move samples', mechanism: 'dma' },
  { id: 'dmaEngine-kernelModule-complete', from: 'dmaEngine', to: 'kernelModule', label: 'transfer complete', mechanism: 'notification' },
  { id: 'kernelBuffer-serviceProcess-deliver', from: 'kernelBuffer', to: 'serviceProcess', label: 'deliver buffered sample', mechanism: 'data-transfer' },
  { id: 'kernelModule-recoveryManager-recover', from: 'kernelModule', to: 'recoveryManager', label: 'request recovery', mechanism: 'lifecycle-control' },
];

const rtosDomains = [
  { id: 'rtosControl', label: 'RTOS control domain', environment: 'rtos', runtime: 'RTOS' },
];
const rtosEntities = [
  { id: 'eventSource', type: 'hardware', label: 'Event source', execution_domain: 'rtosControl', execution_context: 'hardware' },
  { id: 'isrHandler', type: 'isr', label: 'ISR handler', execution_domain: 'rtosControl', execution_context: 'rtos-isr' },
  { id: 'eventQueue', type: 'buffer', label: 'Event queue', execution_domain: 'rtosControl', execution_context: 'rtos-task' },
  { id: 'workerTask', type: 'task', label: 'Worker task', execution_domain: 'rtosControl', execution_context: 'rtos-task' },
  { id: 'recoveryTask', type: 'task', label: 'Recovery task', execution_domain: 'rtosControl', execution_context: 'rtos-task' },
];
const rtosRelations = [
  { id: 'eventSource-isrHandler-notify', from: 'eventSource', to: 'isrHandler', label: 'event ready', mechanism: 'irq' },
  { id: 'isrHandler-eventQueue-enqueue', from: 'isrHandler', to: 'eventQueue', label: 'try enqueue', mechanism: 'task-sync' },
  { id: 'eventQueue-workerTask-deliver', from: 'eventQueue', to: 'workerTask', label: 'deliver accepted event', mechanism: 'task-sync' },
  { id: 'workerTask-eventSource-complete', from: 'workerTask', to: 'eventSource', label: 'processing complete', mechanism: 'notification' },
  { id: 'eventQueue-recoveryTask-recover', from: 'eventQueue', to: 'recoveryTask', label: 'request recovery when rejected', mechanism: 'notification' },
];

const bareDomains = [
  { id: 'bareControl', label: 'Bare-metal control domain', environment: 'bare-metal', runtime: 'Control firmware' },
];
const bareEntities = [
  { id: 'resetHandler', type: 'software', label: 'Reset handler', execution_domain: 'bareControl', execution_context: 'boot' },
  { id: 'tickSource', type: 'hardware', label: 'Event timer', execution_domain: 'bareControl', execution_context: 'hardware' },
  { id: 'timerIsr', type: 'isr', label: 'Timer ISR', execution_domain: 'bareControl', execution_context: 'bare-isr' },
  { id: 'dmaEngine', type: 'hardware', label: 'DMA engine', execution_domain: 'bareControl', execution_context: 'hardware' },
  { id: 'sampleBuffer', type: 'buffer', label: 'Sample buffer', execution_domain: 'bareControl', execution_context: 'bare-main' },
  { id: 'mainLoop', type: 'software', label: 'Main loop', execution_domain: 'bareControl', execution_context: 'bare-main' },
  { id: 'safeState', type: 'software', label: 'Safe state', execution_domain: 'bareControl', execution_context: 'bare-main' },
];
const bareRelations = [
  { id: 'resetHandler-mainLoop-enter', from: 'resetHandler', to: 'mainLoop', label: 'enter initialized loop', mechanism: 'call' },
  { id: 'tickSource-timerIsr-notify', from: 'tickSource', to: 'timerIsr', label: 'period event', mechanism: 'irq' },
  { id: 'timerIsr-dmaEngine-start', from: 'timerIsr', to: 'dmaEngine', label: 'start transfer', mechanism: 'call' },
  { id: 'dmaEngine-sampleBuffer-transfer', from: 'dmaEngine', to: 'sampleBuffer', label: 'move samples', mechanism: 'dma' },
  { id: 'dmaEngine-timerIsr-complete', from: 'dmaEngine', to: 'timerIsr', label: 'transfer complete', mechanism: 'notification' },
  { id: 'sampleBuffer-mainLoop-deliver', from: 'sampleBuffer', to: 'mainLoop', label: 'handoff available samples', mechanism: 'data-transfer' },
  { id: 'timerIsr-safeState-recover', from: 'timerIsr', to: 'safeState', label: 'enter recovery state', mechanism: 'lifecycle-control' },
];

const mixedDomains = [
  { id: 'hostDomain', label: 'Host domain', environment: 'linux', runtime: 'Linux' },
  { id: 'controlDomain', label: 'Control domain', environment: 'rtos', runtime: 'RTOS' },
];
const mixedEntities = [
  { id: 'hostProcess', type: 'process', label: 'Host process', execution_domain: 'hostDomain', execution_context: 'linux-user' },
  { id: 'controlTask', type: 'task', label: 'Control task', execution_domain: 'controlDomain', execution_context: 'rtos-task' },
  { id: 'sharedBuffer', type: 'buffer', label: 'Shared buffer' },
  { id: 'notificationController', type: 'hardware', label: 'Notification controller', execution_domain: 'controlDomain', execution_context: 'hardware' },
  { id: 'recoveryController', type: 'software', label: 'Recovery controller', execution_domain: 'hostDomain', execution_context: 'linux-kernel' },
];
const mixedRelations = [
  { id: 'hostProcess-controlTask-command', from: 'hostProcess', to: 'controlTask', label: 'send command', mechanism: 'ipc' },
  { id: 'controlTask-sharedBuffer-produce', from: 'controlTask', to: 'sharedBuffer', label: 'produce shared data', mechanism: 'shared-memory' },
  { id: 'sharedBuffer-hostProcess-consume', from: 'sharedBuffer', to: 'hostProcess', label: 'consume shared data', mechanism: 'shared-memory' },
  { id: 'controlTask-notificationController-signal', from: 'controlTask', to: 'notificationController', label: 'signal completion', mechanism: 'notification' },
  { id: 'notificationController-hostProcess-notify', from: 'notificationController', to: 'hostProcess', label: 'notify host', mechanism: 'notification' },
  { id: 'recoveryController-controlTask-recover', from: 'recoveryController', to: 'controlTask', label: 'request recovery', mechanism: 'lifecycle-control' },
];

export const EMBEDDED_DEPTH_FIXTURES = Object.freeze([
  {
    id: 'linux-io',
    environment: 'linux',
    sharedEntities: linuxComponents.map(({ id }) => id),
    sharedRelations: linuxRelations.map(({ id }) => id),
    overviewMainPath: ['inputDevice', 'dmaEngine', 'kernelBuffer', 'serviceProcess'],
    distinctEntities: [['inputDevice', 'dmaEngine', 'kernelModule', 'kernelBuffer', 'serviceProcess', 'recoveryManager']],
    semanticRoles: [
      { role: 'data-movement', relationId: 'dmaEngine-kernelBuffer-transfer' },
      { role: 'control', relationId: 'serviceProcess-kernelModule-request' },
      { role: 'irq-notification', relationId: 'dmaEngine-kernelModule-complete' },
      { role: 'buffer-handoff', relationId: 'kernelBuffer-serviceProcess-deliver' },
      { role: 'recovery', relationId: 'kernelModule-recoveryManager-recover' },
    ],
    unknowns: [
      { item: 'completion-to-process scheduling delay', status: 'unknown', limits: 'No runtime trace or worst-case bound is supplied.' },
      { item: 'buffer access strategy', status: 'unknown', limits: 'The fixture does not claim copying, mapping, or zero-copy behavior.' },
    ],
    overview: {
      type: 'architecture',
      document: architecture({
        title: 'Linux I/O overview',
        domains: linuxDomains,
        components: linuxComponents,
        connections: linuxRelations,
        boundaries: [
          { kind: 'privilege-domain', label: 'Kernel context', wraps: ['kernelModule', 'kernelBuffer', 'recoveryManager'] },
          { kind: 'address-space', label: 'Service address space', wraps: ['serviceProcess'] },
        ],
      }),
    },
    mechanism: {
      type: 'dataflow',
      document: dataflow({
        title: 'Linux I/O data and completion mechanism',
        domains: linuxDomains,
        stages: ['Device', 'Kernel control', 'Buffer', 'User and recovery'],
        nodes: [
          { ...linuxComponents[0], stage: 0, row: 0, pos: undefined },
          { ...linuxComponents[1], stage: 1, row: 0, pos: undefined },
          { ...linuxComponents[2], stage: 1, row: 1, pos: undefined },
          { ...linuxComponents[3], stage: 2, row: 0, pos: undefined },
          { ...linuxComponents[4], stage: 3, row: 0, pos: undefined },
          { ...linuxComponents[5], stage: 3, row: 1, pos: undefined },
        ].map(({ pos, ...node }) => node),
        flows: linuxRelations,
      }),
    },
  },
  {
    id: 'rtos-event-handoff',
    environment: 'rtos',
    sharedEntities: rtosEntities.map(({ id }) => id),
    sharedRelations: rtosRelations.map(({ id }) => id),
    overviewMainPath: ['eventSource', 'isrHandler', 'eventQueue', 'workerTask'],
    distinctEntities: [['eventSource', 'isrHandler', 'eventQueue', 'workerTask', 'recoveryTask']],
    semanticRoles: [
      { role: 'irq-notification', relationId: 'eventSource-isrHandler-notify' },
      { role: 'buffer-handoff', relationId: 'eventQueue-workerTask-deliver' },
      { role: 'control', relationId: 'workerTask-eventSource-complete' },
      { role: 'recovery', relationId: 'eventQueue-recoveryTask-recover' },
    ],
    unknowns: [
      { item: 'worker execution time', status: 'unknown', limits: 'Message order does not provide a timing or schedulability bound.' },
      { item: 'priority configuration', status: 'unknown', limits: 'No kernel, port, or effective configuration is supplied.' },
    ],
    overview: {
      type: 'architecture',
      document: architecture({
        title: 'RTOS event handoff overview',
        domains: rtosDomains,
        components: rtosEntities.map((entity, index) => ({ ...entity, pos: [60 + index * 180, 120] })),
        connections: rtosRelations,
        boundaries: [{ kind: 'execution-domain', label: 'RTOS execution domain', wraps: rtosEntities.map(({ id }) => id) }],
      }),
    },
    mechanism: {
      type: 'sequence',
      document: sequence({
        title: 'RTOS event handoff order',
        domains: rtosDomains,
        participants: rtosEntities,
        messages: rtosRelations.map((relation, index) => ({ ...relation, y: 180 + index * 60 })),
      }),
    },
  },
  {
    id: 'bare-control-loop',
    environment: 'bare-metal',
    sharedEntities: bareEntities.map(({ id }) => id),
    sharedRelations: bareRelations.map(({ id }) => id),
    overviewMainPath: ['tickSource', 'timerIsr', 'dmaEngine', 'sampleBuffer', 'mainLoop'],
    distinctEntities: [['tickSource', 'timerIsr', 'dmaEngine', 'sampleBuffer', 'mainLoop', 'safeState']],
    semanticRoles: [
      { role: 'control', relationId: 'timerIsr-dmaEngine-start' },
      { role: 'data-movement', relationId: 'dmaEngine-sampleBuffer-transfer' },
      { role: 'irq-notification', relationId: 'dmaEngine-timerIsr-complete' },
      { role: 'buffer-handoff', relationId: 'sampleBuffer-mainLoop-deliver' },
      { role: 'recovery', relationId: 'timerIsr-safeState-recover' },
    ],
    unknowns: [
      { item: 'buffer visibility requirements', status: 'unknown', limits: 'No memory-system analysis or runtime observation is supplied.' },
      { item: 'recovery threshold', status: 'unknown', limits: 'The fixture includes a recovery relation without inventing a threshold.' },
    ],
    overview: {
      type: 'architecture',
      document: architecture({
        title: 'Bare-metal control overview',
        domains: bareDomains,
        components: bareEntities.map((entity, index) => ({ ...entity, pos: [60 + (index % 4) * 190, 100 + Math.floor(index / 4) * 150] })),
        connections: bareRelations,
        boundaries: [{ kind: 'execution-domain', label: 'Bare-metal execution domain', wraps: bareEntities.map(({ id }) => id) }],
      }),
    },
    mechanism: {
      type: 'workflow',
      document: workflow({
        title: 'Bare-metal control and recovery flow',
        domains: bareDomains,
        lanes: [
          { id: 'startupLane', label: 'Startup' },
          { id: 'runtimeLane', label: 'Runtime' },
          { id: 'recoveryLane', label: 'Recovery', variant: 'exception' },
        ],
        nodes: [
          { ...bareEntities[0], lane: 'startupLane', col: 0 },
          { ...bareEntities[1], lane: 'runtimeLane', col: 0 },
          { ...bareEntities[2], lane: 'runtimeLane', col: 1 },
          { ...bareEntities[3], lane: 'runtimeLane', col: 2 },
          { ...bareEntities[4], lane: 'runtimeLane', col: 3 },
          { ...bareEntities[5], lane: 'runtimeLane', col: 4 },
          { ...bareEntities[6], lane: 'recoveryLane', col: 5 },
        ],
        edges: bareRelations,
      }),
    },
  },
  {
    id: 'mixed-runtime-exchange',
    environment: 'mixed',
    sharedEntities: mixedEntities.map(({ id }) => id),
    sharedRelations: mixedRelations.map(({ id }) => id),
    overviewMainPath: ['controlTask', 'sharedBuffer', 'hostProcess'],
    distinctEntities: [['hostProcess', 'controlTask', 'sharedBuffer', 'notificationController', 'recoveryController']],
    semanticRoles: [
      { role: 'control', relationId: 'hostProcess-controlTask-command' },
      { role: 'data-movement', relationId: 'controlTask-sharedBuffer-produce' },
      { role: 'buffer-handoff', relationId: 'sharedBuffer-hostProcess-consume' },
      { role: 'irq-notification', relationId: 'notificationController-hostProcess-notify' },
      { role: 'recovery', relationId: 'recoveryController-controlTask-recover' },
    ],
    unknowns: [
      { item: 'shared-buffer synchronization details', status: 'unknown', limits: 'No memory-system or concurrency correctness analysis is supplied.' },
      { item: 'cross-domain latency', status: 'unknown', limits: 'No trace, budget, or worst-case bound is supplied.' },
    ],
    overview: {
      type: 'architecture',
      document: architecture({
        title: 'Mixed runtime exchange overview',
        domains: mixedDomains,
        components: mixedEntities.map((entity, index) => ({ ...entity, pos: [60 + index * 190, 120] })),
        connections: mixedRelations,
        boundaries: [
          { kind: 'execution-domain', label: 'Host execution domain', wraps: ['hostProcess', 'recoveryController'] },
          { kind: 'execution-domain', label: 'Control execution domain', wraps: ['controlTask', 'notificationController'] },
        ],
      }),
    },
    mechanism: {
      type: 'dataflow',
      document: dataflow({
        title: 'Mixed runtime data, notification, and recovery',
        domains: mixedDomains,
        stages: ['Host', 'Control', 'Shared exchange', 'Notification and recovery'],
        nodes: [
          { ...mixedEntities[0], stage: 0, row: 0 },
          { ...mixedEntities[1], stage: 1, row: 0 },
          { ...mixedEntities[2], stage: 2, row: 0 },
          { ...mixedEntities[3], stage: 3, row: 0 },
          { ...mixedEntities[4], stage: 3, row: 1 },
        ],
        flows: mixedRelations,
      }),
    },
  },
]);
