import { BROWSER_STAGES, stageName } from './stages.mjs';

// Exact public media identities only; also serialized into the bounded DOM reader.
export function homepageMediaUrl(value) {
  if (typeof value !== 'string' || value.length > 500) return null;
  const watch = /^https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})$/.exec(value);
  if (watch) return { kind: 'WATCH', videoId: watch[1] };
  const embed = /^https:\/\/(?:www\.youtube\.com|www\.youtube-nocookie\.com)\/embed\/([A-Za-z0-9_-]{11})$/.exec(value);
  if (embed) return { kind: 'EMBED', videoId: embed[1] };
  if (/^https:\/\/www\.youtube\.com\/(?:@[A-Za-z0-9_.-]{1,100}|channel\/UC[A-Za-z0-9_-]{22})$/.test(value))
    return { kind: 'CHANNEL' };
  try {
    const url = new URL(value);
    if (url.href === value && url.protocol === 'https:' && !url.username && !url.password && !url.port &&
        !url.search && !url.hash && !/[\\%]/.test(value) && /\.(?:mp4|webm)$/i.test(url.pathname))
      return { kind: 'DIRECT' };
  } catch {}
  return null;
}

// This function also runs in the browser; keep it independent of module state.
export function gameSteamUrl(value, game) {
  if (!game || typeof game.name !== 'string' || !game.name.trim() || game.name.length > 500 ||
    !/^[1-9][0-9]{0,9}$/.test(game.steamAppId ?? '') || typeof value !== 'string') return false;
  // Reject raw encoded separators/dot segments before WHATWG URL normalization.
  if (/[\\%]/.test(value) || /[\\%]/.test(game.steamUrl ?? '')) return false;
  let url, canonical;
  try { url = new URL(value); canonical = new URL(game.steamUrl); } catch { return false; }
  const appPath = '/app/' + game.steamAppId + '/';
  const safe = item => item.protocol === 'https:' && item.hostname === 'store.steampowered.com' &&
    !item.port && !item.username && !item.password && !item.hash;
  // Steam may redirect /app/APP_ID/ to /app/APP_ID/Title_Slug/.
  // Permit only the same exact numeric App ID and at most ONE safe slug
  // segment. This does not authorize accounts, redirects outside /app/,
  // extra subpaths, encoded separators, alternate hosts or other App IDs.
  const stem=pathname=>{
    if(pathname===appPath||pathname===appPath.slice(0,-1))
      return {type:'root'};
    if(!pathname.startsWith(appPath))return null;
    const rest=pathname.slice(appPath.length);
    if(!/^[A-Za-z0-9_-]+\/?$/.test(rest))return null;
    return {type:'slug',value:rest.replace(/\/$/,'')};
  };
  const expected=stem(canonical.pathname),observed=stem(url.pathname);
  if(!safe(url)||!safe(canonical)||canonical.search||!expected||!observed)
    return false;
  return expected.type==='root'||observed.type==='root'||
    expected.value===observed.value;
}

/** Bind a host policy to the current task; game-specific URLs belong in task metadata. */
export function bindBrowserPolicy(policy, inputs) {
  const allowedStages = (policy.allowedStages ?? BROWSER_STAGES).map(stageName);
  if (allowedStages.some(name => !BROWSER_STAGES.includes(name))) throw Error('Browser policy contains an invalid stage');
  if (!inputs) return { ...policy, allowedStages };
  const metadata = inputs.gameMetadata ?? {};
  const name = inputs.gameIdentity;
  if (typeof name !== 'string' || !name.trim()) throw Error('Browser policy requires the current task gameIdentity');
  if (metadata.steamName !== undefined && metadata.steamName !== name) throw Error('Task gameMetadata.steamName must equal gameIdentity');
  if (!metadata.steamAppId) return { ...policy, allowedStages, game: null };
  const game = { name, steamAppId: String(metadata.steamAppId), steamUrl: metadata.steam };
  if (!gameSteamUrl(game.steamUrl, game)) throw Error('Task gameMetadata.steam must be an HTTPS Steam URL matching steamAppId');
  if (policy.game && (policy.game.name !== game.name || policy.game.steamAppId !== game.steamAppId || policy.game.steamUrl !== game.steamUrl))
    throw Error('Browser policy game identity differs from the current task');
  return { ...policy, allowedStages, game,
    allowedPages: [...(policy.allowedPages ?? []), { host: 'store.steampowered.com', pathPrefix: '/app/' + game.steamAppId + '/', queryKeys: ['l'] }] };
}
