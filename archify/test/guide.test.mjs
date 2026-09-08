import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCENARIO_RECIPES,
  detectGuideLanguage,
  listScenarioRecipes,
  publicGuideData,
  recommendScenario,
} from '../recipes/scenarios.mjs';

test('guide: exposes 16 unique recipes across every diagram type', () => {
  assert.equal(SCENARIO_RECIPES.length, 16);
  assert.equal(new Set(SCENARIO_RECIPES.map((recipe) => recipe.id)).size, 16);
  assert.deepEqual(
    Object.fromEntries(['architecture', 'workflow', 'sequence', 'dataflow', 'lifecycle'].map((type) => [
      type,
      SCENARIO_RECIPES.filter((recipe) => recipe.type === type).length,
    ])),
    { architecture: 3, workflow: 4, sequence: 3, dataflow: 3, lifecycle: 3 },
  );
});

test('guide: every recipe has complete English and Chinese decision copy', () => {
  for (const recipe of SCENARIO_RECIPES) {
    assert.match(recipe.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(recipe.signals.length >= 8, recipe.id);
    assert.ok(['classic', 'signal-flow', 'blueprint', 'editorial'].includes(recipe.presentation.preset), recipe.id);
    for (const lang of ['en', 'zh']) {
      const copy = recipe[lang];
      assert.ok(copy.title.length >= 4, `${recipe.id}.${lang}.title`);
      for (const field of ['question', 'summary', 'useWhen', 'avoidWhen', 'prompt']) {
        assert.ok(copy[field].length > 10, `${recipe.id}.${lang}.${field}`);
      }
      assert.equal(copy.include.length, 4, `${recipe.id}.${lang}.include`);
    }
  }
});

test('guide: embedded recipes keep the approved IDs, static presentation, and start prompts', () => {
  assert.deepEqual(
    SCENARIO_RECIPES.slice(0, 11).map((recipe) => recipe.id),
    ['system-overview', 'deployment-ownership', 'agent-tool-call', 'delivery-workflow', 'incident-runbook', 'api-request', 'async-roundtrip', 'data-lineage', 'event-stream', 'object-lifecycle', 'deployment-lifecycle'],
  );
  assert.deepEqual(
    SCENARIO_RECIPES.slice(-5).map((recipe) => [recipe.id, recipe.type, recipe.proof]),
    [
      ['embedded-runtime-map', 'architecture', 'embedded-runtime-map'],
      ['bare-metal-boot', 'workflow', 'bare-metal-boot'],
      ['rtos-irq-handoff', 'sequence', 'rtos-irq-handoff'],
      ['linux-device-data-path', 'dataflow', 'linux-device-data-path'],
      ['firmware-update-state', 'lifecycle', 'firmware-update-state'],
    ],
  );
  for (const recipe of SCENARIO_RECIPES.slice(-5)) {
    assert.equal(recipe.presentation.preset, 'classic', recipe.id);
    assert.equal(recipe.presentation.motion, 'static', recipe.id);
    assert.equal(recipe.presentation.views, 'recommended', recipe.id);
    for (const lang of ['en', 'zh']) {
      assert.ok(recipe.start?.[lang]?.descriptionPrompt, `${recipe.id}.${lang}.start`);
      assert.match(recipe[lang].prompt, /Archify/);
    }
  }
});

test('guide: language detection and localization are deterministic', () => {
  assert.equal(detectGuideLanguage('show an API request'), 'en');
  assert.equal(detectGuideLanguage('展示 API 请求'), 'zh');
  assert.equal(listScenarioRecipes('zh')[0].title, '系统总览');
  assert.equal(listScenarioRecipes('en')[0].title, 'System overview');
});

test('guide: representative scenarios map to specialized recipes', () => {
  const cases = [
    ['Show an API request with Redis cache miss', 'api-request'],
    ['Show CI/CD build deploy rollback', 'delivery-workflow'],
    ['展示 Kafka topic 消费者组和死信队列', 'event-stream'],
    ['梳理 ETL 数仓 PII 数据血缘', 'data-lineage'],
    ['deployment lifecycle approval rollback state', 'deployment-lifecycle'],
    ['agent tool call approval gate MCP', 'agent-tool-call'],
    ['embedded runtime Linux RTOS sensor controlTask shared buffer watchdog', 'embedded-runtime-map'],
    ['裸机启动 reset runtime init board init calibrate main loop', 'bare-metal-boot'],
    ['RTOS ISR queue worker queue full recovery', 'rtos-irq-handoff'],
    ['Linux device peripheral DMA kernel buffer user process drop frame', 'linux-device-data-path'],
    ['固件更新 下载 验证 试运行 确认 回滚 恢复', 'firmware-update-state'],
  ];

  for (const [query, expected] of cases) {
    assert.equal(recommendScenario(query).recommendation.id, expected, query);
  }
});

test('guide: intent wins over embedded background words', () => {
  const cases = [
    ['Show the API request call chain between Linux RTOS components.', 'sequence'],
    ['展示 Linux RTOS 系统的状态机', 'lifecycle'],
    ['展示 Linux RTOS 系统的数据血缘', 'dataflow'],
    ['展示 Linux RTOS 系统的发布流程', 'workflow'],
    ['展示 Linux 设备 DMA 的组件架构', 'architecture'],
    ['展示 Linux 设备 DMA 的调用链', 'sequence'],
    ['Show the incident runbook for queue full recovery.', 'workflow'],
    ['展示 RTOS 中断到任务的交互顺序', 'sequence'],
    ['Show the message order between the ISR and worker task in an RTOS.', 'sequence'],
    ['展示 Linux 外设数据如何经 DMA 和内核缓冲送到用户进程', 'dataflow'],
    ['Show how Linux sensor data moves through DMA and kernel buffers into a user process.', 'dataflow'],
    ['展示裸机从复位、板级初始化和校准到主循环的启动流程', 'workflow'],
    ['Show bare-metal startup from reset through runtime initialization, board setup, calibration and the main loop.', 'workflow'],
    ['Show the states of a Linux firmware image as it downloads, verifies, runs a trial and rolls back.', 'lifecycle'],
  ];
  for (const [query, expectedType] of cases) {
    assert.equal(recommendScenario(query).recommendation.type, expectedType, query);
  }
});

test('guide: explicit problem phrases constrain candidates before embedded specificity', () => {
  const cases = [
    ['展示 Kafka 拓扑', 'dataflow'],
    ['Show Kafka topology', 'dataflow'],
    ['Show the event stream topology with topics and consumer groups.', 'dataflow'],
    ['展示订单状态的数据管道', 'dataflow'],
    ['展示 API 请求如何查询订单状态', 'sequence'],
    ['Show an API request with Redis cache miss, including a data buffer.', 'sequence'],
    ['展示发布流程，检查状态后回滚', 'workflow'],
    ['展示事故处置工作流，先检查服务状态再回滚', 'workflow'],
    ['Show the component architecture of an RTOS interrupt handler and worker task.', 'architecture'],
    ['展示裸机复位和校准模块的组件架构', 'architecture'],
    ['展示 RTOS 中断和任务的组件架构', 'architecture'],
    ['展示 RTOS 中断和任务的交互顺序', 'sequence'],
    ['展示 RTOS 中断和任务的数据血缘', 'dataflow'],
    ['展示 RTOS 中断和任务的状态机', 'lifecycle'],
    ['展示 RTOS 中断和任务的发布流程', 'workflow'],
    ['展示 Linux 设备 DMA 内核缓冲与用户进程的组件架构', 'architecture'],
    ['展示 Linux 设备 DMA 内核缓冲与用户进程的消息顺序', 'sequence'],
    ['展示 Linux 设备 DMA 内核缓冲与用户进程的数据血缘', 'dataflow'],
    ['展示 Linux 设备 DMA 内核缓冲与用户进程的状态机', 'lifecycle'],
    ['展示 Linux 设备 DMA 内核缓冲与用户进程的发布流程', 'workflow'],
    ['Show the message order for a Linux device DMA kernel buffer shared with a user process.', 'sequence'],
  ];
  for (const [query, expectedType] of cases) {
    assert.equal(recommendScenario(query).recommendation.type, expectedType, query);
  }
});

test('guide: explicit problem phrases preserve existing recipe controls', () => {
  const cases = [
    ['Show event stream topics consumer groups and DLQ.', 'event-stream'],
    ['展示 API 请求和缓存未命中', 'api-request'],
    ['梳理 ETL 数仓 PII 数据血缘', 'data-lineage'],
    ['展示对象生命周期状态机终态', 'object-lifecycle'],
    ['展示发布流程预发上线回滚', 'delivery-workflow'],
    ['展示事故处置排障缓解升级响应', 'incident-runbook'],
    ['展示部署拓扑和资源归属', 'deployment-ownership'],
    ['Show a system overview with core components.', 'system-overview'],
  ];
  for (const [query, expectedId] of cases) {
    assert.equal(recommendScenario(query).recommendation.id, expectedId, query);
  }
});

test('guide: K5 preserves the complete R6 routing matrix', () => {
  const controls = [
    ['Show a system overview with core components.', 'system-overview'],
    ['Show cloud deployment topology with regions and ownership.', 'deployment-ownership'],
    ['agent tool call approval gate MCP', 'agent-tool-call'],
    ['Show CI/CD build deploy rollback', 'delivery-workflow'],
    ['Show incident response triage mitigation escalation.', 'incident-runbook'],
    ['Show an API request with Redis cache miss', 'api-request'],
    ['Show async roundtrip webhook callback acknowledgement.', 'async-roundtrip'],
    ['Map ETL warehouse PII data lineage.', 'data-lineage'],
    ['Show event stream topics consumer groups and DLQ.', 'event-stream'],
    ['Show object lifecycle state machine terminal state.', 'object-lifecycle'],
    ['deployment lifecycle approval rollback state', 'deployment-lifecycle'],
    ['展示系统总览和核心组件', 'system-overview'],
    ['展示部署拓扑和资源归属', 'deployment-ownership'],
    ['展示智能体工具调用审批门', 'agent-tool-call'],
    ['展示发布流程预发上线回滚', 'delivery-workflow'],
    ['展示事故处置排障缓解升级响应', 'incident-runbook'],
    ['展示 API 请求和缓存未命中', 'api-request'],
    ['展示异步回调和消息重试', 'async-roundtrip'],
    ['梳理 ETL 数仓 PII 数据血缘', 'data-lineage'],
    ['展示 Kafka topic 消费者组和死信队列', 'event-stream'],
    ['展示对象生命周期状态机终态', 'object-lifecycle'],
    ['展示部署生命周期发布状态晋级回滚状态', 'deployment-lifecycle'],
  ];
  for (const [query, expectedId] of controls) {
    assert.equal(recommendScenario(query).recommendation.id, expectedId, query);
  }

  for (const recipe of SCENARIO_RECIPES) {
    assert.equal(recommendScenario(recipe.id).recommendation.id, recipe.id, recipe.id);
    assert.equal(recommendScenario(recipe.id.replaceAll('-', ' ')).recommendation.id, recipe.id, recipe.id + ' spaces');
  }

  for (const context of ['Linux', 'RTOS', 'FreeRTOS', 'MCU', 'embedded', 'Linux RTOS']) {
    assert.equal(recommendScenario(context).confidence, 'low', context);
  }
  assert.equal(recommendScenario('make it delightful').recommendation.id, 'system-overview');
  assert.equal(recommendScenario('make it delightful').confidence, 'low');
});

test('guide: exact ids win and unknown questions fall back honestly', () => {
  const exact = recommendScenario('incident-runbook');
  assert.equal(exact.recommendation.id, 'incident-runbook');
  assert.equal(exact.confidence, 'high');

  for (const [query, expected] of [
    ['展示 Linux 设备 DMA 数据通路', 'linux-device-data-path'],
    ['Show bare-metal reset and calibration workflow', 'bare-metal-boot'],
    ['RTOS IRQ queue worker sequence', 'rtos-irq-handoff'],
  ]) {
    assert.equal(recommendScenario(query).recommendation.id, expected, query);
  }

  for (const context of ['Linux', 'RTOS', 'FreeRTOS', 'MCU', 'embedded']) {
    const contextOnly = recommendScenario(context);
    assert.equal(contextOnly.confidence, 'low', context);
    assert.notEqual(contextOnly.recommendation.type, undefined, context);
  }

  const unknown = recommendScenario('make it delightful');
  assert.equal(unknown.recommendation.id, 'system-overview');
  assert.equal(unknown.confidence, 'low');
  assert.deepEqual(unknown.matchedSignals, []);
});

test('guide: public data includes both languages and weighted signals', () => {
  const data = publicGuideData();
  assert.equal(data.length, 16);
  for (const recipe of data) {
    assert.ok(recipe.en.title);
    assert.ok(recipe.zh.title);
    assert.ok(recipe.proof, `${recipe.id}: verified proof is required`);
    assert.ok(recipe.signals.every(([signal, weight]) => typeof signal === 'string' && weight > 0));
  }
});
