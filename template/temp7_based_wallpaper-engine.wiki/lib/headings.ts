import { createProcessor } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';

type MarkdownNode = {
  type: string;
  value?: string;
  alt?: string;
  depth?: number;
  children?: MarkdownNode[];
  data?: Record<string, unknown>;
};
export type ContentHeading = { title: string; id: string };
function nodeText(node: MarkdownNode): string {
  return node.type === 'image' ? node.alt ?? '' : node.value ?? node.children?.map(nodeText).join('') ?? '';
}
function annotateHeadings(tree: MarkdownNode): ContentHeading[] {
  const used = new Set<string>();
  const headings: ContentHeading[] = [];
  function visit(node: MarkdownNode) {
    if (node.type === 'heading' && node.depth === 2) {
      const title = nodeText(node);
      const base = title.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-') || 'section';
      let id = base;
      let suffix = 0;
      while (used.has(id)) id = `${base}-${++suffix}`;
      used.add(id);
      const properties = node.data?.hProperties;
      node.data = { ...node.data, hProperties: { ...(typeof properties === 'object' && properties ? properties : {}), id } };
      headings.push({ title, id });
    }
    node.children?.forEach(visit);
  }
  visit(tree);
  return headings;
}
export function headingsFromMdx(body: string): ContentHeading[] {
  return annotateHeadings(createProcessor({ remarkPlugins: [remarkGfm] }).parse(body) as MarkdownNode);
}
export function remarkHeadingIds() {
  return (tree: MarkdownNode) => { annotateHeadings(tree); };
}
