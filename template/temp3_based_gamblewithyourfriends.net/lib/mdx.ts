import remarkGfm from 'remark-gfm';

// Preserve literal numeric props without enabling execution of arbitrary MDX JavaScript.
function numericAttributes() {
  return (tree: unknown) => {
    function visit(value: unknown) {
      if (!value || typeof value !== 'object') return;
      const node = value as Record<string, unknown>;
      if (Array.isArray(node.attributes)) {
        for (const value of node.attributes as unknown[]) {
          if (!value || typeof value !== 'object') continue;
          const attribute = value as { value?: unknown };
          if (!attribute.value || typeof attribute.value !== 'object') continue;
          const expression = attribute.value as { type?: string; value?: unknown };
          if (expression.type === 'mdxJsxAttributeValueExpression' && typeof expression.value === 'string' && /^-?\d+(?:\.\d+)?$/.test(expression.value.trim())) {
            attribute.value = expression.value.trim();
          }
        }
      }
      if (Array.isArray(node.children)) node.children.forEach(visit);
    }
    visit(tree);
  };
}
export const mdxOptions = { remarkPlugins: [remarkGfm, numericAttributes] };
