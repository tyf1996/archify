// Offline assets for the optional atlas builder; no renderer or project globals.
export const atlasUi = {
  en: {
    interfaces: 'Node interfaces', index: 'Diagram interface index', node: 'Related node',
    search: 'Search the current scope', placeholder: 'Name, parameter, return value or constraint',
    close: 'Close · Esc', expand: 'Expand all', collapse: 'Collapse all',
    parameters: 'Parameters', returns: 'Return contract', callers: 'Callers / entry points',
    calls: 'Calls / mechanisms', notes: 'Constraints and caveats', source: 'Source',
    none: 'None documented.', link: 'Link to this node interface',
    empty: 'No matching interfaces or nodes. Try fewer keywords.',
    shown: 'Showing', of: '/', functions: 'interfaces', nodes: 'nodes',
    detail: 'Key interfaces', atlas: 'Atlas', reference: 'All interfaces', theme: 'Light / Dark',
    offline: 'Interface details are embedded for offline reading. Source links require the repository files.',
    hint: 'Open node interfaces; Shift-click preserves the original diagram interaction.',
    footer: 'Interface associations are documentation, not additional graph edges or runtime proof.',
  },
  'zh-CN': {
    interfaces: '节点接口', index: '本图节点接口索引', node: '关联节点',
    search: '在当前范围搜索', placeholder: '函数名、参数、返回值或约束',
    close: '关闭 · Esc', expand: '展开全部', collapse: '收起全部',
    parameters: '参数', returns: '返回约定', callers: '调用方 / 入口',
    calls: '调用 / 机制', notes: '使用约束与易错点', source: '源码',
    none: '未记录。', link: '此节点接口的定位链接',
    empty: '没有匹配的接口或节点；请减少关键词。',
    shown: '显示', of: '/', functions: '个接口', nodes: '个节点',
    detail: '关键接口', atlas: '图册', reference: '完整接口索引', theme: '浅色 / 深色',
    offline: '接口详情随 HTML 内嵌，可离线阅读；源码跳转需要保留仓库文件。',
    hint: '打开节点接口；Shift + 单击保留原图关系聚焦。',
    footer: '接口关联属于文档说明，不代表新增图关系或运行验证。',
  },
};

// This pure function is also serialized into each reader, so keep dependencies local.
export function interfaceMarkup(f, ui, links = [], opened = false) {
  const esc = value => String(value).replace(/[&<>"']/g, c => (
    {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]
  ));
  const list = values => values.length
    ? '<ul>' + values.map(v => '<li>' + esc(v) + '</li>').join('') + '</ul>'
    : esc(ui.none);
  const row = (key, value) => '<dt>' + esc(key) + '</dt><dd>' + value + '</dd>';
  return '<details class="aia-function" id="interface-' + esc(f.id) + '" data-interface-id="' + esc(f.id) + '"' + (opened ? ' open' : '') + '>' +
    '<summary><code>' + esc(f.name) + '</code><span class="aia-badge">' + esc(f.kind) + '</span></summary>' +
    '<div class="aia-function-body"><p>' + esc(f.summary) + '</p><pre><code>' + esc(f.signature) + '</code></pre><dl>' +
    row(ui.parameters, list(f.parameters)) + row(ui.returns, esc(f.returns)) +
    row(ui.callers, list(f.callers)) + row(ui.calls, list(f.calls)) + '</dl>' +
    (f.notes.length ? '<aside class="aia-caution"><h3>' + esc(ui.notes) + '</h3>' + list(f.notes) + '</aside>' : '') +
    '<div class="aia-sources">' + f.sources.map(s => '<a href="' + esc(s.href) + '" target="_blank" rel="noopener noreferrer">' +
      esc(s.label || ui.source) + ' · ' + esc(s.path) + ':' + s.startLine + (s.endLine !== s.startLine ? '–' + s.endLine : '') + '</a>').join('<br>') +
    (f.sources.length && links.length ? '<br>' : '') +
    links.map(l => '<a href="' + esc(l.href) + '">' + esc(l.label) + '</a>').join('<br>') +
    '</div></div></details>';
}

