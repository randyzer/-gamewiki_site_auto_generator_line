import assert from 'node:assert/strict';
import { test } from 'node:test';
import { discoverArticles, discoverRoutes, articlePath, translationPaths, headingsFromMdx } from '../lib/content.ts';
import { locales, localePath } from '../lib/i18n.ts';
import { getCatalog } from '../lib/previews.ts';

test('real route and translation sets are derived from content and locales',()=>{
  const articles=discoverArticles(); const routes=discoverRoutes(articles);
  for(const locale of locales) {
    assert(routes.some(r=>r.path===localePath(locale)));
    for(const a of articles.filter(a=>a.locale===locale)) {
      assert(routes.some(r=>r.path===articlePath(a)));
      assert(routes.some(r=>r.path===localePath(locale,a.category)));
    }
  }
  assert.equal(new Set(routes.map(r=>r.path)).size,routes.length);
  assert(routes.every(r=>!r.path.startsWith('/en/')));
});
test('previews do not become article routes or translated articles',()=>{
  const routes=discoverRoutes();
  for(const locale of locales) for(const entry of getCatalog(locale).filter(e=>!e.article)) {
    assert(!routes.some(r=>r.path===localePath(locale,`${entry.category}/${entry.slug}`)));
    assert.deepEqual(translationPaths(locale,[entry.category,entry.slug]),{});
  }
});
test('adding an article and its translation expands routes without changing fixed lists',()=>{
  const existing=discoverArticles();
  const article={locale:'en' as const,slug:'a-new-article',category:'guide',title:'A new article',description:'A new guide',publishedAt:'2026-10-14',cover:'/images/install.svg',body:'## Start\nHello',tags:[]};
  const augmented=[...existing,article];
  assert(discoverRoutes(augmented).some(r=>r.path==='/guide/a-new-article/'));
  assert.deepEqual(translationPaths('en',['guide','a-new-article'],augmented),{en:'/guide/a-new-article/'});
  const bilingual=[...augmented,{...article,locale:'zh-CN' as const}];
  assert.equal(translationPaths('en',['guide','a-new-article'],bilingual)['zh-CN'],'/zh-cn/guide/a-new-article/');
});
test('heading anchors are Unicode aware and unique for repeated titles',()=>{
  assert.deepEqual(headingsFromMdx('## 开始设置\n\n## A title?\n\n## A title?'),[{title:'开始设置',id:'开始设置'},{title:'A title?',id:'a-title'},{title:'A title?',id:'a-title-1'}]);
});

test('contents ignore code fences and include real Setext headings',()=>{
  assert.deepEqual(headingsFromMdx('```md\n## Not a heading\n```\n\nReal heading\n------------\n\n## Next **step**'),[{title:'Real heading',id:'real-heading'},{title:'Next step',id:'next-step'}]);
});
test('heading IDs stay unique when a literal suffix collides with an earlier duplicate',()=>{
  const headings=headingsFromMdx('## Setup\n\n## Setup\n\n## Setup-1');
  assert.equal(new Set(headings.map(h=>h.id)).size,headings.length);
});

test('new categories retain the reference order and appear after existing sections',async()=>{
  const {getCategories}=await import('../lib/previews.ts');
  const entries=[{category:'troubleshooting'},{category:'guide'},{category:'troubleshooting'}];
  assert.deepEqual(getCategories(entries),['guide','platforms','wallpapers','safety','buying','troubleshooting']);
});

test('the rendered MDX uses the same AST anchors as its contents',async()=>{
  const {evaluate}=await import('@mdx-js/mdx');
  const runtime=await import('react/jsx-runtime');
  const {renderToStaticMarkup}=await import('react-dom/server');
  const {createElement}=await import('react');
  const {remarkHeadingIds}=await import('../lib/headings.ts');
  const source='```md\n## Sample only\n```\n\nReal heading\n------------\n\n## Setup\n\n## Setup\n\n## Setup-1';
  const {default:Content}=await evaluate(source,{...runtime,remarkPlugins:[remarkHeadingIds]});
  const html=renderToStaticMarkup(createElement(Content));
  for(const heading of headingsFromMdx(source))assert.equal(html.split(`id="${heading.id}"`).length-1,1);
  assert(!html.includes('id="sample-only"'));
});
