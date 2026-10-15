import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileMDX } from 'next-mdx-remote/rsc';
import { renderToStaticMarkup } from 'react-dom/server';
import { getMdxComponents } from '../components/mdx-components';
import { mdxOptions } from '../lib/mdx';

test('MDX retains numeric literals, single quotes and reordered component attributes', async () => {
  const { content } = await compileMDX({
    source: `<Step title="Plan" number={3}>A useful plan.</Step>\n\n<Step number='4' title="Review">Review together.</Step>\n\n<Grid columns={3}><Panel title="Solo">One player.</Panel></Grid>`,
    components: getMdxComponents('en'), options: { mdxOptions },
  });
  const html = renderToStaticMarkup(content);
  assert.ok(html.includes('article-step"><span>3</span>'));
  assert.ok(html.includes('article-step"><span>4</span>'));
  assert.ok(html.includes('article-grid cols-3'));
});
test('numeric attribute support does not enable JavaScript expressions', async () => {
  const { content } = await compileMDX({
    source: '<Step title="Test" number={1 + 1}>A test.</Step>\n\n{6 * 7}',
    components: getMdxComponents('en'), options: { mdxOptions },
  });
  const html = renderToStaticMarkup(content);
  assert.ok(!html.includes('<span>2</span>'));
  assert.ok(!html.includes('42'));
});
