const playwright = new URL('../node_modules/playwright/index.mjs', import.meta.url).href;
export function resolve(specifier, context, nextResolve) {
  return specifier === 'playwright' ? { url: playwright, shortCircuit: true } : nextResolve(specifier, context);
}