export function nodeInterfaceRuntime(data, ui, markup) {
  'use strict';
  const esc = value => String(value).replace(/[&<>"']/g, c => (
    {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]
  ));
  const rows = new Map(data.nodes.map(n => [n.id, n]));
  const functions = new Map(data.interfaces.map(f => [f.id, f]));
  const graphNodes = new Map();
  document.querySelectorAll('svg [data-node-id]').forEach(el => {
    if (rows.has(el.dataset.nodeId)) graphNodes.set(el.dataset.nodeId, el);
  });
  const exportWrap = document.getElementById('btn-export')?.closest('.export-wrap');
  if (graphNodes.size !== rows.size || !exportWrap) {
    console.error('Archify interface atlas: unsupported viewer or mismatched node bindings.');
    return;
  }
  exportWrap.closest('.toolbar').classList.add('aia-toolbar');
  const dialog = document.createElement('dialog');
  dialog.id = 'aia-dialog';
  dialog.className = 'aia-surface';
  dialog.setAttribute('aria-labelledby', 'aia-title');
  dialog.innerHTML = '<header class="aia-header"><div><p class="aia-kicker">' + esc(ui.interfaces) + ' · ' + esc(data.title) +
    '</p><h2 id="aia-title"></h2></div><button id="aia-close" type="button">' + esc(ui.close) + '</button></header>' +
    '<div class="aia-controls"><label>' + esc(ui.node) + '<select id="aia-node"><option value="">' + esc(ui.index) + '</option>' +
    data.nodes.map(n => '<option value="' + esc(n.id) + '">' + esc(n.label) + ' · ' + n.interfaces.length + '</option>').join('') +
    '</select></label><label>' + esc(ui.search) + '<input id="aia-search" type="search" placeholder="' + esc(ui.placeholder) +
    '" autocomplete="off"></label></div><div class="aia-meta"><span id="aia-status" role="status" aria-live="polite"></span>' +
    '<button id="aia-expand" type="button">' + esc(ui.expand) + '</button><button id="aia-collapse" type="button">' + esc(ui.collapse) +
    '</button></div><p class="aia-notice" id="aia-note" hidden></p><div id="aia-content"></div>' +
    '<footer class="aia-footer"><p>' + esc(data.context) + '</p>' + esc(ui.offline) + '<br>' +
    '<a href="interfaces.html">' + esc(ui.reference) + '</a> · <a href="index.html">' + esc(ui.atlas) + '</a></footer>';
  document.body.append(dialog);
  const select = dialog.querySelector('#aia-node');
  const search = dialog.querySelector('#aia-search');
  const content = dialog.querySelector('#aia-content');
  const status = dialog.querySelector('#aia-status');
  const note = dialog.querySelector('#aia-note');
  const close = dialog.querySelector('#aia-close');
  let returnFocus = null;
  let pointer = null;
  const matches = (f, terms) => terms.every(t => JSON.stringify(f).toLowerCase().includes(t));
  const link = (node, f) => '#archify-api=' + encodeURIComponent(node) + '&interface=' + encodeURIComponent(f);
  function render() {
    const row = rows.get(select.value);
    const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    dialog.querySelector('#aia-title').textContent = row ? row.label + ' · ' + ui.detail : ui.index;
    note.hidden = !row?.note;
    note.textContent = row?.note || '';
    dialog.querySelector('#aia-expand').hidden = !row;
    dialog.querySelector('#aia-collapse').hidden = !row;
    if (row) {
      const items = row.interfaces.map(id => functions.get(id)).filter(f => matches(f, terms));
      content.innerHTML = items.length
        ? items.map((f, i) => markup(f, ui, [{href: link(row.id, f.id), label: ui.link}], i === 0)).join('')
        : '<p class="aia-empty">' + esc(ui.empty) + '</p>';
      status.textContent = row.id + ' · ' + ui.shown + ' ' + items.length + ' / ' + row.interfaces.length + ' ' + ui.functions;
    } else {
      const nodes = data.nodes.filter(n =>
        terms.every(t => (n.label + ' ' + n.id).toLowerCase().includes(t)) ||
        n.interfaces.some(id => matches(functions.get(id), terms)));
      content.innerHTML = nodes.length ? '<div class="aia-node-grid">' + nodes.map(n =>
        '<button type="button" class="aia-node-card" data-open-api-node="' + esc(n.id) + '"><strong>' + esc(n.label) +
        '</strong><span>' + n.interfaces.length + ' ' + esc(ui.functions) + ' · ' + esc(n.id) + '</span><code>' +
        n.interfaces.map(id => esc(functions.get(id).name)).join('<br>') + '</code></button>').join('') + '</div>'
        : '<p class="aia-empty">' + esc(ui.empty) + '</p>';
      status.textContent = ui.shown + ' ' + nodes.length + ' / ' + data.nodes.length + ' ' + ui.nodes;
    }
  }
  function open(id = '', interfaceId, opener = document.activeElement) {
    if (id && !rows.has(id)) return;
    if (!dialog.open) returnFocus = opener;
    const chip = document.getElementById('focus-chip');
    if (chip && !chip.hidden) document.getElementById('btn-focus-clear')?.click();
    select.value = id;
    search.value = '';
    render();
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    close.focus({preventScroll: true});
    if (interfaceId) {
      const detail = Array.from(content.querySelectorAll('[data-interface-id]')).find(el => el.dataset.interfaceId === interfaceId);
      if (detail) {
        detail.open = true;
        requestAnimationFrame(() => detail.scrollIntoView({block: 'nearest'}));
      }
    }
  }
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    // A queued close event must not move focus out of a newly reopened dialog.
    if (!dialog.open && returnFocus?.isConnected) returnFocus.focus({preventScroll: true});
  });
  // Modal keys must be isolated before native document-level chapter shortcuts.
  window.addEventListener('keydown', e => {
    if (!dialog.open || !dialog.contains(e.target)) return;
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); dialog.close(); }
  }, true);
  dialog.addEventListener('click', e => {
    const button = e.target.closest?.('[data-open-api-node]');
    if (button) open(button.dataset.openApiNode);
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
    }
  });
  select.addEventListener('change', () => { search.value = ''; render(); });
  search.addEventListener('input', render);
  dialog.querySelector('#aia-expand').addEventListener('click', () => content.querySelectorAll('details').forEach(el => { el.open = true; }));
  dialog.querySelector('#aia-collapse').addEventListener('click', () => content.querySelectorAll('details').forEach(el => { el.open = false; }));
  document.addEventListener('pointerdown', e => { pointer = {x: e.clientX, y: e.clientY}; }, true);
  document.addEventListener('click', e => {
    if (dialog.open || e.button !== 0 || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
    const node = e.target.closest?.('svg [data-node-id]');
    if (!node || !rows.has(node.dataset.nodeId)) return;
    if (e.detail !== 0 && pointer && Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) > 7) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    open(node.dataset.nodeId, undefined, node);
  }, true);
  document.addEventListener('keydown', e => {
    if (dialog.open || !['Enter', ' '].includes(e.key) || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
    const node = e.target.closest?.('svg [data-node-id]');
    if (!node || !rows.has(node.dataset.nodeId)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    open(node.dataset.nodeId, undefined, node);
  }, true);
  for (const [id, el] of graphNodes) {
    el.classList.add('aia-mapped-node');
    el.setAttribute('aria-label', rows.get(id).label + ' · ' + rows.get(id).interfaces.length + ' ' + ui.functions + '. ' + ui.hint);
    el.setAttribute('aria-haspopup', 'dialog');
    el.setAttribute('tabindex', '0');
  }
  const indexButton = document.createElement('button');
  indexButton.id = 'aia-index';
  indexButton.type = 'button';
  indexButton.textContent = ui.interfaces;
  indexButton.title = ui.hint;
  indexButton.setAttribute('aria-haspopup', 'dialog');
  indexButton.addEventListener('click', () => open());
  exportWrap.before(indexButton);
  function followHash() {
    const params = new URLSearchParams(location.hash.slice(1));
    const id = params.get('archify-api');
    if (rows.has(id)) open(id, params.get('interface'));
  }
  window.addEventListener('hashchange', followHash);
  followHash();
}
