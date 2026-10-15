import {readFile, lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {homedir} from 'node:os';

// Chrome's extensions/browser/extension_prefs.cc calls this key
// kPrefAllowFileAccess ("newAllowFileAccess"). Missing means false.
// Never read or print other extension preferences, auth data or settings.
export function inspectBrowserSkillFileAccess(preferences) {
  const settings=preferences?.extensions?.settings;
  if(!settings||typeof settings!=='object'||Array.isArray(settings))
    return {status:'UNVERIFIED',reason:'EXTENSION_SETTINGS_UNAVAILABLE'};
  const candidates=Object.values(settings).filter(value=>
    value&&typeof value==='object'&&value.manifest?.name==='BrowserSkill');
  if(candidates.length!==1)
    return {status:'UNVERIFIED',reason:candidates.length===0?
      'BROWSER_SKILL_EXTENSION_NOT_FOUND':'MULTIPLE_BROWSER_SKILL_EXTENSIONS'};
  const entry=candidates[0];
  const permission=entry.newAllowFileAccess;
  if(permission!==undefined&&typeof permission!=='boolean')
    return {status:'UNVERIFIED',reason:'CHROME_FILE_URL_PERMISSION_INVALID'};
  return {status:permission===true?'ENABLED':'DISABLED',
    reason:permission===true?'CHROME_FILE_URL_ACCESS_GRANTED':'CHROME_FILE_URL_ACCESS_NOT_GRANTED',
    extensionVersion:typeof entry.manifest.version==='string'&&/^[0-9.]{1,32}$/.test(entry.manifest.version)?
      entry.manifest.version:'UNVERIFIED'};
}

export async function checkLocalBrowserSkillFileAccess({
  preferencesPath=join(homedir(),'Library','Application Support','Google','Chrome','Default','Secure Preferences')
}={}) {
  if(process.platform!=='darwin')
    return {status:'UNVERIFIED',reason:'MACOS_ONLY_PREFLIGHT'};
  try{
    const stat=await lstat(preferencesPath);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16*1024*1024)
      return {status:'UNVERIFIED',reason:'CHROME_PREFERENCES_FILE_UNSAFE'};
    const preferences=JSON.parse(await readFile(preferencesPath,'utf8'));
    return inspectBrowserSkillFileAccess(preferences);
  }catch{
    return {status:'UNVERIFIED',reason:'CHROME_PREFERENCES_READ_FAILED'};
  }
}
