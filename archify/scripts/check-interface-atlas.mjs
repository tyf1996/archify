#!/usr/bin/env node
// Supplementary checks for derived readers; never changes native delivery claims.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {findChrome} from '../bin/visual-check.mjs';

const script = fileURLToPath(import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export async function checkInterfaceAtlas({outputDirectory, playwrightModule = process.env.ARCHIFY_PLAYWRIGHT_MODULE, chromePath = process.env.ARCHIFY_CHROME} = {}) {
  if (!outputDirectory) throw new Error('An atlas output directory is required.');
  const root = path.resolve(outputDirectory);
  const bind = name => {
    const bytes = fs.readFileSync(path.resolve(root, name));
    return {path: name, sha256: hash(bytes), bytes: bytes.length};
  };
  const safeOutput = name => {
    const target = path.resolve(root, name);
    if (!target.startsWith(root + path.sep)) throw new Error('Evidence output escapes atlas directory.');
    for (let p = target; ; p = path.dirname(p)) {
      try { if (fs.lstatSync(p).isSymbolicLink()) throw new Error('Evidence output uses a symlink: ' + p); }
      catch (e) { if (e.code !== 'ENOENT') throw e; }
      if (path.dirname(p) === p) break;
    }
    return target;
  };
  const receiptPath = safeOutput('interface-atlas.browser-check.json');
  const checks = [], measurements = [], screenshots = [], exports = [], errors = [], requests = [];
  const test = (ok, name, detail) => checks.push({name, status: ok ? 'pass' : 'fail', ...(detail === undefined ? {} : {detail})});
  const receipt = {format: 'archify-interface-atlas-browser-v1', evidenceKind: 'supplementary-derived-atlas-browser',
    checkedOn: new Date().toISOString(), artifacts: [], checker: {path: script, sha256: hash(fs.readFileSync(script))},
    checks, measurements, screenshots, exports, errors, requests, visualReview: 'pending',
    limits: ['Native delivery and native visual-check receipts remain separate.',
      'Default desktop diagrams must fit one screen; references, atlas directories and interface dialogs may scroll vertically.',
      'Automated checks do not provide perceptual approval, source semantic validation or execution evidence.']};
  let browser, context, stage = 'artifact bindings';
  try {
    const delivered = JSON.parse(fs.readFileSync(path.join(root, 'interface-atlas.receipt.json')));
    receipt.derivation = bind('interface-atlas.receipt.json');
    if (delivered.format !== 'archify-interface-atlas-v1' || delivered.status !== 'pass' || !delivered.bases?.length) throw new Error('Not a successful interface atlas receipt.');
    for (const a of delivered.outputs) {
      if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(a.path)) throw new Error('Unsupported artifact path.');
      const actual = bind(a.path);
      if (actual.sha256 !== a.sha256 || actual.bytes !== a.bytes) throw new Error('Stale derived artifact: ' + a.path);
      receipt.artifacts.push(actual);
    }
    for (const base of delivered.bases) if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(base.id)) throw new Error('Invalid diagram ID.');
    stage = 'browser availability';
    let chromium;
    try {
      const module = playwrightModule && path.isAbsolute(playwrightModule) ? pathToFileURL(playwrightModule).href : playwrightModule || 'playwright';
      ({chromium} = await import(module));
    } catch (e) {
      if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
      receipt.status = 'skipped'; receipt.reason = 'Playwright unavailable; supply ARCHIFY_PLAYWRIGHT_MODULE.';
    }
    if (!receipt.status) {
      if (!chromium?.launch) throw new Error('The supplied module does not expose Playwright chromium.');
      chromePath = chromePath || findChrome() || chromium.executablePath();
      if (!chromePath || !fs.existsSync(chromePath)) {
        receipt.status = 'skipped'; receipt.reason = 'Chrome/Chromium unavailable; supply ARCHIFY_CHROME.';
      }
    }
    if (!receipt.status) {
      stage = 'launch';
      browser = await chromium.launch({executablePath: chromePath, headless: true,
        chromiumSandbox: process.env.ARCHIFY_CHROME_NO_SANDBOX !== '1'});
      receipt.browserVersion = browser.version();
      context = await browser.newContext({colorScheme: 'light', reducedMotion: 'reduce', acceptDownloads: true});
      context.on('page', p => {
        p.on('pageerror', e => errors.push(e.message));
        p.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
      });
      fs.mkdirSync(safeOutput('interface-check'), {recursive: true});
      async function ready(p) {
        await p.evaluate(async () => {
          await document.fonts.ready;
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const finite = document.getAnimations().filter(a => Number.isFinite(a.effect?.getComputedTiming().endTime));
          await Promise.all(finite.map(a => a.finished.catch(() => {})));
          await new Promise(r => requestAnimationFrame(r));
        });
      }
      async function capture(p, file, name, scope) {
        const relative = 'interface-check/' + name + '.png';
        await p.screenshot({path: safeOutput(relative), animations: 'disabled'});
        screenshots.push({...bind(relative), artifact: file, artifactSha256: bind(file).sha256, scope});
      }
      async function measure(p, file, viewport, theme, state, desktopDiagram) {
        const value = await p.evaluate(() => {
          const dialog = document.querySelector('#aia-dialog');
          const rect = dialog?.open ? dialog.getBoundingClientRect() : null;
          return {width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
            scrollHeight: document.documentElement.scrollHeight, dialog: rect ? {
              left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
              clientWidth: dialog.clientWidth, scrollWidth: dialog.scrollWidth,
            } : null};
        });
        const d = value.dialog;
        const ok = value.scrollWidth <= value.width &&
          (!desktopDiagram || viewport.width < 700 || state === 'open' || value.scrollHeight <= value.height) &&
          (!d || (d.left >= 0 && d.right <= value.width && d.top >= 0 && d.bottom <= value.height && d.scrollWidth <= d.clientWidth));
        measurements.push({file, viewport, theme, state, ...value, status: ok ? 'pass' : 'fail'});
        test(ok, 'containment ' + file + ' ' + viewport.width + ' ' + theme + ' ' + state, value);
      }
      for (const d of delivered.bases) {
        const file = d.id + '.html';
        const html = fs.readFileSync(path.join(root, file), 'utf8');
        const data = JSON.parse(html.match(/<script type="application\/json" id="aia-data">([\s\S]*?)<\/script>/)[1]);
        const functions = new Map(data.interfaces.map(f => [f.id, f]));
        const p = await context.newPage();
        p.setDefaultTimeout(10000);
        await p.setViewportSize({width: 1440, height: 900});
        await p.goto(pathToFileURL(path.join(root, file)).href); await ready(p);
        for (const n of data.nodes) {
          stage = file + ' node ' + n.id;
          const node = p.locator('svg [data-node-id="' + n.id + '"]');
          await node.click(); await ready(p);
          test(await p.locator('#aia-dialog').evaluate(el => el.open), stage + ' opens');
          test(await p.locator('#aia-node').inputValue() === n.id, stage + ' association');
          const ids = await p.locator('.aia-function').evaluateAll(els => els.map(el => el.dataset.interfaceId));
          test(JSON.stringify(ids) === JSON.stringify(n.interfaces), stage + ' exact interfaces', ids);
          for (const id of n.interfaces) test(await p.locator('[data-interface-id="' + id + '"] pre code').textContent() === functions.get(id).signature, stage + ' signature ' + id);
          await p.locator('#aia-close').click();
          test(await p.evaluate(id => document.activeElement?.dataset.nodeId === id, n.id), stage + ' pointer focus restored');
        }
        stage = file + ' interactions';
        const first = data.nodes[0];
        const firstNode = p.locator('svg [data-node-id="' + first.id + '"]');
        for (const [iteration, key] of ['Enter', 'Space', 'Enter', 'Space'].entries()) {
          const step = stage + ' keyboard ' + key + ' ' + (iteration + 1);
          await firstNode.focus(); await p.keyboard.press(key);
          test(await p.locator('#aia-dialog').evaluate(el => el.open), step + ' opens');
          test(await p.locator('#aia-dialog').evaluate(el => el.contains(document.activeElement)), step + ' dialog focus');
          await p.keyboard.press('Escape');
          test(!await p.locator('#aia-dialog').evaluate(el => el.open), step + ' Escape');
          test(await p.evaluate(id => document.activeElement?.dataset.nodeId === id, first.id), step + ' focus restored');
        }
        await p.locator('#aia-index').click();
        test(await p.locator('.aia-node-card').count() === data.nodes.length, stage + ' index');
        await p.locator('#aia-search').fill('__unmatched_symbol__');
        test(await p.locator('.aia-empty').isVisible(), stage + ' empty search');
        await p.locator('#aia-search').fill(functions.get(first.interfaces[0]).name);
        test(await p.locator('.aia-node-card').count() > 0, stage + ' name search');
        await p.locator('#aia-node').selectOption(first.id);
        await p.locator('#aia-expand').click();
        test(await p.locator('.aia-function[open]').count() === first.interfaces.length, stage + ' expand');
        await p.locator('#aia-collapse').click();
        test(await p.locator('.aia-function[open]').count() === 0, stage + ' collapse');
        await p.locator('#aia-close').click();
        await p.goto(pathToFileURL(path.join(root, file)).href + '#archify-api=' + first.id + '&interface=' + first.interfaces[0]);
        await ready(p);
        test(await p.locator('[data-interface-id="' + first.interfaces[0] + '"]').getAttribute('open') !== null, stage + ' deep link');
        await p.locator('#aia-close').click();
        await firstNode.click({modifiers: ['Shift']}); await ready(p);
        test(!await p.locator('#aia-dialog').evaluate(el => el.open), stage + ' native modified click');
        test((await p.locator('svg[role="img"]').getAttribute('data-focus-active') || '').split(' ').includes(first.id), stage + ' native focus remains functional');
        if (await p.locator('#btn-focus-clear').isVisible()) await p.locator('#btn-focus-clear').click();
        const unmapped = await p.locator('svg [data-node-id]').evaluateAll((els, ids) => els.map(el => el.dataset.nodeId).filter(id => !ids.includes(id)), data.nodes.map(n => n.id));
        if (unmapped.length) {
          await p.locator('svg [data-node-id="' + unmapped[0] + '"]').click();
          test(!await p.locator('#aia-dialog').evaluate(el => el.open), stage + ' unmapped native node');
          test((await p.locator('svg[role="img"]').getAttribute('data-focus-active') || '').split(' ').includes(unmapped[0]), stage + ' unmapped native focus');
        }
        await p.goto(pathToFileURL(path.join(root, file)).href); await ready(p);
        for (const viewport of [{width: 1440, height: 900}, {width: 1600, height: 1000}, {width: 1920, height: 1080}, {width: 2048, height: 1320}, {width: 390, height: 844}]) {
          await p.setViewportSize(viewport);
          for (const theme of [1440, 2048].includes(viewport.width) ? ['light', 'dark'] : ['light']) {
            stage = file + ' layout ' + viewport.width + ' ' + theme;
            if (await p.locator('html').getAttribute('data-theme') !== theme) await p.locator('#btn-theme').click();
            await ready(p);
            await measure(p, file, viewport, theme, 'default', true);
            if ([1440, 2048].includes(viewport.width)) await capture(p, file, d.id + '.' + viewport.width + '.' + theme, {viewport, theme, state: 'default'});
            await p.locator('#aia-index').click(); await p.locator('#aia-node').selectOption(first.id); await p.locator('#aia-expand').click(); await ready(p);
            await measure(p, file, viewport, theme, 'open', true);
            if ([1440, 390].includes(viewport.width)) await capture(p, file, d.id + '.detail.' + viewport.width + '.' + theme, {viewport, theme, state: 'open', node: first.id});
            await p.locator('#aia-close').click();
          }
        }
        stage = file + ' export';
        await p.setViewportSize({width: 1440, height: 900});
        if (await p.locator('html').getAttribute('data-theme') !== 'light') await p.locator('#btn-theme').click();
        await ready(p);
        for (const format of ['svg', 'png']) {
          await p.locator('#btn-export').click();
          const download = p.waitForEvent('download');
          await p.locator('#export-menu [data-format="' + format + '"]').click();
          const name = 'interface-check/' + d.id + '.' + format;
          await (await download).saveAs(safeOutput(name));
          const b = fs.readFileSync(path.join(root, name));
          const clean = format === 'png' ? b.subarray(1, 4).toString() === 'PNG' : await p.evaluate(xml => {
            const doc = new DOMParser().parseFromString(xml, 'image/svg+xml');
            return doc.documentElement.localName === 'svg' && !doc.querySelector('parsererror,script,dialog,button,input,select,#aia-dialog,#aia-index');
          }, b.toString());
          test(clean, stage + ' ' + format);
          exports.push({...bind(name), artifact: file, format});
          if (await p.locator('#export-menu').isVisible()) await p.locator('#btn-export').click();
        }
        await p.close();
      }
      for (const file of ['index.html', 'interfaces.html']) {
        const p = await context.newPage();
        for (const viewport of [{width: 1440, height: 900}, {width: 1600, height: 1000}, {width: 1920, height: 1080}, {width: 2048, height: 1320}, {width: 390, height: 844}]) {
          for (const theme of [1440, 2048].includes(viewport.width) ? ['light', 'dark'] : ['light']) {
            stage = file + ' layout';
            await p.setViewportSize(viewport); await p.emulateMedia({colorScheme: theme});
            await p.goto(pathToFileURL(path.join(root, file)).href); await ready(p);
            await measure(p, file, viewport, theme, 'default', false);
            if ([1440, 2048, 390].includes(viewport.width)) await capture(p, file, file.replace('.html', '') + '.' + viewport.width + '.' + theme, {viewport, theme, state: 'default'});
          }
        }
        await p.setViewportSize({width: 1440, height: 900});
        await p.goto(pathToFileURL(path.join(root, file)).href); await ready(p);
        const links = await p.locator('a[href]').evaluateAll(els => els.map(el => el.href));
        for (const href of links) {
          const url = new URL(href);
          test(url.protocol === 'file:' && fs.existsSync(fileURLToPath(url)), file + ' local link', href);
        }
        if (file === 'interfaces.html') {
          await p.locator('#atlas-search').fill('__unmatched_symbol__');
          test(await p.locator('#atlas-empty').isVisible(), file + ' no matches');
          await p.locator('#atlas-search').fill('');
          await p.locator('#atlas-expand').click();
          test(await p.locator('.aia-function[open]').count() === delivered.coverage.interfaces, file + ' expand');
          await p.locator('#atlas-collapse').click();
          test(await p.locator('.aia-function[open]').count() === 0, file + ' collapse');
          await p.locator('.aia-function > summary').first().click();
          const direct = p.locator('a[href*="#archify-api="]').first();
          await direct.click(); await ready(p);
          test(await p.locator('#aia-dialog').evaluate(el => el.open), 'reference links open node-local details');
        }
        await p.close();
      }
      test(errors.length === 0, 'no page errors', errors);
      test(requests.length === 0, 'no external network requests', requests);
    }
  } catch (error) {
    receipt.error = {stage, message: error.stack || String(error)};
    test(false, 'browser run completed', receipt.error);
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
  }
  receipt.status = checks.some(c => c.status === 'fail') ? 'fail' : receipt.status || 'pass';
  receipt.summary = {checks: checks.length, failed: checks.filter(c => c.status === 'fail').length, measurements: measurements.length, screenshots: screenshots.length, exports: exports.length};
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
  return {exitCode: receipt.status === 'pass' ? 0 : receipt.status === 'skipped' ? 2 : 1, receipt};
}

if (process.argv[1] && path.resolve(process.argv[1]) === script) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node scripts/check-interface-atlas.mjs <atlas-directory>');
    const result = await checkInterfaceAtlas({outputDirectory: process.argv[2]});
    process.stdout.write(JSON.stringify({status: result.receipt.status, ...result.receipt.summary, reason: result.receipt.reason, error: result.receipt.error}) + '\n');
    process.exitCode = result.exitCode;
  } catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
}
