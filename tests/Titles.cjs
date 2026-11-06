// Run with: node tests/Titles.cjs (Playwright must be available through NODE_PATH).
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  console.log('Launching browser for title rendering checks...');
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}) });
  try {
    const page = await browser.newPage();
    // Match Typora's soft-break structure: title and body share the first p.
    await page.setContent(`<div id="write">
      <blockquote id="note"><p><span>[!note] 适用条件与单位</span><br><span>功能主线：原动机→传动装置→执行部分。</span></p></blockquote>
      <blockquote id="definition"><p><span>[!definition] 失效</span><br><span>零件丧失规定功能。</span></p></blockquote>
      <blockquote id="plain"><p><span>[!note]</span><br><span>没有自定义标题。</span></p></blockquote>
      <blockquote id="folded"><p><span>[!proof]- 证明过程</span><br><span>证明正文。</span></p></blockquote>
      <blockquote id="safe"><p><span>[!note] &lt;img src=x onerror=alert(1)&gt;</span></p></blockquote>
      <blockquote id="nested"><p><span><span>[!note]</span> <span>适用条件与单位</span></span><span class="md-softbreak">\n</span><span>正文不属于标题。</span></p></blockquote>
      <blockquote id="split"><p><span>[!theorem]</span> 定理的标题<br><span>另一段正文。</span></p></blockquote>
      <blockquote id="newline"><p><span>[!info] 信息标题\n正文文本</span></p></blockquote>
      <blockquote id="pending" class="plugin-callout" callout-type="note"><p><span>待处理的标题</span></p></blockquote>
    </div>`);
    const upstreamStyle = fs.readFileSync(path.join(root, 'tests/fixtures/upstream-callouts.css'), 'utf8')
      .replace(/\$\{[^}]*\}/g, '');
    await page.addStyleTag({content: upstreamStyle});
    await page.addStyleTag({path: path.join(root, 'styles/callouts.css')});
    const sandbox = { BasePlugin: class {}, module: { exports: {} } };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'patches/callouts/index.js'), 'utf8'), sandbox);
    const Plugin = sandbox.module.exports.plugin;
    const instance = new Plugin();
    // Execute actual patch methods in the browser, using its DOM as the utility surface.
    await page.evaluate(({decorate, scan}) => {
      const plugin = {utils: {entities: {querySelectorAllInWrite: q => document.querySelectorAll('#write ' + q)}}};
      const asFunction = source => source.replace(/^(\([^)]*\))\s*=>\s*/, 'function$1 ');
      plugin.decorateTitle = eval('(' + asFunction(decorate) + ')').bind(plugin);
      eval('(' + asFunction(scan) + ')').call(plugin);
    }, {decorate:instance.decorateTitle.toString(),scan:instance.setCallouts.toString()});
    const result = await page.evaluate(() => {
      const note = document.querySelector('#note');
      const header = note.querySelector('span');
      const body = note.querySelector('span:last-child');
      return {
        title: header.getAttribute('data-type'),
        after: getComputedStyle(header,'::after').content,
        titleFontSize: getComputedStyle(header,'::after').fontSize,
        bodyWeight: getComputedStyle(body).fontWeight,
        bodyColor: getComputedStyle(body).color,
        titleColor: getComputedStyle(header,'::after').color,
        customTitle: document.querySelector('#definition span').getAttribute('data-type'),
        fallback: document.querySelector('#plain span').getAttribute('data-type'),
        folded: document.querySelector('#folded').classList.contains('callout-folded'),
        foldedTitle: document.querySelector('#folded span').getAttribute('data-type'),
        nested: document.querySelector('#nested p > span').getAttribute('data-type'),
        split: document.querySelector('#split p > span').getAttribute('data-type'),
        newline: document.querySelector('#newline p > span').getAttribute('data-type'),
        unsafeElements: document.querySelectorAll('#safe img').length,
        raw: header.textContent
      };
    });
    assert.equal(result.title,'适用条件与单位');
    assert.equal(result.after,'"适用条件与单位"');
    assert.ok(parseFloat(result.titleFontSize) > 0, 'Title must have a visible font size, even when its source span is 0px');
    assert.equal(result.bodyWeight,'400');
    assert.notEqual(result.bodyColor,result.titleColor);
    assert.equal(result.customTitle,'失效');
    assert.equal(result.fallback,'note');
    assert.equal(result.folded,true);
    assert.equal(result.foldedTitle,'证明过程');
    assert.equal(result.nested,'适用条件与单位');
    assert.equal(result.split,'');
    assert.match(await page.locator('#split p').innerText(), /定理的标题/);
    assert.equal(result.newline,'信息标题');
    assert.equal(result.unsafeElements,0);
    assert.equal(result.raw,'[!note] 适用条件与单位');
    await page.locator('#note p').evaluate(p=>p.classList.add('md-focus'));
    assert.equal(await page.locator('#note span').first().evaluate(s=>getComputedStyle(s,'::after').content),'none');
    await page.locator('#note p').evaluate(p=>p.classList.remove('md-focus'));
    await fs.promises.mkdir(path.join(root,'.work'),{recursive:true});
    await page.screenshot({path:path.join(root,'.work/titles.png')});
    // Out-of-order loading must leave the raw title visible, never blank.
    await page.locator('#note span').first().evaluate(s=>s.removeAttribute('data-type'));
    assert.notEqual(await page.locator('#note span').first().evaluate(s=>getComputedStyle(s).fontSize),'0px');
    console.log('PASS: custom titles, fallback, folding, normal body style, literal text safety, editing visibility and source preservation');
    console.log(result);
  } finally { await browser.close(); }
})().catch(error=>{ console.error(error); process.exitCode=1; });
