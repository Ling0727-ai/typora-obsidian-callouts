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
      <div id="native-note-title" class="md-alert md-alert-note"><p><span>[!note] 适用条件与单位</span><br><span>首次打开文件时的正文。</span></p></div>
      <div id="native-note" class="md-alert md-alert-note"><p><span md-inline="alert_text" class="md-alert-text md-alert-text-note"><span class="md-alert-text-container" data-text="note"></span><span class="md-meta md-after md-content">[!note]</span></span><br><span>原生 NOTE 正文。</span></p></div>
      <div id="warning-math" class="md-alert md-alert-warning"><p><span>[!warning] 映射点</span><span class="md-inline-math"><mjx-container><svg width="16" height="20" viewBox="0 0 16 20"><text y="16" fill="currentColor">D</text></svg></mjx-container></span><span class="title-tail">与实际脉动循环点的区别</span><br><span class="warning-body"><strong><span>已知：</span></strong>正文保持黑色。</span><span class="md-inline-math body-math"><mjx-container><svg width="16" height="20"><text y="16">D</text></svg></mjx-container></span></p></div>
      <blockquote id="warning-softbreak"><p><span>[!warning] 映射点</span><span class="md-inline-math"><mjx-container>D</mjx-container></span><span class="title-tail">与实际脉动循环点的区别</span><span class="md-softbreak">\n</span><span class="warning-body">正文</span><span class="md-softbreak">\n</span><span class="later-body">下一行正文</span></p></blockquote>
    </div>`);
    const upstreamStyle = fs.readFileSync(path.join(root, 'tests/fixtures/upstream-callouts.css'), 'utf8')
      .replace(/\$\{[^}]*\}/g, '');
    await page.addStyleTag({content: upstreamStyle});
    // Include the upstream generated title rule and a theme's math color rule.
    await page.addStyleTag({content: '.plugin-callout > p:first-child span:first-child { color: #777; } #write .md-inline-math svg { color: black; }'});
    await page.addStyleTag({path: path.join(root, 'styles/callouts.css')});
    const sandbox = { BasePlugin: class {}, module: { exports: {} } };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'patches/callouts/index.js'), 'utf8'), sandbox);
    const Plugin = sandbox.module.exports.plugin;
    const instance = new Plugin();
    // Execute actual patch methods in the browser, using its DOM as the utility surface.
    await page.evaluate(({decorate, scan}) => {
      const plugin = {utils: {entities: {querySelectorAllInWrite: q => document.querySelector('#write').querySelectorAll(q)}}};
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
        nativeCustom: document.querySelector('#native-note-title').classList.contains('plugin-callout'),
        nativeCustomTitle: document.querySelector('#native-note-title p > span').getAttribute('data-type'),
        nativeCustomSize: getComputedStyle(document.querySelector('#native-note-title p > span'),'::after').fontSize,
        nativeStandalone: document.querySelector('#native-note').classList.contains('plugin-callout'),
        warningHeader: getComputedStyle(document.querySelector('#warning-math p > span'),'::after').color,
        warningTail: getComputedStyle(document.querySelector('#warning-math .title-tail')).color,
        warningMath: getComputedStyle(document.querySelector('#warning-math .md-inline-math svg')).color,
        warningBody: getComputedStyle(document.querySelector('#warning-math .warning-body')).color,
        warningBodyStrong: getComputedStyle(document.querySelector('#warning-math .warning-body strong span')).color,
        warningBodyMath: getComputedStyle(document.querySelector('#warning-math .body-math svg')).color,
        softbreakTail: getComputedStyle(document.querySelector('#warning-softbreak .title-tail')).color,
        softbreakBody: getComputedStyle(document.querySelector('#warning-softbreak .warning-body')).color,
        softbreakLater: getComputedStyle(document.querySelector('#warning-softbreak .later-body')).color,
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
    assert.equal(result.nativeCustom,true, 'Opening-file div.md-alert must support custom NOTE titles');
    assert.equal(result.nativeCustomTitle,'适用条件与单位');
    assert.ok(parseFloat(result.nativeCustomSize)>0);
    assert.equal(result.nativeStandalone,false, 'A valid native alert must not be decorated twice');
    assert.equal(result.warningHeader,'rgb(170, 58, 44)');
    assert.equal(result.warningTail,result.warningHeader);
    assert.equal(result.warningMath,result.warningHeader);
    assert.equal(result.warningBody,'rgb(0, 0, 0)');
    assert.equal(result.warningBodyStrong,result.warningBody);
    assert.equal(result.warningBodyMath,result.warningBody);
    assert.equal(result.softbreakTail,result.warningHeader);
    assert.equal(result.softbreakBody,result.warningBody);
    assert.equal(result.softbreakLater,result.warningBody);
    assert.equal(result.unsafeElements,0);
    assert.equal(result.raw,'[!note] 适用条件与单位');
    await page.locator('#note p').evaluate(p=>p.classList.add('md-focus'));
    assert.equal(await page.locator('#note span').first().evaluate(s=>getComputedStyle(s,'::after').content),'none');
    await page.locator('#note p').evaluate(p=>p.classList.remove('md-focus'));
    await fs.promises.mkdir(path.join(root,'.work'),{recursive:true});
    await page.screenshot({path:path.join(root,'.work/titles.png')});
    await page.locator('#warning-math').screenshot({path:path.join(root,'.work/warning-colors.png')});
    // Out-of-order loading must leave the raw title visible, never blank.
    await page.locator('#note span').first().evaluate(s=>s.removeAttribute('data-type'));
    assert.notEqual(await page.locator('#note span').first().evaluate(s=>getComputedStyle(s).fontSize),'0px');
    console.log('PASS: custom titles, fallback, folding, normal body style, literal text safety, editing visibility and source preservation');
    console.log(result);

    // Exercise the real class and process() with a file arriving after startup.
    const delayedPage = await browser.newPage();
    await delayedPage.setContent('<div id="write"></div>');
    await delayedPage.evaluate(source => {
      const output = {exports:{}};
      new Function('BasePlugin','module',source)(class {},output);
      const plugin = new output.exports.plugin();
      const listeners = {};
      plugin.utils = {
        entities: {
          querySelectorAllInWrite: q => document.querySelector('#write').querySelectorAll(q),
          querySelectorInWrite: q => document.querySelector('#write').querySelector(q),
        },
        eventHub: {
          eventType: Object.fromEntries(['allPluginsHadInjected','fileEdited','fileOpened','fileContentLoaded'].map(t=>[t,t])),
          on: (type,callback) => { (listeners[type] ||= []).push(callback); },
        },
        exportHelper: {register(){}},
        zip: (left,right) => left.map((value,index)=>[value,right[index]]),
      };
      window.loadPlugin = plugin;
      window.emitLoad = type => (listeners[type] || []).forEach(fn=>fn());
      window.scans = 0;
      const original = plugin.setCallouts;
      plugin.setCallouts = () => { window.scans++; original(); };
      plugin.process();
      window.emitLoad('allPluginsHadInjected');
    },fs.readFileSync(path.join(root,'patches/callouts/index.js'),'utf8'));
    await delayedPage.waitForFunction(()=>window.scans>0);
    await delayedPage.evaluate(()=>{
      // Like Typora: open notification occurs before async content insertion.
      window.emitLoad('fileOpened');
    });
    await delayedPage.waitForFunction(()=>window.scans>1);
    await delayedPage.evaluate(()=>{
      document.querySelector('#write').innerHTML = '<div class="md-alert md-alert-note"><p><span>[!note] 异步加载的标题</span><br><span>首次打开正文。</span></p></div>';
      window.emitLoad('fileContentLoaded');
    });
    await delayedPage.waitForFunction(()=>document.querySelector('.plugin-callout span')?.getAttribute('data-type')==='异步加载的标题');
    assert.equal(await delayedPage.locator('.plugin-callout').count(),1);
    const exported = await delayedPage.evaluate(()=>window.loadPlugin.afterExport(document.querySelector('#write').outerHTML));
    assert.match(exported,/data-type="异步加载的标题"/);
    assert.match(exported,/class="md-alert md-alert-note plugin-callout"/);
    console.log('PASS: NOTE native-container conflict, delayed fileContentLoaded without editing, and native-container HTML export');
  } finally { await browser.close(); }
})().catch(error=>{ console.error(error); process.exitCode=1; });
