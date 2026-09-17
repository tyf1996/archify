import {atlasUi, interfaceMarkup} from './viewer.mjs';

const esc = value => String(value).replace(/[&<>"']/g, c => (
  {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]
));

export function referenceRuntime() {
  const theme = document.querySelector('#atlas-theme');
  const search = document.querySelector('#atlas-search');
  const cards = Array.from(document.querySelectorAll('.aia-function'));
  document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  theme.addEventListener('click', () => {
    document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  });
  function filter() {
    const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    for (const el of cards) el.hidden = !terms.every(t => el.textContent.toLowerCase().includes(t));
    document.querySelector('#atlas-empty').hidden = cards.some(el => !el.hidden);
  }
  search?.addEventListener('input', filter);
  document.querySelector('#atlas-expand')?.addEventListener('click', () => cards.filter(el => !el.hidden).forEach(el => { el.open = true; }));
  document.querySelector('#atlas-collapse')?.addEventListener('click', () => cards.forEach(el => { el.open = false; }));
  function followHash() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = cards.find(el => el.id === id);
    if (!target) return;
    search.value = '';
    filter();
    target.open = true;
    target.scrollIntoView({block: 'start'});
  }
  window.addEventListener('hashchange', followHash);
  followHash();
}

export function renderDocuments(data, styles) {
  const ui = atlasUi[data.locale];
  const pageStyle = 'body{margin:0;background:#f5f7fa}html[data-theme=dark] body{background:#101722}' +
    '.atlas-main{max-width:1160px;margin:auto;padding:32px 28px}.atlas-top{display:flex;justify-content:space-between;gap:20px;align-items:center}' +
    '.atlas-main h1{font-size:clamp(26px,3vw,40px);line-height:1.3;margin:20px 0 12px;overflow-wrap:anywhere}' +
    '.atlas-main>header{margin-bottom:26px}.atlas-main .context{color:var(--aia-muted);max-width:900px}' +
    '.atlas-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:18px}' +
    '.atlas-card{display:block;border:1px solid var(--aia-line);border-radius:12px;background:var(--aia-paper);padding:22px;text-decoration:none}' +
    '.atlas-card h2{font-size:21px;margin:10px 0}.atlas-card span{font-size:12px}.atlas-card p{color:var(--aia-muted)}' +
    '.atlas-tools{display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin:24px 0}.atlas-tools label{flex:1;min-width:min(100%,240px)}' +
    '.atlas-tools label span,.atlas-tools input{display:block;width:100%}.atlas-main footer{margin-top:24px;color:var(--aia-muted)}' +
    '@media(max-width:650px){.atlas-main{padding:20px 16px}.atlas-top{gap:10px}}';
  const head = title => '<!doctype html><html lang="' + data.locale + '"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(title) + '</title>' +
    '<style>' + styles + '\n' + pageStyle + '</style></head><body><main class="atlas-main aia-surface">';
  const theme = '<button id="atlas-theme" type="button">' + esc(ui.theme) + '</button>';
  const tail = '<footer><p>' + esc(ui.offline) + '</p><p>' + esc(ui.footer) + '</p></footer></main><script>(' +
    referenceRuntime.toString() + ')();</script></body></html>\n';
  const referenceLinks = f => data.diagrams.flatMap(d => d.nodes.filter(n => n.interfaces.includes(f.id)).map(n => ({
    href: d.id + '.html#archify-api=' + encodeURIComponent(n.id) + '&interface=' + encodeURIComponent(f.id),
    label: d.title + ' · ' + n.label,
  })));
  const index = head(data.title) + '<header><div class="atlas-top"><a href="interfaces.html">' +
    esc(ui.reference) + ' · ' + data.interfaces.length + '</a>' + theme + '</div><h1>' + esc(data.title) +
    '</h1><p class="context">' + esc(data.context) + '</p><p>' + esc(ui.hint) + '</p></header>' +
    '<nav class="atlas-grid" aria-label="' + esc(ui.atlas) + '">' + data.diagrams.map(d =>
      '<a class="atlas-card" href="' + d.id + '.html"><span>' + esc(d.type) + '</span><h2>' + esc(d.title) +
      ' ↗</h2><p>' + d.nodes.length + ' ' + esc(ui.nodes) + ' · ' + new Set(d.nodes.flatMap(n => n.interfaces)).size +
      ' ' + esc(ui.functions) + '</p></a>').join('') + '</nav>' + tail;
  const reference = head(ui.reference) + '<header><div class="atlas-top"><a href="index.html">← ' +
    esc(ui.atlas) + '</a>' + theme + '</div><h1>' + esc(ui.reference) + '</h1><p class="context">' + esc(data.context) +
    '</p></header><section class="atlas-tools"><label><span>' + esc(ui.search) + '</span><input id="atlas-search" type="search" placeholder="' +
    esc(ui.placeholder) + '"></label><button id="atlas-expand" type="button">' + esc(ui.expand) +
    '</button><button id="atlas-collapse" type="button">' + esc(ui.collapse) + '</button></section>' +
    '<p id="atlas-empty" hidden>' + esc(ui.empty) + '</p>' +
    data.interfaces.map(f => interfaceMarkup(f, ui, referenceLinks(f))).join('') + tail;
  const md = value => String(value).replace(/[\\\x60*_[\]<>]/g, '\\$&');
  const mdList = values => values.length ? values.map(v => '- ' + md(v)).join('\n') : md(ui.none);
  const fence = value => String.fromCharCode(96).repeat(Math.max(3, ...Array.from(value.matchAll(/\x60+/g), m => m[0].length + 1)));
  const markdown = '# ' + md(data.title) + '\n\n' + md(data.context) + '\n\n' + data.interfaces.map(f => {
    const marker = fence(f.signature);
    return '## ' + md(f.name) + '\n\n' + md(f.kind) + ' · ' + md(f.summary) + '\n\n' + marker + '\n' + f.signature + '\n' + marker +
      '\n\n### ' + md(ui.parameters) + '\n\n' + mdList(f.parameters) + '\n\n### ' + md(ui.returns) + '\n\n' + md(f.returns) +
      '\n\n### ' + md(ui.callers) + '\n\n' + mdList(f.callers) + '\n\n### ' + md(ui.calls) + '\n\n' + mdList(f.calls) +
      '\n\n### ' + md(ui.notes) + '\n\n' + mdList(f.notes) + '\n\n' +
      f.sources.map(s => '[' + md(s.label || ui.source) + ' · ' + md(s.path) + ':' + s.startLine + '](' + s.href + ')').join(' · ') +
      '\n\n' + referenceLinks(f).map(l => '[' + md(l.label) + '](' + l.href + ')').join(' · ');
  }).join('\n\n') + '\n';
  return {'index.html': index, 'interfaces.html': reference, 'interfaces.md': markdown};
}
