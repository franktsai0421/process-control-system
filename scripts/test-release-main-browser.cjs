/* oxlint-disable typescript/no-require-imports -- Reuse the existing CommonJS browser runtime. */
const assert = require('node:assert/strict');

const runtime = require('./browser-test-runtime.cjs');
const { chromium } = require(runtime.playwrightModule);
const base =
  process.env.PROCESS_RELEASE_URL ||
  'https://central-control-staging.franktsai0421.workers.dev';
assert.ok(
  [
    'https://central-control-staging.franktsai0421.workers.dev',
    'https://central-control-production.franktsai0421.workers.dev',
  ].includes(base),
);
const pkg = require('../lib/canonical-data.mjs').readPackage(process.cwd());
const bomRecords = pkg.domains.bom.filter((r) => !r.deletedAt);
const expectedBom = {
  roots: new Set(bomRecords.map((r) => r.rootCode)).size,
  rows: bomRecords.length,
  hs: bomRecords.filter((r) => r.data.itemCode === '407HS004').length,
  dx: bomRecords.filter((r) => r.data.itemCode === '407DX017').length,
};
(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: runtime.browserExecutable ? undefined : 'chrome',
    executablePath: runtime.browserExecutable,
  });
  try {
    for (const width of [1440, 390]) {
      for (const [button, role] of [
        ['admin', 'admin'],
        ['rd', 'rd'],
        ['operator', 'staff'],
      ]) {
        const ctx = await browser.newContext({
          viewport: { width, height: width === 390 ? 844 : 900 },
          hasTouch: width === 390,
          isMobile: width === 390,
        });
        const page = await ctx.newPage();
        const errors = [],
          missing = [];
        let writes = 0;
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('request', (r) => {
          if (
            r.method() === 'POST' &&
            new URL(r.url()).pathname === '/api/shared-state'
          )
            writes++;
        });
        page.on('response', (r) => {
          if (
            r.status() >= 400 &&
            new URL(r.url()).pathname.startsWith('/process/')
          )
            missing.push(new URL(r.url()).pathname);
        });
        await page.goto(base + '/process/', { waitUntil: 'networkidle' });
        await page.waitForFunction(
          () => window.ProcessSync?.demoEnabled === true,
        );
        const b = page.locator(`[data-quick-login=${button}]`);
        if (width === 390) await b.tap();
        else await b.click();
        await page.waitForFunction(
          (role) => currentUser?.id === 'demo-' + role,
          role,
        );
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForFunction(
          (role) => currentUser?.id === 'demo-' + role,
          role,
        );
        const bom = await page.evaluate(() => ({
          roots: Object.values(data.bom).filter((r) => r.length > 0).length,
          rows: Object.values(data.bom).reduce((n, r) => n + r.length, 0),
          hs: Object.values(data.bom)
            .flat()
            .filter((r) => r.itemCode === '407HS004').length,
          dx: Object.values(data.bom)
            .flat()
            .filter((r) => r.itemCode === '407DX017').length,
        }));
        assert.deepEqual(bom, expectedBom);
        console.log(
          'PASS quick login/reload/runtime BOM',
          role,
          width,
          JSON.stringify(bom),
        );
        if (role === 'admin') {
          async function nav(view) {
            if (width === 390 && !(await page.locator('.sidebar.open').count()))
              await page.locator('#menu-toggle').tap();
            await page.locator(`[data-view=${view}]`).click();
            await page.waitForTimeout(250);
          }
          for (const view of [
            'dashboard',
            'player',
            'dispatch',
            'productStatus',
            'approval',
            'editor',
            'data',
          ]) {
            await nav(view);
            assert.equal(
              await page.locator('.nav-item.active').getAttribute('data-view'),
              view,
            );
            console.log('PASS page', view, width);
          }
          await page.locator('[data-tab=bom]').click();
          await page.locator('#bom-query').fill('407HS004');
          await page.waitForTimeout(400);
          assert.ok(
            (await page.locator('#bom-detail').innerText()).includes(
              '407HS004',
            ),
          );
          await page.locator('#bom-query').fill('407DX017');
          await page.waitForTimeout(400);
          assert.ok(
            (await page.locator('#bom-detail').innerText()).includes(
              '407DX017',
            ),
          );
          console.log('PASS new BOM visible', width);
          await page.locator('[data-tab=process-master]').click();
          await page.waitForTimeout(1000);
          const images = page.locator('#data-content img');
          const n = await images.count();
          assert.ok(n > 0, 'process master has images');
          let checked = 0;
          for (let i = 0; i < n; i++) {
            const image = images.nth(i);
            await image.scrollIntoViewIfNeeded();
            await page.waitForTimeout(25);
            await image.evaluate(async (img) => {
              if (!img.complete)
                await new Promise((resolve) => {
                  img.addEventListener('load', resolve, { once: true });
                  img.addEventListener('error', resolve, { once: true });
                });
            });
            const status = await image.evaluate((img) => ({
              src: img.getAttribute('src'),
              width: img.naturalWidth,
            }));
            assert.ok(
              !status.src.includes('canonical-placeholder'),
              'placeholder image',
            );
            assert.ok(status.width > 0, 'decoded image');
            checked++;
          }
          console.log('PASS decoded process master images', width, checked);
        }
        assert.equal(errors.length, 0, errors.join(' | '));
        assert.equal(missing.length, 0, missing.join(','));
        assert.equal(writes, 0, 'browser smoke must not mutate shared state');
        await ctx.close();
      }
    }
    console.log(
      'PASS all desktop/iPhone quick identities, main pages, new BOM and visible images; no mutations or JS/asset errors',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error('FAIL', e.message);
  process.exitCode = 1;
});
