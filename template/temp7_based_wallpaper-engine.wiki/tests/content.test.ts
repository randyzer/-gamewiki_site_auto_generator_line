import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { discoverArticles } from '../lib/content.ts';

const mdx = (title='A new guide') => `---\ntitle: ${title}\ndescription: A complete original guide for a new reader.\ncategory: guide\npublishedAt: '2026-10-14'\ncover: /images/install.svg\n---\n\n## First steps\n\nAn independent article body.\n`;
function fixture(fn: (root: string)=>void) {
  const root=mkdtempSync(path.join(tmpdir(),'motion-wiki-'));
  try { mkdirSync(path.join(root,'en/guide'),{recursive:true}); mkdirSync(path.join(root,'zh-CN/guide'),{recursive:true}); fn(root); }
  finally { rmSync(root,{recursive:true,force:true}); }
}

test('new MDX files are discovered without a registry, including nested paths',()=>fixture(root=>{
  writeFileSync(path.join(root,'en/guide/new-topic.mdx'),mdx());
  mkdirSync(path.join(root,'en/guide/deeper'),{recursive:true});
  writeFileSync(path.join(root,'en/guide/deeper/another.mdx'),mdx('Another guide'));
  assert.deepEqual(discoverArticles(root).map(a=>a.slug).sort(),['deeper/another','new-topic']);
}));
test('each translation remains independent; missing translations are not fabricated',()=>fixture(root=>{
  writeFileSync(path.join(root,'en/guide/topic.mdx'),mdx('English title'));
  assert.deepEqual(discoverArticles(root).map(a=>a.locale),['en']);
  writeFileSync(path.join(root,'zh-CN/guide/topic.mdx'),mdx('中文标题'));
  assert.equal(discoverArticles(root).find(a=>a.locale==='zh-CN')?.title,'中文标题');
}));
test('incomplete metadata fails explicitly instead of publishing a broken article',()=>fixture(root=>{
  writeFileSync(path.join(root,'en/guide/broken.mdx'),mdx().replace('title: A new guide\n',''));
  assert.throws(()=>discoverArticles(root),/title/);
}));
test('a metadata category cannot silently disagree with the source path',()=>fixture(root=>{
  writeFileSync(path.join(root,'en/guide/wrong.mdx'),mdx().replace('category: guide','category: buying'));
  assert.throws(()=>discoverArticles(root),/category/);
}));
