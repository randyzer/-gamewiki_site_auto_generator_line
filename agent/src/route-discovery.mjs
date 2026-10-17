import { lstat, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { treeFiles } from './files.mjs';
import { publicationRoute } from './route-publication.mjs';

async function filesIfDirectory(path) {
  try { return (await lstat(path)).isDirectory() ? treeFiles(path) : []; }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

function sourceRoute(relativePath, kind) {
  const extension = /\.(?:astro|html|md|mdx|js|jsx|ts|tsx)$/i;
  if (!extension.test(relativePath)) return null;
  let parts = relativePath.replace(extension, '').split('/');
  if (kind === 'app') {
    if (parts.at(-1) === 'route') return { unprovable: relativePath };
    if (parts.at(-1) !== 'page') return null;
    parts = parts.slice(0, -1).filter(part => !/^\(.+\)$/.test(part));
  } else {
    if (parts[0] === 'api' || /^_/.test(parts.at(-1))) return null;
    if (parts.at(-1) === 'index') parts.pop();
  }
  if (parts.some(part => /[\[\]@()]/.test(part)))
    return { unprovable: relativePath };
  return { route: publicationRoute('/' + parts.join('/')) };
}

function renderedRoute(relativePath) {
  if (!relativePath.endsWith('.html')) return null;
  let value = relativePath.replace(/(?:^|\/)index\.html$/, '').replace(/\.html$/, '');
  return publicationRoute('/' + value);
}

export async function discoverProjectRoutes(project) {
  const routes = new Set(), unprovable = [];
  for (const [root, kind] of [['app', 'app'], ['src/app', 'app'], ['pages', 'pages'],
    ['src/pages', 'pages']]) {
    const directory = join(project, root);
    for (const path of await filesIfDirectory(directory)) {
      const found = sourceRoute(relative(directory, path), kind);
      if (found?.route) routes.add(found.route);
      else if (found?.unprovable) unprovable.push(`${root}/${found.unprovable}`);
    }
  }
  for (const root of ['dist', 'out']) {
    const directory = join(project, root);
    for (const path of await filesIfDirectory(directory)) {
      const route = renderedRoute(relative(directory, path));
      if (route) routes.add(route);
    }
  }
  for (const path of ['middleware.js', 'middleware.jsx', 'middleware.ts', 'middleware.tsx',
    'src/middleware.js', 'src/middleware.jsx', 'src/middleware.ts', 'src/middleware.tsx']) {
    try {
      if ((await lstat(join(project, path))).isFile()) unprovable.push(path);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  for (const path of ['next.config.js', 'next.config.mjs', 'next.config.cjs', 'next.config.ts']) {
    try {
      const body = await readFile(join(project, path), 'utf8');
      for (const hook of ['rewrites', 'redirects'])
        if (new RegExp(`\\b${hook}\\b`).test(body)) unprovable.push(`${path}#${hook}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return { routes: [...routes], unprovable: [...new Set(unprovable)].sort() };
}
