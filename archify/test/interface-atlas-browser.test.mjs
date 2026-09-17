import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {checkInterfaceAtlas} from '../scripts/check-interface-atlas.mjs';
import {createAtlasFixture} from './helpers/interface-atlas.mjs';

test('missing browser tooling is skipped, but stale artifacts fail before browser launch', async () => {
  const f = createAtlasFixture();
  try {
    f.build();
    const module = path.join(f.root, 'no-playwright.mjs');
    const skipped = await checkInterfaceAtlas({outputDirectory: f.out, playwrightModule: module});
    assert.equal(skipped.exitCode, 2);
    assert.equal(skipped.receipt.status, 'skipped');
    assert.equal(skipped.receipt.visualReview, 'pending');
    fs.appendFileSync(path.join(f.out, 'structure.html'), '\n');
    const failed = await checkInterfaceAtlas({outputDirectory: f.out, playwrightModule: module});
    assert.equal(failed.exitCode, 1);
    assert.equal(failed.receipt.status, 'fail');
    assert.equal(failed.receipt.screenshots.length, 0);
  } finally { f.cleanup(); }
});

test('real browser exercises all diagram types, offline export, and Chinese node UI', {
  skip: process.env.ARCHIFY_PLAYWRIGHT_MODULE && process.env.ARCHIFY_CHROME ? false : 'Set ARCHIFY_PLAYWRIGHT_MODULE and ARCHIFY_CHROME for the browser regression.',
  timeout: 600000,
}, async () => {
  for (const options of [{allTypes: true}, {locale: 'zh-CN'}]) {
    const f = createAtlasFixture(options);
    try {
      f.build();
      const result = await checkInterfaceAtlas({outputDirectory: f.out});
      assert.equal(result.exitCode, 0, JSON.stringify({
        summary: result.receipt.summary,
        failed: result.receipt.checks.filter(check => check.status === 'fail'),
        error: result.receipt.error,
        errors: result.receipt.errors,
        requests: result.receipt.requests,
      }, null, 2));
      assert.equal(result.receipt.errors.length, 0);
      assert.equal(result.receipt.requests.length, 0);
      assert.equal(result.receipt.exports.length, f.catalog.diagrams.length * 2);
      assert.equal(result.receipt.visualReview, 'pending');
    } finally { f.cleanup(); }
  }
});
